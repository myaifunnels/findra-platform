import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";
import { notify, notifyAdmins } from "./notifications.mjs";

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
    if (body.length > 5_000_000) {
      const error = new Error(
        "This listing contains media that is too large to save directly. Please use smaller files while cloud media storage is being connected.",
      );
      error.status = 413;
      throw error;
    }
  }
  return body ? JSON.parse(body) : {};
}

export function subscriptionDaysLeft(subscription, createdAt) {
  if (!subscription) return null;
  const start = new Date(subscription.startDate || createdAt);
  const cycleDays = String(subscription.billing || "").toLowerCase() === "monthly" ? 30 : 365;
  const expires = new Date(start.getTime() + cycleDays * 86_400_000);
  return Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
}

function publicRecord(row) {
  const data = row.data || {};
  const subscription = data.subscription
    ? { ...data.subscription, daysLeft: subscriptionDaysLeft(data.subscription, row.created_at) }
    : data.subscription;
  return {
    ...data,
    subscription,
    id: Number(row.id),
    name: row.name,
    category: row.category || "",
    location: row.location || "",
    status: row.status,
    ownerId: row.owner_id,
    owner: row.owner_name || data.owner || "",
  };
}

function normaliseBusinessEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normaliseBusinessPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  // Treat common Philippine local and international formats as the same number.
  if (/^0\d{10}$/.test(digits)) digits = `63${digits.slice(1)}`;
  return digits;
}

async function assertUniqueBusinessContact(record, excludeId = null) {
  const email = normaliseBusinessEmail(record.email);
  const phone = normaliseBusinessPhone(record.phone);
  if (!email && !phone) return;

  const result = await query(
    "SELECT id, name, data FROM listings WHERE ($1::bigint IS NULL OR id <> $1)",
    [excludeId],
  );
  const duplicate = result.rows.find((row) => {
    const savedEmail = normaliseBusinessEmail(row.data?.email);
    const savedPhone = normaliseBusinessPhone(row.data?.phone);
    return (email && savedEmail === email) || (phone && savedPhone === phone);
  });
  if (!duplicate) return;

  const sameEmail = email && normaliseBusinessEmail(duplicate.data?.email) === email;
  const samePhone = phone && normaliseBusinessPhone(duplicate.data?.phone) === phone;
  const fields = [sameEmail && "email address", samePhone && "phone number"].filter(Boolean).join(" and ");
  const error = new Error(`This ${fields} is already used by the “${duplicate.name}” listing. Use a unique business contact.`);
  error.status = 409;
  throw error;
}

async function list(request, response) {
  const user = await readSession(request);
  const onlyMine = new URL(request.url, "http://localhost").searchParams.get("mine") === "true";
  if (onlyMine && !user) return json(response, 401, { error: "Please sign in." });
  const result = await query(
    `SELECT listings.*, users.display_name AS owner_name FROM listings
      LEFT JOIN users ON users.id = listings.owner_id
      WHERE ($1::uuid IS NULL OR listings.owner_id = $1 OR $2 = true)
      ORDER BY listings.created_at DESC`,
    [onlyMine ? user.id : null, !onlyMine],
  );
  return json(response, 200, { listings: result.rows.map(publicRecord) });
}

async function create(request, response) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "Please sign in to save a listing." });
  const record = await readJson(request);
  const name = String(record.name || "").trim();
  if (!name) return json(response, 400, { error: "Business name is required." });
  await assertUniqueBusinessContact(record);
  const status = user.role === "admin" && record.status ? String(record.status) : "Pending";
  const result = await query(
    `INSERT INTO listings (owner_id, status, name, category, location, data)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [user.id, status, name, String(record.category || ""), String(record.location || ""), JSON.stringify(record)],
  );
  const created = result.rows[0];
  const notificationContext = { businessName: name, contactPhone: record.phone || record.whatsapp || record.viber || "", businessUrl: `${process.env.PAYMONGO_APP_URL || "https://staging.findra.ph"}/listing/${created.id}` };
  if (user.role === "admin" && status === "Published") notify({ userId: created.owner_id, email: record.email, event: "listing-approved", context: notificationContext }).catch(() => {});
  if (user.role === "admin" && status === "Declined") notify({ userId: created.owner_id, email: record.email, event: "listing-declined", context: notificationContext }).catch(() => {});
  if (user.role !== "admin") {
    notify({ userId: user.id, email: user.email, event: "listing-submitted", context: notificationContext }).catch(() => {});
    notifyAdmins("listing-pending-admin", notificationContext).catch(() => {});
  }
  return json(response, 201, { listing: publicRecord({ ...created, owner_name: user.display_name }) });
}

async function update(request, response, id) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "Please sign in to update a listing." });
  const record = await readJson(request);
  const existing = await query("SELECT * FROM listings WHERE id = $1", [id]);
  const listing = existing.rows[0];
  if (!listing) return json(response, 404, { error: "Listing not found." });
  if (user.role !== "admin" && listing.owner_id !== user.id)
    return json(response, 403, { error: "You do not own this listing." });
  const nextData = { ...(listing.data || {}), ...record };
  const name = String(nextData.name || listing.name).trim();
  await assertUniqueBusinessContact(nextData, Number(id));
  const nextStatus = user.role === "admin" && record.status ? String(record.status) : listing.status;
  const result = await query(
    `UPDATE listings SET name = $1, category = $2, location = $3, status = $4, data = $5::jsonb,
       updated_at = NOW() WHERE id = $6 RETURNING *`,
    [name, String(nextData.category || listing.category || ""), String(nextData.location || listing.location || ""), nextStatus, JSON.stringify(nextData), id],
  );
  if (user.role === "admin" && listing.status !== nextStatus) {
    const event = nextStatus === "Published" ? "listing-approved" : nextStatus === "Declined" ? "listing-declined" : null;
    if (event) notify({ userId: listing.owner_id, email: listing.data?.email, event, context: { businessName: name, contactPhone: nextData.phone || nextData.whatsapp || nextData.viber || "", businessUrl: `${process.env.PAYMONGO_APP_URL || "https://staging.findra.ph"}/listing/${id}` } }).catch(() => {});
  }
  return json(response, 200, { listing: publicRecord({ ...result.rows[0], owner_name: user.display_name }) });
}

async function remove(request, response, id) {
  const user = await readSession(request);
  if (!user || user.role !== "admin") return json(response, 403, { error: "Administrator access is required." });
  const result = await query("DELETE FROM listings WHERE id = $1 RETURNING id, name", [id]);
  if (!result.rows[0]) return json(response, 404, { error: "Listing not found." });
  return json(response, 200, { deleted: result.rows[0] });
}

export async function handleListingsRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/listings")) return false;
  try {
    if (request.method === "GET" && url.pathname === "/api/listings") return await list(request, response), true;
    if (request.method === "POST" && url.pathname === "/api/listings") return await create(request, response), true;
    const match = url.pathname.match(/^\/api\/listings\/(\d+)$/);
    if (request.method === "PATCH" && match) return await update(request, response, match[1]), true;
    if (request.method === "DELETE" && match) return await remove(request, response, match[1]), true;
    return json(response, 404, { error: "Listing endpoint not found." }), true;
  } catch (error) {
    if (error?.code === "23505" && /business (email|phone)/i.test(error.message || "")) {
      return json(response, 409, { error: error.message });
    }
    return json(response, error.status || 500, { error: error.message || "Listing request failed." }), true;
  }
}
