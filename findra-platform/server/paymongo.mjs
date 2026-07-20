import { activePackage, activePackageById } from "./packages.mjs";
import { query } from "./db.mjs";
import { notify } from "./notifications.mjs";
import { readSession } from "./auth.mjs";
const PAYMONGO_API = "https://api.paymongo.com/v1";
const ALLOWED_METHODS = new Set(["card", "gcash", "grab_pay", "paymaya"]);
let runtimeEnabled = null;
let runtimeConnectedAt = "";
let runtimePaymentMethods = [];

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

function activeSecretKey() {
  const mode = configuredMode();
  return mode === "live"
    ? process.env.PAYMONGO_LIVE_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY || ""
    : process.env.PAYMONGO_TEST_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY || "";
}

function configuredMode() {
  return String(process.env.PAYMONGO_MODE || "test").toLowerCase() === "live" ? "live" : "test";
}

function integrationEnabled() {
  return runtimeEnabled ?? process.env.PAYMONGO_ENABLED !== "false";
}

function payMongoHeaders(secretKey = activeSecretKey()) {
  if (!integrationEnabled()) {
    const error = new Error(
      "PayMongo checkout is disabled in the Findra integrations dashboard.",
    );
    error.status = 503;
    throw error;
  }
  if (!secretKey || !secretKey.startsWith("sk_")) {
    const error = new Error(
      "PayMongo is not configured. Add a secret sk_test_ or sk_live_ PAYMONGO_SECRET_KEY to the server environment.",
    );
    error.status = 503;
    throw error;
  }
  return {
    Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function appBaseUrl(request) {
  if (process.env.PAYMONGO_APP_URL)
    return process.env.PAYMONGO_APP_URL.replace(/\/$/, "");
  const forwardedProto = request.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "http";
  return `${protocol}://${request.headers.host}`;
}

async function payMongoRequest(path, options = {}, secretKey) {
  const response = await fetch(`${PAYMONGO_API}${path}`, {
    ...options,
    headers: payMongoHeaders(secretKey),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.code ||
      "PayMongo could not process this request.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function integrationStatus() {
  const secretKey = activeSecretKey();
  const configured = /^sk_(test|live)_/.test(secretKey);
  const mode = configured ? configuredMode() : "not configured";
  return {
    configured,
    connectedAt: runtimeConnectedAt,
    enabled: configured && integrationEnabled(),
    keyHint: configured
      ? `${secretKey.slice(0, secretKey.indexOf("_", 3) + 1)}••••${secretKey.slice(-4)}`
      : "",
    mode,
    paymentMethods: runtimePaymentMethods,
    source: configured ? "server environment" : "not configured",
    availableModes: {
      test: Boolean(process.env.PAYMONGO_TEST_SECRET_KEY),
      live: Boolean(process.env.PAYMONGO_LIVE_SECRET_KEY),
    },
  };
}

function paymentMethodNames(capabilities) {
  const entries = Array.isArray(capabilities) ? capabilities : [];
  return entries
    .map(
      (entry) =>
        entry?.attributes?.payment_method ||
        entry?.attributes?.name ||
        entry?.id ||
        "",
    )
    .filter(Boolean);
}

async function connectIntegration(request, response) {
  return json(response, 410, { error: "PayMongo keys are managed securely through Render environment variables. Set PAYMONGO_MODE and the corresponding secret key, then redeploy." });
}

async function updateIntegration(request, response) {
  const body = await readJson(request);
  if (typeof body.enabled !== "boolean")
    return json(response, 400, { error: "An enabled state is required." });
  if (body.enabled && !/^sk_(test|live)_/.test(activeSecretKey()))
    return json(response, 409, {
      error:
        "Connect and verify a PayMongo secret key before enabling checkout.",
    });
  runtimeEnabled = body.enabled;
  return json(response, 200, integrationStatus());
}

async function requireAdmin(request, response) {
  const user = await readSession(request);
  if (user?.role === "admin") return true;
  json(response, 403, { error: "Administrator access is required." });
  return false;
}

async function createCheckoutSession(request, response) {
  const body = await readJson(request);
  const plan = (await activePackageById(body.packageId)) || (await activePackage());
  if (!plan) return json(response, 409, { error: "There is no active subscription package. Please contact Findra." });
  const method = ALLOWED_METHODS.has(body.method) ? body.method : "gcash";
  const name = String(body.accountName || body.listingName || "Findra customer")
    .trim()
    .slice(0, 120);
  const email = String(body.accountEmail || "")
    .trim()
    .slice(0, 160);
  const listingName = String(body.listingName || "Business listing")
    .trim()
    .slice(0, 120);
  if (!email || !email.includes("@"))
    return json(response, 400, { error: "A valid account email is required." });
  // New-listing checkout returns to /add-listing; an existing owner upgrading
  // their plan from the dashboard returns to /user instead.
  const redirectPath = body.redirectPath === "/user" ? "/user" : "/add-listing";
  const listingId = body.listingId ? String(body.listingId).slice(0, 20) : "";

  const baseUrl = appBaseUrl(request);
  const referenceNumber = `FIN-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
  const session = await payMongoRequest("/checkout_sessions", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          billing: { name, email },
          cancel_url: `${baseUrl}${redirectPath}?payment=cancelled`,
          description: `${plan.interval} ${plan.name} for ${listingName}`,
          line_items: [
            {
              amount: Math.round(Number(plan.price) * 100),
              currency: "PHP",
              description: `${plan.interval} Findra subscription`,
              name: plan.name,
              quantity: 1,
            },
          ],
          metadata: {
            account_email: email,
            business_name: listingName,
            package_id: String(plan.id),
            listing_id: listingId,
          },
          payment_method_types: [method],
          reference_number: referenceNumber,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          success_url: `${baseUrl}${redirectPath}?payment=success`,
        },
      },
    }),
  });

  return json(response, 201, {
    checkoutUrl: session.attributes.checkout_url,
    id: session.id,
    referenceNumber: session.attributes.reference_number || referenceNumber,
    plan,
  });
}

async function retrieveCheckoutSession(request, response, id) {
  if (!/^cs_[A-Za-z0-9]+$/.test(id))
    return json(response, 400, { error: "Invalid checkout session ID." });
  const session = await payMongoRequest(`/checkout_sessions/${id}`);
  const attributes = session.attributes || {};
  const payment =
    attributes.payments?.find(
      (entry) => entry?.attributes?.status === "paid",
    ) || attributes.payment_intent?.attributes?.payments?.[0];
  const paid =
    payment?.attributes?.status === "paid" ||
    attributes.payment_intent?.attributes?.status === "succeeded";
  if (paid) {
    const email = String(attributes.metadata?.account_email || "").toLowerCase();
    if (email) {
      const userResult = await query("SELECT id, email FROM users WHERE email = $1", [email]);
      const user = userResult.rows[0];
      const recent = await query(
        "SELECT 1 FROM notifications WHERE recipient_email = $1 AND event = 'subscription-started' AND created_at > NOW() - INTERVAL '10 minutes' LIMIT 1",
        [email],
      );
      if (user && !recent.rowCount)
        notify({ userId: user.id, email: user.email, event: "subscription-started" }).catch(() => {});
    }
  }

  return json(response, 200, {
    amount: payment?.attributes?.amount || 0,
    id: session.id,
    paid,
    paymentId: payment?.id || "",
    referenceNumber: attributes.reference_number || session.id,
    status: paid
      ? "paid"
      : attributes.payment_intent?.attributes?.status || attributes.status,
  });
}

export async function handlePayMongoRequest(request, response) {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  if (!url.pathname.startsWith("/api/paymongo/")) return false;
  try {
    if (
      request.method === "GET" &&
      url.pathname === "/api/paymongo/integration"
    ) {
      json(response, 200, integrationStatus());
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/paymongo/integration/connect"
    ) {
      if (!await requireAdmin(request, response)) return true;
      await connectIntegration(request, response);
      return true;
    }
    if (
      request.method === "PATCH" &&
      url.pathname === "/api/paymongo/integration"
    ) {
      if (!await requireAdmin(request, response)) return true;
      await updateIntegration(request, response);
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/paymongo/checkout-sessions"
    ) {
      await createCheckoutSession(request, response);
      return true;
    }
    const match = url.pathname.match(
      /^\/api\/paymongo\/checkout-sessions\/(cs_[A-Za-z0-9]+)$/,
    );
    if (request.method === "GET" && match) {
      await retrieveCheckoutSession(request, response, match[1]);
      return true;
    }
    json(response, 404, { error: "PayMongo endpoint not found." });
  } catch (error) {
    json(response, error.status || 500, {
      error: error.message || "The PayMongo request failed.",
    });
  }
  return true;
}
