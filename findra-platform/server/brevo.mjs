import { readSession } from "./auth.mjs";
import { query } from "./db.mjs";
const BREVO_API = "https://api.brevo.com/v3";
let runtimeApiKey = "";
let runtimeEnabled = null;
let runtimeConnectedAt = "";
let runtimeAccount = null;

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

function activeApiKey() {
  return runtimeApiKey || process.env.BREVO_API_KEY || "";
}

function integrationEnabled() {
  return runtimeEnabled ?? process.env.BREVO_ENABLED !== "false";
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

function integrationStatus() {
  const apiKey = activeApiKey();
  const configured = apiKey.length >= 20;
  return {
    account: accountSummary(runtimeAccount),
    configured,
    connectedAt: runtimeConnectedAt,
    enabled: configured && integrationEnabled(),
    keyHint: configured ? `xkeysib-••••${apiKey.slice(-4)}` : "",
    source: runtimeApiKey
      ? "admin dashboard"
      : configured
        ? "server environment"
        : "not configured",
  };
}

async function brevoRequest(path, apiKey = activeApiKey()) {
  if (!integrationEnabled()) {
    const error = new Error(
      "Brevo is disabled in the Findra integrations dashboard.",
    );
    error.status = 503;
    throw error;
  }
  if (!apiKey || apiKey.length < 20) {
    const error = new Error(
      "Brevo is not configured. Add BREVO_API_KEY to the server environment.",
    );
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${BREVO_API}${path}`, {
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.message || payload.code || "Brevo could not verify this API key.",
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function connectIntegration(request, response) {
  const body = await readJson(request);
  const apiKey = String(body.apiKey || "").trim();
  if (!/^xkeysib-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
    return json(response, 400, {
      error: "Enter a valid Brevo API key beginning with xkeysib-.",
    });
  }
  const previousEnabled = runtimeEnabled;
  runtimeEnabled = true;
  try {
    const account = await brevoRequest("/account", apiKey);
    runtimeApiKey = apiKey;
    runtimeAccount = account;
    runtimeEnabled = body.enabled !== false;
    runtimeConnectedAt = new Date().toISOString();
    return json(response, 200, integrationStatus());
  } catch (error) {
    runtimeEnabled = previousEnabled;
    throw error;
  }
}

async function updateIntegration(request, response) {
  const body = await readJson(request);
  if (typeof body.enabled !== "boolean")
    return json(response, 400, { error: "An enabled state is required." });
  if (body.enabled && activeApiKey().length < 20)
    return json(response, 409, {
      error:
        "Connect and verify a Brevo API key before enabling the integration.",
    });
  runtimeEnabled = body.enabled;
  return json(response, 200, integrationStatus());
}

async function sendTestEmail(request, response) {
  const user = await readSession(request);
  if (!user || user.role !== "admin") return json(response, 403, { error: "Administrator access is required." });
  const body = await readJson(request);
  const recipient = String(body.email || user.email || "").trim().toLowerCase();
  if (!recipient.includes("@")) return json(response, 400, { error: "Enter a valid recipient email." });
  const apiKey = activeApiKey();
  const sender = process.env.BREVO_FROM_EMAIL || "";
  if (!integrationEnabled() || !apiKey || !sender) return json(response, 503, { error: "Brevo needs BREVO_ENABLED, BREVO_API_KEY, and BREVO_FROM_EMAIL configured on Render." });
  const result = await fetch(`${BREVO_API}/smtp/email`, { method: "POST", headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ sender: { email: sender, name: process.env.BREVO_FROM_NAME || "Findra PH" }, to: [{ email: recipient }], subject: "Findra PH email test", textContent: "This confirms that Findra PH can send transactional email through Brevo." }) });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) return json(response, result.status, { error: payload.message || payload.code || "Brevo rejected the test email." });
  return json(response, 200, { ok: true, messageId: payload.messageId || "queued" });
}

async function subscribeNewsletter(request, response) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: "Enter a valid email address." });
  const apiKey = activeApiKey();
  if (!integrationEnabled() || !apiKey) return json(response, 503, { error: "Newsletter signup is temporarily unavailable. Please try again shortly." });
  const listId = Number(process.env.BREVO_NEWSLETTER_LIST_ID || 0);
  const result = await fetch(`${BREVO_API}/contacts`, { method: "POST", headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, updateEnabled: true, ...(listId > 0 ? { listIds: [listId] } : {}) }) });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) return json(response, result.status, { error: payload.message || "We could not add that email right now." });
  await query(`INSERT INTO newsletter_subscribers (email, source, brevo_status) VALUES ($1,$2,'subscribed') ON CONFLICT (email) DO UPDATE SET brevo_status='subscribed', updated_at=NOW()`, [email, String(body.source || "about-page").slice(0, 80)]);
  return json(response, 201, { ok: true, message: "You’re subscribed. Watch your inbox for Findra updates." });
}

export async function handleBrevoRequest(request, response) {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  if (!url.pathname.startsWith("/api/brevo/") && url.pathname !== "/api/newsletter/subscribe") return false;
  try {
    if (request.method === "POST" && url.pathname === "/api/newsletter/subscribe") { await subscribeNewsletter(request, response); return true; }
    if (request.method === "GET" && url.pathname === "/api/brevo/integration") {
      json(response, 200, integrationStatus());
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/brevo/integration/connect"
    ) {
      await connectIntegration(request, response);
      return true;
    }
    if (
      request.method === "PATCH" &&
      url.pathname === "/api/brevo/integration"
    ) {
      await updateIntegration(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/brevo/test-email") {
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
