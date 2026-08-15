import {
  hintFor,
  readIntegration,
  requireAdmin,
  setIntegrationEnabled,
  writeIntegration,
} from "./integrations.mjs";

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

async function mapsConfig() {
  const record = await readIntegration("maps");
  return {
    apiKey: record.secrets.apiKey || "",
    enabled: record.enabled,
    connectedAt: record.connectedAt,
    source: record.source,
  };
}

export async function handleMapsRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/maps/")) return false;
  try {
    const config = await mapsConfig();
    if (request.method === "GET" && url.pathname === "/api/maps/integration") {
      if (!await requireAdmin(request, response)) return true;
      return json(response, 200, {
        configured: Boolean(config.apiKey) && config.enabled,
        enabled: config.enabled,
        keyHint: config.apiKey ? hintFor("maps", { apiKey: config.apiKey }) : "",
        provider: "Google Maps Platform",
        source: config.source,
        connectedAt: config.connectedAt,
      }), true;
    }
    if (request.method === "POST" && url.pathname === "/api/maps/integration/connect") {
      if (!await requireAdmin(request, response)) return true;
      const body = await readJson(request);
      const apiKey = String(body.apiKey || config.apiKey || "").trim();
      if (apiKey.length < 20) return json(response, 400, { error: "Enter a Google Maps API key from Google Cloud." }), true;
      await writeIntegration("maps", {
        enabled: body.enabled !== false,
        settings: {},
        secrets: { apiKey },
        mergeSecrets: false,
      });
      const saved = await mapsConfig();
      return json(response, 200, {
        configured: true,
        enabled: saved.enabled,
        keyHint: hintFor("maps", { apiKey: saved.apiKey }),
        provider: "Google Maps Platform",
        source: saved.source,
        connectedAt: saved.connectedAt,
      }), true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/maps/integration") {
      if (!await requireAdmin(request, response)) return true;
      const body = await readJson(request);
      if (typeof body.enabled !== "boolean") return json(response, 400, { error: "An enabled state is required." }), true;
      await setIntegrationEnabled("maps", body.enabled);
      const saved = await mapsConfig();
      return json(response, 200, {
        configured: Boolean(saved.apiKey) && saved.enabled,
        enabled: saved.enabled,
        keyHint: saved.apiKey ? hintFor("maps", { apiKey: saved.apiKey }) : "",
        provider: "Google Maps Platform",
        source: saved.source,
        connectedAt: saved.connectedAt,
      }), true;
    }
    if (request.method === "GET" && url.pathname === "/api/maps/embed-key") {
      return json(response, 200, { key: config.enabled ? config.apiKey || "" : "" }), true;
    }
    return json(response, 404, { error: "Maps endpoint not found." }), true;
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || "The Maps request failed." }), true;
  }
}
