import { readSession } from "./auth.mjs";

const baseUrl = "https://api.textbee.dev/api/v1/gateway";
function json(res, status, body) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); }

export function textbeeConfiguration() {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  return { enabled: process.env.TEXTBEE_ENABLED === "true", configured: Boolean(apiKey && deviceId), ready: process.env.TEXTBEE_ENABLED === "true" && Boolean(apiKey && deviceId), deviceHint: deviceId ? `••••${deviceId.slice(-4)}` : "Not configured" };
}

export async function sendSms({ recipient, message }) {
  if (!textbeeConfiguration().ready) return { status: "not_configured" };
  if (!recipient || !message) return { status: "skipped" };
  const response = await fetch(`${baseUrl}/devices/${encodeURIComponent(process.env.TEXTBEE_DEVICE_ID)}/send-sms`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.TEXTBEE_API_KEY }, body: JSON.stringify({ recipients: [recipient], message: String(message).slice(0, 1500) }) });
  if (!response.ok) throw new Error(`Textbee rejected the SMS (${response.status}).`);
  return { status: "sent" };
}

async function readJson(request) { let body = ""; for await (const chunk of request) body += chunk; return body ? JSON.parse(body) : {}; }
export async function handleTextbeeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/textbee")) return false;
  const user = await readSession(req);
  if (!user || user.role !== "admin") return json(res, 403, { error: "Administrator access is required." }), true;
  if (req.method === "GET" && url.pathname === "/api/textbee/integration") return json(res, 200, textbeeConfiguration()), true;
  if (req.method === "POST" && url.pathname === "/api/textbee/test") {
    const body = await readJson(req); const recipient = String(body.recipient || "").trim();
    if (!/^\+[1-9]\d{6,14}$/.test(recipient)) return json(res, 400, { error: "Use an E.164 number, for example +639171234567." }), true;
    await sendSms({ recipient, message: body.message || "Findra SMS automation test. Your Textbee connection is working." });
    return json(res, 200, { ok: true, message: "Textbee accepted the test SMS." }), true;
  }
  return json(res, 404, { error: "Textbee endpoint not found." }), true;
}
