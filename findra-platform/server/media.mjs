import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { readSession } from "./auth.mjs";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const fileTypes = new Set([...imageTypes, "application/pdf"]);

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function configured() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].every((key) => process.env[key]);
}

function client() {
  if (!configured()) {
    const error = new Error("Media storage is not configured yet.");
    error.status = 503;
    throw error;
  }
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
}

function safeName(value = "file") {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "file";
}

async function readBuffer(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      const error = new Error("Each file must be 12 MB or smaller.");
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
  const contentType = String(request.headers["content-type"] || "").split(";")[0].toLowerCase();
  if (!fileTypes.has(contentType)) return json(response, 415, { error: "Only JPG, PNG, WebP, GIF, and PDF files are supported." });
  const buffer = await readBuffer(request);
  if (!buffer.length) return json(response, 400, { error: "Choose a file to upload." });
  const filename = safeName(decodeURIComponent(String(request.headers["x-file-name"] || "file")));
  const key = `listings/${user.id}/${randomUUID()}-${filename}`;
  await client().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType }));
  return json(response, 201, { key, url: `/api/media/${encodeURIComponent(key)}`, name: filename, type: contentType });
}

async function download(request, response, key) {
  const result = await client().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  response.statusCode = 200;
  response.setHeader("Content-Type", result.ContentType || "application/octet-stream");
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (result.ContentLength) response.setHeader("Content-Length", result.ContentLength);
  result.Body.pipe(response);
}

export async function handleMediaRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/media")) return false;
  try {
    if (request.method === "POST" && url.pathname === "/api/media/upload") return await upload(request, response), true;
    const match = url.pathname.match(/^\/api\/media\/(.+)$/);
    if (request.method === "GET" && match) return await download(request, response, decodeURIComponent(match[1])), true;
    return json(response, 404, { error: "Media endpoint not found." }), true;
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || "Media request failed." }), true;
  }
}
