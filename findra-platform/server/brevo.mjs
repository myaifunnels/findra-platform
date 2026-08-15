import { query } from "./db.mjs";
import {
  hintFor,
  readIntegration,
  requireAdmin,
  setIntegrationEnabled,
  writeIntegration,
} from "./integrations.mjs";

const BREVO_API = "https://api.brevo.com/v3";

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large.");
  }
  return body ? JSON.parse(body) : {};
}

export async function brevoConfig() {
  const record = await readIntegration("brevo");
  return {
    apiKey: record.secrets.apiKey || "",
    enabled: record.enabled,
    fromEmail: record.settings.fromEmail || "",
    fromName: record.settings.fromName || "Findra PH",
    newsletterListId: record.settings.newsletterListId || "",
    connectedAt: record.connectedAt,
    source: record.source,
  };
}

function accountSummary(account) {
  if (!account) return null;
  const plan =
    account.plan?.find((item) => item.type && item.type !== "sms")?.type ||
    account.planVerticals?.find((item) => item.status === "active")?.name ||
    "Connected";
  return {
    company: account.companyName || "Brevo account",
    email: account.email || "",
    plan,
  };
}

async function integrationStatus(account) {
  const config = await brevoConfig();
  const configured = config.apiKey.length >= 20;
  return {
    account: accountSummary(account) || (configured ? { company: "Brevo account", email: config.fromEmail, plan: "Connected" } : null),
    configured,
    connectedAt: config.connectedAt,
    enabled: configured && config.enabled,
    keyHint: configured ? hintFor("brevo", { apiKey: config.apiKey }) : "",
    source: config.source,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    newsletterListId: config.newsletterListId,
  };
}

async function brevoRequest(path, apiKey, { skipEnabled = false } = {}) {
  const config = await brevoConfig();
  if (!skipEnabled && !config.enabled) {
    const error = new Error("Brevo is disabled in the Findra integrations dashboard.");
    error.status = 503;
    throw error;
  }
  const key = apiKey || config.apiKey;
  if (!key || key.length < 20) {
    const error = new Error("Brevo is not configured. Add an API key in Admin → Integrations.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${BREVO_API}${path}`, {
    headers: { Accept: "application/json", "api-key": key },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.code || "Brevo could not verify this API key.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function connectIntegration(request, response) {
  const body = await readJson(request);
  const apiKey = String(body.apiKey || "").trim();
  const current = await brevoConfig();
  const nextKey = apiKey || current.apiKey;
  if (!/^xkeysib-[A-Za-z0-9_-]{20,}$/.test(nextKey)) {
    return json(response, 400, {
      error: "Enter a valid Brevo API key beginning with xkeysib-.",
    });
  }
  const fromEmail = String(body.fromEmail || current.fromEmail || "").trim().toLowerCase();
  const fromName = String(body.fromName || current.fromName || "Findra PH").trim().slice(0, 80);
  const newsletterListId = String(body.newsletterListId || current.newsletterListId || "").trim();
  if (fromEmail && !fromEmail.includes("@")) {
    return json(response, 400, { error: "Enter a valid sender email address." });
  }
  const account = await brevoRequest("/account", nextKey, { skipEnabled: true });
  await writeIntegration("brevo", {
    enabled: body.enabled !== false,
    settings: { fromEmail, fromName, newsletterListId },
    secrets: { apiKey: nextKey },
    mergeSecrets: false,
  });
  return json(response, 200, await integrationStatus(account));
}

async function updateIntegration(request, response) {
  const body = await readJson(request);
  if (typeof body.enabled !== "boolean")
    return json(response, 400, { error: "An enabled state is required." });
  const config = await brevoConfig();
  if (body.enabled && config.apiKey.length < 20)
    return json(response, 409, {
      error: "Connect and verify a Brevo API key before enabling the integration.",
    });
  await setIntegrationEnabled("brevo", body.enabled);
  return json(response, 200, await integrationStatus());
}

async function sendTestEmail(request, response) {
  const body = await readJson(request);
  const config = await brevoConfig();
  const recipient = String(body.email || "").trim().toLowerCase();
  if (!recipient.includes("@")) return json(response, 400, { error: "Enter a valid recipient email." });
  if (!config.enabled || !config.apiKey || !config.fromEmail)
    return json(response, 503, { error: "Add a Brevo API key and sender email in Admin → Integrations, then enable the connection." });
  const result = await fetch(`${BREVO_API}/smtp/email`, {
    method: "POST",
    headers: { "api-key": config.apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: config.fromEmail, name: config.fromName || "Findra PH" },
      to: [{ email: recipient }],
      subject: "Findra PH email test",
      textContent: "This confirms that Findra PH can send transactional email through Brevo.",
    }),
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) return json(response, result.status, { error: payload.message || payload.code || "Brevo rejected the test email." });
  return json(response, 200, { ok: true, messageId: payload.messageId || "queued", recipient });
}

async function subscribeNewsletter(request, response) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: "Enter a valid email address." });
  const config = await brevoConfig();
  if (!config.enabled || !config.apiKey) return json(response, 503, { error: "Newsletter signup is temporarily unavailable. Please try again shortly." });
  const listId = Number(config.newsletterListId || 0);
  const result = await fetch(`${BREVO_API}/contacts`, {
    method: "POST",
    headers: { "api-key": config.apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, updateEnabled: true, ...(listId > 0 ? { listIds: [listId] } : {}) }),
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) return json(response, result.status, { error: payload.message || "We could not add that email right now." });
  await query(`INSERT INTO newsletter_subscribers (email, source, brevo_status) VALUES ($1,$2,'subscribed') ON CONFLICT (email) DO UPDATE SET brevo_status='subscribed', updated_at=NOW()`, [email, String(body.source || "about-page").slice(0, 80)]);
  return json(response, 201, { ok: true, message: "You’re subscribed. Watch your inbox for Findra updates." });
}

export async function handleBrevoRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/brevo/") && url.pathname !== "/api/newsletter/subscribe") return false;
  try {
    if (request.method === "POST" && url.pathname === "/api/newsletter/subscribe") {
      await subscribeNewsletter(request, response);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/brevo/integration") {
      if (!await requireAdmin(request, response)) return true;
      json(response, 200, await integrationStatus());
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/brevo/integration/connect") {
      if (!await requireAdmin(request, response)) return true;
      await connectIntegration(request, response);
      return true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/brevo/integration") {
      if (!await requireAdmin(request, response)) return true;
      await updateIntegration(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/brevo/test-email") {
      if (!await requireAdmin(request, response)) return true;
      await sendTestEmail(request, response);
      return true;
    }
    json(response, 404, { error: "Brevo endpoint not found." });
  } catch (error) {
    json(response, error.status || 500, {
      error: error.message || "The Brevo request failed.",
    });
  }
  return true;
}
