import {
  hintFor,
  readIntegration,
  requireAdmin,
  setIntegrationEnabled,
  writeIntegration,
} from "./integrations.mjs";

const baseUrl = "https://api.textbee.dev/api/v1/gateway";
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function textbeeRecord() {
  return readIntegration("textbee");
}

export async function textbeeConfiguration() {
  const record = await textbeeRecord();
  const apiKey = record.secrets.apiKey || "";
  const deviceId = record.secrets.deviceId || "";
  const configured = Boolean(apiKey && deviceId);
  return {
    enabled: record.enabled,
    configured,
    ready: record.enabled && configured,
    deviceHint: configured ? hintFor("textbee", { deviceId }) : "Not configured",
    source: record.source,
    connectedAt: record.connectedAt,
  };
}

export async function sendSms({ recipient, message }) {
  const record = await textbeeRecord();
  const apiKey = record.secrets.apiKey || "";
  const deviceId = record.secrets.deviceId || "";
  if (!record.enabled || !apiKey || !deviceId) return { status: "not_configured" };
  if (!recipient || !message) return { status: "skipped" };
  const response = await fetch(`${baseUrl}/devices/${encodeURIComponent(deviceId)}/send-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ recipients: [recipient], message: String(message).slice(0, 1500) }),
  });
  if (!response.ok) throw new Error(`Textbee rejected the SMS (${response.status}).`);
  return { status: "sent" };
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

export async function handleTextbeeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/textbee")) return false;
  if (!await requireAdmin(req, res)) return true;
  try {
    if (req.method === "GET" && url.pathname === "/api/textbee/integration") {
      return json(res, 200, await textbeeConfiguration()), true;
    }
    if (req.method === "POST" && url.pathname === "/api/textbee/integration/connect") {
      const body = await readJson(req);
      const current = await textbeeRecord();
      const apiKey = String(body.apiKey || current.secrets.apiKey || "").trim();
      const deviceId = String(body.deviceId || current.secrets.deviceId || "").trim();
      if (!apiKey || !deviceId) return json(res, 400, { error: "Enter a TextBee API key and device ID." }), true;
      await writeIntegration("textbee", {
        enabled: body.enabled !== false,
        settings: {},
        secrets: { apiKey, deviceId },
        mergeSecrets: false,
      });
      return json(res, 200, await textbeeConfiguration()), true;
    }
    if (req.method === "PATCH" && url.pathname === "/api/textbee/integration") {
      const body = await readJson(req);
      if (typeof body.enabled !== "boolean") return json(res, 400, { error: "An enabled state is required." }), true;
      await setIntegrationEnabled("textbee", body.enabled);
      return json(res, 200, await textbeeConfiguration()), true;
    }
    if (req.method === "POST" && url.pathname === "/api/textbee/test") {
      const body = await readJson(req);
      const recipient = String(body.recipient || "").trim();
      if (!/^\+[1-9]\d{6,14}$/.test(recipient)) return json(res, 400, { error: "Use an E.164 number, for example +639171234567." }), true;
      await sendSms({ recipient, message: body.message || "Findra SMS automation test. Your Textbee connection is working." });
      return json(res, 200, { ok: true, message: "Textbee accepted the test SMS." }), true;
    }
    return json(res, 404, { error: "Textbee endpoint not found." }), true;
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "The TextBee request failed." }), true;
  }
}
