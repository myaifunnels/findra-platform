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

export async function handleBrevoRequest(request, response) {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  if (!url.pathname.startsWith("/api/brevo/")) return false;
  try {
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
    json(response, 404, { error: "Brevo endpoint not found." });
  } catch (error) {
    json(response, error.status || 500, {
      error: error.message || "The Brevo request failed.",
    });
  }
  return true;
}
