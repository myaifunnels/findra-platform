import { activePackage, activePackageById } from "./packages.mjs";
import { query } from "./db.mjs";
import { notify } from "./notifications.mjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readSession } from "./auth.mjs";
import {
  activateListingAfterPayment,
  recordAutoSubscriptionPayment,
  recordAutoSubscriptionProblem,
  termMonths,
} from "./listings.mjs";
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

function publicKeyFrom(record) {
  const mode = record.settings?.mode === "live" ? "live" : "test";
  return (mode === "live" ? record.secrets.livePublicKey : record.secrets.testPublicKey) || "";
}

function webhookSecretsFrom(record) {
  return [record.secrets.testWebhookSecret, record.secrets.liveWebhookSecret].filter(Boolean);
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
  const publicKey = publicKeyFrom(record);
  return {
    configured,
    publicKeyConfigured: /^pk_(test|live)_/.test(publicKey),
    webhookRegistered: Boolean(webhookSecretsFrom(record).length),
    monthlyAuto: record.settings?.monthlyAuto === true,
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
    availablePublicKeys: {
      test: Boolean(record.secrets.testPublicKey),
      live: Boolean(record.secrets.livePublicKey),
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
  const testPublicKey = String(body.testPublicKey || "").trim();
  const livePublicKey = String(body.livePublicKey || "").trim();
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
  if (testPublicKey && !testPublicKey.startsWith("pk_test_")) {
    return json(response, 400, { error: "The test public key must begin with pk_test_." });
  }
  if (livePublicKey && !livePublicKey.startsWith("pk_live_")) {
    return json(response, 400, { error: "The live public key must begin with pk_live_." });
  }
  await verifyPayMongoKey(activeKey);
  await writeIntegration("paymongo", {
    enabled: body.enabled !== false,
    settings: {
      mode,
      appUrl,
      monthlyAuto: typeof body.monthlyAuto === "boolean" ? body.monthlyAuto : current.settings?.monthlyAuto === true,
    },
    secrets: {
      ...current.secrets,
      testSecretKey: nextTest,
      liveSecretKey: nextLive,
      testPublicKey: testPublicKey || current.secrets.testPublicKey || "",
      livePublicKey: livePublicKey || current.secrets.livePublicKey || "",
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

const WEBHOOK_EVENTS = [
  "subscription.invoice.paid",
  "subscription.invoice.payment_failed",
  "subscription.past_due",
  "subscription.unpaid",
];

async function readRaw(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large.");
  }
  return body;
}

// Registers Findra's webhook with PayMongo and keeps the signing secret.
async function registerWebhook(request, response) {
  const record = await paymongoRecord();
  const mode = record.settings?.mode === "live" ? "live" : "test";
  const baseUrl = await appBaseUrl(request);
  const created = await payMongoRequest("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      data: { attributes: { url: `${baseUrl}/api/paymongo/webhook`, events: WEBHOOK_EVENTS } },
    }),
  });
  const secret = created?.attributes?.secret_key;
  if (!secret) return json(response, 502, { error: "PayMongo did not return a webhook secret. Register the webhook in the PayMongo dashboard instead." });
  await writeIntegration("paymongo", {
    secrets: { [mode === "live" ? "liveWebhookSecret" : "testWebhookSecret"]: secret },
  });
  return json(response, 200, await integrationStatus());
}

function signatureValid(rawBody, header, secrets) {
  const parts = {};
  String(header || "").split(",").forEach((part) => {
    const [key, ...rest] = part.split("=");
    if (key) parts[key.trim()] = rest.join("=").trim();
  });
  if (!parts.t) return false;
  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
    return [parts.te, parts.li].filter(Boolean).some((candidate) => {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  });
}

async function handleWebhook(request, response) {
  const rawBody = await readRaw(request);
  const record = await paymongoRecord();
  if (!signatureValid(rawBody, request.headers["paymongo-signature"], webhookSecretsFrom(record)))
    return json(response, 400, { error: "Invalid webhook signature." });
  let event;
  try {
    event = JSON.parse(rawBody)?.data?.attributes;
  } catch {
    return json(response, 400, { error: "Invalid webhook body." });
  }
  const resource = event?.data;
  if (event?.type === "subscription.invoice.paid") {
    await recordAutoSubscriptionPayment({
      paymongoSubscriptionId: resource?.attributes?.resource_id,
      invoiceId: resource?.id,
    });
  } else if (event?.type === "subscription.invoice.payment_failed") {
    await recordAutoSubscriptionProblem({ paymongoSubscriptionId: resource?.attributes?.resource_id, problem: "past_due" });
  } else if (event?.type === "subscription.past_due" || event?.type === "subscription.unpaid") {
    await recordAutoSubscriptionProblem({
      paymongoSubscriptionId: resource?.id,
      problem: event.type === "subscription.unpaid" ? "unpaid" : "past_due",
    });
  }
  return json(response, 200, { received: true });
}

// What billing choices the owner dashboard may offer.
async function billingOptions(request, response) {
  const record = await paymongoRecord();
  const ready = record.enabled && record.settings?.monthlyAuto === true && /^pk_(test|live)_/.test(publicKeyFrom(record));
  return json(response, 200, { monthlyAuto: Boolean(ready) });
}

async function loadOwnedListing(request, listingId) {
  const user = await readSession(request);
  if (!user) {
    const error = new Error("Please sign in.");
    error.status = 401;
    throw error;
  }
  const found = await query("SELECT * FROM listings WHERE id = $1 AND owner_id = $2", [Number(listingId), user.id]);
  if (!found.rows[0]) {
    const error = new Error("Listing not found.");
    error.status = 404;
    throw error;
  }
  return { user, row: found.rows[0] };
}

// Creates the PayMongo customer, plan and subscription for an approved listing
// and returns what the browser needs to enter the card straight at PayMongo.
async function startAutoSubscription(request, response) {
  const body = await readJson(request);
  const record = await paymongoRecord();
  const publicKey = publicKeyFrom(record);
  if (record.settings?.monthlyAuto !== true || !/^pk_(test|live)_/.test(publicKey))
    return json(response, 409, { error: "Automatic monthly billing is not enabled yet. Please pay in full or contact Findra." });
  const { user, row } = await loadOwnedListing(request, body.listingId);
  const current = row.data?.subscription;
  if (row.status !== "Approved" || current?.status !== "Awaiting payment")
    return json(response, 409, { error: "This listing is not waiting for payment." });
  const plan = await activePackageById(current.packageId || body.packageId);
  const months = plan ? termMonths(plan.interval) : 0;
  if (!plan || months < 2) return json(response, 409, { error: "This package cannot be billed monthly." });
  const monthlyAmount = Math.round(Number(plan.price) / months);
  const names = String(user.display_name || "Findra owner").trim().split(/\s+/);
  const phone = String(row.data?.phone || "").replace(/[^\d+]/g, "");
  const customer = await payMongoRequest("/customers", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          first_name: names[0] || "Findra",
          last_name: names.slice(1).join(" ") || names[0] || "Owner",
          email: user.email,
          ...(phone ? { phone } : {}),
        },
      },
    }),
  });
  const planResource = await payMongoRequest("/subscriptions/plans", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          name: `${plan.name} monthly`.slice(0, 100),
          description: `${months}-month Findra listing, billed monthly`,
          amount: monthlyAmount * 100,
          currency: "PHP",
          interval: "monthly",
          interval_count: 1,
          cycle_count: months,
        },
      },
    }),
  });
  const subscription = await payMongoRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ data: { attributes: { customer_id: customer.id, plan_id: planResource.id } } }),
  });
  const intentId = subscription?.attributes?.latest_invoice?.payment_intent?.id;
  if (!intentId) return json(response, 502, { error: "PayMongo did not create the first payment. Please try again." });
  const intent = await payMongoRequest(`/payment_intents/${intentId}`);
  const nextSubscription = {
    ...current,
    packageId: plan.id,
    amount: plan.price,
    billing: plan.interval,
    billingMode: "auto",
    termMonths: months,
    monthlyAmount,
    paymongoCustomerId: customer.id,
    paymongoSubscriptionId: subscription.id,
    paidInvoices: [],
  };
  await query("UPDATE listings SET data = $1::jsonb, updated_at = NOW() WHERE id = $2", [
    JSON.stringify({ ...row.data, subscription: nextSubscription }),
    row.id,
  ]);
  const baseUrl = await appBaseUrl(request);
  return json(response, 201, {
    subscriptionId: subscription.id,
    paymentIntentId: intentId,
    clientKey: intent?.attributes?.client_key,
    publicKey,
    monthlyAmount,
    termMonths: months,
    returnUrl: `${baseUrl}/user?payment=subscription`,
  });
}

// After the card step (or the 3-D Secure return) ask PayMongo whether the
// first invoice is paid and, if so, activate the listing.
async function confirmAutoSubscription(request, response) {
  const body = await readJson(request);
  const { row } = await loadOwnedListing(request, body.listingId);
  const paymongoSubscriptionId = row.data?.subscription?.paymongoSubscriptionId;
  if (!paymongoSubscriptionId) return json(response, 404, { error: "No monthly billing was started for this listing." });
  const subscription = await payMongoRequest(`/subscriptions/${paymongoSubscriptionId}`);
  const invoice = subscription?.attributes?.latest_invoice;
  const paid = invoice?.status === "paid";
  if (paid) await recordAutoSubscriptionPayment({ paymongoSubscriptionId, invoiceId: invoice.id });
  return json(response, 200, { paid, status: subscription?.attributes?.status || "" });
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
  const paymentStatus = attributes.payment_intent?.attributes?.status || attributes.status;
  if (paid) {
    const email = String(attributes.metadata?.account_email || "").toLowerCase();
    const listingId = Number(attributes.metadata?.listing_id);
    if (email && listingId) {
      // Activation is server-side only: the browser cannot mark itself paid.
      await activateListingAfterPayment({
        listingId,
        accountEmail: email,
        packageId: attributes.metadata?.package_id,
        payment: {
          sessionId: session.id,
          method: payment?.attributes?.source?.type || "paymongo",
          reference: payment?.id || attributes.reference_number || session.id,
        },
      }).catch(() => {});
    }
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
  if (!paid && ["failed", "payment_failed", "cancelled"].includes(String(paymentStatus || "").toLowerCase())) {
    const email = String(attributes.metadata?.account_email || "").toLowerCase();
    if (email) {
      const userResult = await query("SELECT id, email FROM users WHERE email = $1", [email]);
      const user = userResult.rows[0];
      const recent = await query(
        "SELECT 1 FROM notifications WHERE recipient_email = $1 AND event = 'subscription-failed' AND created_at > NOW() - INTERVAL '10 minutes' LIMIT 1",
        [email],
      );
      if (user && !recent.rowCount) {
        notify({
          userId: user.id,
          email: user.email,
          event: "subscription-failed",
          context: { businessName: attributes.metadata?.business_name || "your business" },
        }).catch(() => {});
      }
    }
  }

  return json(response, 200, {
    amount: payment?.attributes?.amount || 0,
    id: session.id,
    paid,
    paymentId: payment?.id || "",
    referenceNumber: attributes.reference_number || session.id,
    status: paid ? "paid" : paymentStatus,
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
    if (request.method === "POST" && url.pathname === "/api/paymongo/webhook") {
      await handleWebhook(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/paymongo/webhook/register") {
      if (!await requireAdmin(request, response)) return true;
      await registerWebhook(request, response);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/paymongo/billing-options") {
      await billingOptions(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/paymongo/subscriptions") {
      await startAutoSubscription(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/paymongo/subscriptions/confirm") {
      await confirmAutoSubscription(request, response);
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
