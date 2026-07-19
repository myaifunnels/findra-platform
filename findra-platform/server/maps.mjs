function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export async function handleMapsRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/maps/")) return false;
  const key = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (request.method === "GET" && url.pathname === "/api/maps/integration") {
    return json(response, 200, {
      configured: Boolean(key),
      keyHint: key ? `AIza••••${key.slice(-4)}` : "",
      provider: "Google Maps Platform",
    }), true;
  }
  // Maps Embed keys are browser keys. Limit this key in Google Cloud to the
  // deployed Findra domains and the Maps Embed API only.
  if (request.method === "GET" && url.pathname === "/api/maps/embed-key") {
    return json(response, 200, { key: key || "" }), true;
  }
  return json(response, 404, { error: "Maps endpoint not found." }), true;
}
