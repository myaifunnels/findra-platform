import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { readSession } from "./auth.mjs";
import {
  hintFor,
  readIntegration,
  requireAdmin,
  setIntegrationEnabled,
  writeIntegration,
} from "./integrations.mjs";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/webm"]);
const fileTypes = new Set([...imageTypes, "application/pdf", ...videoTypes]);

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function r2Config() {
  const record = await readIntegration("r2");
  const accountId = record.secrets.accountId || "";
  return {
    accountId,
    accessKeyId: record.secrets.accessKeyId || "",
    secretAccessKey: record.secrets.secretAccessKey || "",
    bucketName: record.settings.bucketName || "",
    endpoint: record.settings.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ""),
    enabled: record.enabled,
    connectedAt: record.connectedAt,
    source: record.source,
  };
}

function r2CredentialsReady(config) {
  return Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName);
}

function r2Ready(config) {
  return Boolean(config.enabled && r2CredentialsReady(config));
}

function r2Client(config) {
  if (!r2CredentialsReady(config)) {
    const error = new Error("Cloudflare R2 is not configured. Add storage credentials in Admin → Integrations.");
    error.status = 503;
    throw error;
  }
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function integrationStatus(config) {
  const configured = Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName);
  return {
    configured: configured && config.enabled,
    enabled: config.enabled,
    bucketName: config.bucketName || "",
    endpoint: config.endpoint || "",
    accountHint: config.accountId ? `${config.accountId.slice(0, 4)}••••${config.accountId.slice(-4)}` : "",
    keyHint: config.accessKeyId ? hintFor("r2", { accessKeyId: config.accessKeyId }) : "",
    source: config.source,
    connectedAt: config.connectedAt,
  };
}

async function verifyBucket(config) {
  await r2Client(config).send(new HeadBucketCommand({ Bucket: config.bucketName }));
}

function safeName(value = "file") {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "file";
}

async function readBuffer(request, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error(`Each file must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`);
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function upload(request, response) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "Please sign in before uploading media." });
  const config = await r2Config();
  if (!config.enabled) {
    const error = new Error("Cloudflare R2 is disabled in the Findra integrations dashboard.");
    error.status = 503;
    throw error;
  }
  const contentType = String(request.headers["content-type"] || "").split(";")[0].toLowerCase();
  if (!fileTypes.has(contentType)) return json(response, 415, { error: "Only JPG, PNG, WebP, GIF, PDF, MP4, and WebM files are supported." });
  const maxBytes = videoTypes.has(contentType) ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  const buffer = await readBuffer(request, maxBytes);
  if (!buffer.length) return json(response, 400, { error: "Choose a file to upload." });
  const filename = safeName(decodeURIComponent(String(request.headers["x-file-name"] || "file")));
  const key = `listings/${user.id}/${randomUUID()}-${filename}`;
  await r2Client(config).send(new PutObjectCommand({ Bucket: config.bucketName, Key: key, Body: buffer, ContentType: contentType }));
  return json(response, 201, { key, url: `/api/media/${encodeURIComponent(key)}`, name: filename, type: contentType });
}

async function download(request, response, key) {
  const config = await r2Config();
  if (!r2CredentialsReady(config)) {
    const error = new Error("Cloudflare R2 is not configured. Add storage credentials in Admin → Integrations.");
    error.status = 503;
    throw error;
  }
  const result = await r2Client(config).send(new GetObjectCommand({ Bucket: config.bucketName, Key: key }));
  response.statusCode = 200;
  response.setHeader("Content-Type", result.ContentType || "application/octet-stream");
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (result.ContentLength) response.setHeader("Content-Length", result.ContentLength);
  result.Body.pipe(response);
}

export async function handleMediaRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/media") && !url.pathname.startsWith("/api/r2/")) return false;
  try {
    if (request.method === "GET" && url.pathname === "/api/r2/integration") {
      if (!await requireAdmin(request, response)) return true;
      return json(response, 200, integrationStatus(await r2Config())), true;
    }
    if (request.method === "POST" && url.pathname === "/api/r2/integration/connect") {
      if (!await requireAdmin(request, response)) return true;
      const body = await readJson(request);
      const current = await r2Config();
      const next = {
        accountId: String(body.accountId || current.accountId || "").trim(),
        accessKeyId: String(body.accessKeyId || current.accessKeyId || "").trim(),
        secretAccessKey: String(body.secretAccessKey || current.secretAccessKey || "").trim(),
        bucketName: String(body.bucketName || current.bucketName || "").trim(),
        endpoint: String(body.endpoint || current.endpoint || "").trim(),
        enabled: body.enabled !== false,
      };
      if (!next.accountId || !next.accessKeyId || !next.secretAccessKey || !next.bucketName) {
        return json(response, 400, { error: "Account ID, access key, secret key, and bucket name are required." }), true;
      }
      if (!next.endpoint) next.endpoint = `https://${next.accountId}.r2.cloudflarestorage.com`;
      await verifyBucket(next);
      await writeIntegration("r2", {
        enabled: next.enabled,
        settings: { bucketName: next.bucketName, endpoint: next.endpoint },
        secrets: {
          accountId: next.accountId,
          accessKeyId: next.accessKeyId,
          secretAccessKey: next.secretAccessKey,
        },
        mergeSecrets: false,
      });
      return json(response, 200, integrationStatus(await r2Config())), true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/r2/integration") {
      if (!await requireAdmin(request, response)) return true;
      const body = await readJson(request);
      if (typeof body.enabled !== "boolean") return json(response, 400, { error: "An enabled state is required." }), true;
      await setIntegrationEnabled("r2", body.enabled);
      return json(response, 200, integrationStatus(await r2Config())), true;
    }
    if (request.method === "POST" && url.pathname === "/api/media/upload") return await upload(request, response), true;
    const match = url.pathname.match(/^\/api\/media\/(.+)$/);
    if (request.method === "GET" && match) return await download(request, response, decodeURIComponent(match[1])), true;
    return json(response, 404, { error: "Media endpoint not found." }), true;
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || "Media request failed." }), true;
  }
}
