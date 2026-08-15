import { databaseConfigured, query } from "./db.mjs";
import { decryptText, encryptText } from "./crypto.mjs";

const cache = new Map();
let tableReady = false;

async function ensureTable() {
  if (tableReady || !databaseConfigured()) return;
  await query(`
    CREATE TABLE IF NOT EXISTS integration_settings (
      provider TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      secrets_enc TEXT,
      connected_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

function envSecrets(provider) {
  if (provider === "paymongo") {
    return {
      testSecretKey: process.env.PAYMONGO_TEST_SECRET_KEY || (String(process.env.PAYMONGO_SECRET_KEY || "").startsWith("sk_test_") ? process.env.PAYMONGO_SECRET_KEY : ""),
      liveSecretKey: process.env.PAYMONGO_LIVE_SECRET_KEY || (String(process.env.PAYMONGO_SECRET_KEY || "").startsWith("sk_live_") ? process.env.PAYMONGO_SECRET_KEY : ""),
    };
  }
  if (provider === "brevo") {
    return { apiKey: process.env.BREVO_API_KEY || "" };
  }
  if (provider === "maps") {
    return { apiKey: process.env.GOOGLE_MAPS_API_KEY || "" };
  }
  if (provider === "r2") {
    return {
      accountId: process.env.R2_ACCOUNT_ID || "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    };
  }
  if (provider === "textbee") {
    return {
      apiKey: process.env.TEXTBEE_API_KEY || "",
      deviceId: process.env.TEXTBEE_DEVICE_ID || "",
    };
  }
  return {};
}

function envSettings(provider) {
  if (provider === "paymongo") {
    return {
      mode: String(process.env.PAYMONGO_MODE || "test").toLowerCase() === "live" ? "live" : "test",
      appUrl: process.env.PAYMONGO_APP_URL || "",
    };
  }
  if (provider === "brevo") {
    return {
      fromEmail: process.env.BREVO_FROM_EMAIL || "",
      fromName: process.env.BREVO_FROM_NAME || "Findra PH",
      newsletterListId: process.env.BREVO_NEWSLETTER_LIST_ID || "",
    };
  }
  if (provider === "r2") {
    return {
      bucketName: process.env.R2_BUCKET_NAME || "",
      endpoint: process.env.R2_ENDPOINT || "",
    };
  }
  return {};
}

function envEnabled(provider) {
  if (provider === "paymongo") return process.env.PAYMONGO_ENABLED !== "false";
  if (provider === "brevo") return process.env.BREVO_ENABLED !== "false";
  if (provider === "textbee") return process.env.TEXTBEE_ENABLED === "true";
  return true;
}

function parseSecrets(encoded) {
  if (!encoded) return {};
  try {
    const parsed = JSON.parse(decryptText(encoded));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function maskSecret(value, prefix = "") {
  const secret = String(value || "");
  if (secret.length < 8) return secret ? "••••" : "";
  const lead = prefix || secret.slice(0, Math.min(8, secret.indexOf("_") + 1) || 4);
  return `${lead}••••${secret.slice(-4)}`;
}

export function hintFor(provider, secrets = {}) {
  if (provider === "paymongo") {
    const mode = secrets.mode || "test";
    const key = mode === "live" ? secrets.liveSecretKey : secrets.testSecretKey;
    return maskSecret(key, key?.startsWith("sk_live_") ? "sk_live_" : key?.startsWith("sk_test_") ? "sk_test_" : "sk_");
  }
  if (provider === "brevo") return secrets.apiKey ? `xkeysib-••••${String(secrets.apiKey).slice(-4)}` : "";
  if (provider === "maps") return secrets.apiKey ? `AIza••••${String(secrets.apiKey).slice(-4)}` : "";
  if (provider === "r2") return secrets.accessKeyId ? `${String(secrets.accessKeyId).slice(0, 4)}••••${String(secrets.accessKeyId).slice(-4)}` : "";
  if (provider === "textbee") return secrets.deviceId ? `••••${String(secrets.deviceId).slice(-4)}` : "";
  return "";
}

function fallbackRecord(provider) {
  const secrets = envSecrets(provider);
  const settings = envSettings(provider);
  return {
    provider,
    enabled: envEnabled(provider),
    settings,
    secrets,
    connectedAt: "",
    source: Object.values(secrets).some(Boolean) ? "server environment" : "not configured",
  };
}

export async function readIntegration(provider) {
  if (cache.has(provider)) return cache.get(provider);
  let record = fallbackRecord(provider);
  if (databaseConfigured()) {
    try {
      await ensureTable();
      const result = await query(
        "SELECT provider, enabled, settings, secrets_enc, connected_at FROM integration_settings WHERE provider = $1",
        [provider],
      );
      const row = result.rows[0];
      if (row) {
        record = {
          provider,
          enabled: row.enabled,
          settings: row.settings && typeof row.settings === "object" ? row.settings : {},
          secrets: parseSecrets(row.secrets_enc),
          connectedAt: row.connected_at ? new Date(row.connected_at).toISOString() : "",
          source: "admin dashboard",
        };
      }
    } catch {
      // Table may not exist until migrate runs; keep environment fallback.
    }
  }
  cache.set(provider, record);
  return record;
}

export async function writeIntegration(provider, { enabled, settings = {}, secrets = {}, mergeSecrets = true }) {
  const current = await readIntegration(provider);
  const nextSecrets = mergeSecrets ? { ...current.secrets, ...secrets } : { ...secrets };
  Object.keys(nextSecrets).forEach((key) => {
    if (nextSecrets[key] == null || nextSecrets[key] === "") delete nextSecrets[key];
  });
  const nextSettings = { ...current.settings, ...settings };
  const nextEnabled = typeof enabled === "boolean" ? enabled : current.enabled;
  const encoded = encryptText(JSON.stringify(nextSecrets));
  const connectedAt = Object.values(nextSecrets).some(Boolean) ? new Date() : null;
  await query(
    `INSERT INTO integration_settings (provider, enabled, settings, secrets_enc, connected_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
     ON CONFLICT (provider) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       settings = EXCLUDED.settings,
       secrets_enc = EXCLUDED.secrets_enc,
       connected_at = EXCLUDED.connected_at,
       updated_at = NOW()`,
    [provider, nextEnabled, JSON.stringify(nextSettings), encoded, connectedAt],
  );
  cache.delete(provider);
  return readIntegration(provider);
}

export async function setIntegrationEnabled(provider, enabled) {
  const current = await readIntegration(provider);
  return writeIntegration(provider, {
    enabled,
    settings: current.settings,
    secrets: current.secrets,
    mergeSecrets: false,
  });
}

export function publicAppUrl(request, appUrl = "") {
  const configured = String(appUrl || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const forwardedProto = request?.headers?.["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = request?.headers?.host;
  if (host) return `${protocol}://${host}`;
  return "https://findra.ph";
}

export async function requireAdmin(request, response) {
  const { readSession } = await import("./auth.mjs");
  const user = await readSession(request);
  if (user?.role === "admin") return true;
  response.statusCode = 403;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify({ error: "Administrator access is required." }));
  return false;
}
