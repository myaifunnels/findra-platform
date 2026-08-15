import { activePackage, activePackageById } from "./packages.mjs";
import { query } from "./db.mjs";
import { notify } from "./notifications.mjs";
import {
  hintFor,
  publicAppUrl,
  readIntegration,
  requireAdmin,
  setIntegrationEnabled,
  writeIntegration,
} from "./integrations.mjs";
const PAYMONGO_API = "https://api.paymongo.com/v1";
// Keep in sync with the payment channels actually Active in the PayMongo
// dashboard (Settings > Payment Methods). Inactive channels (GrabPay, Maya,
// ShopeePay, Google Pay, BillEase, and the Brankas-only banks) are left out
// since PayMongo checkout rejects sessions for a payment method the account
// hasn't been enabled for.
const ALLOWED_METHODS = new Set(["card", "gcash", "qrph", "dob"]);
const VERIFIED_METHODS = ["card", "gcash", "qrph", "dob"];

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

async function paymongoRecord() {
  return readIntegration("paymongo");
}

function secretFrom(record) {
  const mode = record.settings?.mode === "live" ? "live" : "test";
  return mode === "live"
    ? record.secrets.liveSecretKey || ""
    : record.secrets.testSecretKey || "";
}

async function payMongoHeaders(secretKey) {
  const record = await paymongoRecord();
  if (!record.enabled) {
    const error = new Error(
      "PayMongo checkout is disabled in the Findra integrations dashboard.",
    );
    error.status = 503;
    throw error;
  }
  const key = secretKey || secretFrom(record);
  if (!key || !key.startsWith("sk_")) {
    const error = new Error(
      "PayMongo is not configured. Add test and live secret keys in Admin → Integrations.",
    );
    error.status = 503;
    throw error;
  }
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function appBaseUrl(request) {
  const record = await paymongoRecord();
  return publicAppUrl(request, record.settings?.appUrl);
}

async function payMongoRequest(path, options = {}, secretKey) {
  const response = await fetch(`${PAYMONGO_API}${path}`, {
    ...options,
    headers: await payMongoHeaders(secretKey),
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

async function verifyPayMongoKey(secretKey) {
  const response = await fetch(`${PAYMONGO_API}/webhooks`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      Accept: "application/json",
    },
  });
  if (response.status === 401 || response.status === 403) {
    const error = new Error("PayMongo rejected this secret key.");
    error.status = 401;
    throw error;
  }
  return true;
}

async function integrationStatus() {
  const record = await paymongoRecord();
  const secretKey = secretFrom(record);
  const configured = /^sk_(test|live)_/.test(secretKey);
  const mode = configured
    ? record.settings?.mode === "live"
      ? "live"
      : "test"
    : "not configured";
  return {
    configured,
    connectedAt: record.connectedAt,
    enabled: configured && record.enabled,
    keyHint: configured ? hintFor("paymongo", { ...record.secrets, mode }) : "",
    mode,
    paymentMethods: configured ? VERIFIED_METHODS : [],
    source: record.source,
    appUrl: record.settings?.appUrl || "",
    availableModes: {
      test: Boolean(record.secrets.testSecretKey),
      live: Boolean(record.secrets.liveSecretKey),
    },
  };
}

async function connectIntegration(request, response) {
  const body = await readJson(request);
  const testSecretKey = String(body.testSecretKey || "").trim();
  const liveSecretKey = String(body.liveSecretKey || "").trim();
  const mode = body.mode === "live" ? "live" : "test";
  const appUrl = String(body.appUrl || "").trim().replace(/\/$/, "");
  const current = await paymongoRecord();
  const nextTest = testSecretKey || current.secrets.testSecretKey || "";
  const nextLive = liveSecretKey || current.secrets.liveSecretKey || "";
  const activeKey = mode === "live" ? nextLive : nextTest;
  if (!/^sk_(test|live)_/.test(activeKey)) {
    return json(response, 400, {
      error: `Enter a valid PayMongo ${mode} secret key beginning with sk_${mode}_.`,
    });
  }
  if (testSecretKey && !testSecretKey.startsWith("sk_test_")) {
    return json(response, 400, { error: "The test key must begin with sk_test_." });
  }
  if (liveSecretKey && !liveSecretKey.startsWith("sk_live_")) {
    return json(response, 400, { error: "The live key must begin with sk_live_." });
  }
  await verifyPayMongoKey(activeKey);
  await writeIntegration("paymongo", {
    enabled: body.enabled !== false,
    settings: { mode, appUrl },
    secrets: {
      testSecretKey: nextTest,
      liveSecretKey: nextLive,
    },
    mergeSecrets: false,
  });
  return json(response, 200, await integrationStatus());
}

async function updateIntegration(request, response) {
  const body = await readJson(request);
  if (typeof body.enabled !== "boolean")
    return json(response, 400, { error: "An enabled state is required." });
  const record = await paymongoRecord();
  if (body.enabled && !/^sk_(test|live)_/.test(secretFrom(record)))
    return json(response, 409, {
      error:
        "Connect and verify a PayMongo secret key before enabling checkout.",
    });
  await setIntegrationEnabled("paymongo", body.enabled);
  return json(response, 200, await integrationStatus());
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

  const baseUrl = await appBaseUrl(request);
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
      if (!await requireAdmin(request, response)) return true;
      json(response, 200, await integrationStatus());
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
