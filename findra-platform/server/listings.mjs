import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";
import { notify } from "./notifications.mjs";

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

function publicRecord(row) {
  return {
    ...row.data,
    id: Number(row.id),
    name: row.name,
    category: row.category || "",
    location: row.location || "",
    status: row.status,
    ownerId: row.owner_id,
    owner: row.owner_name || row.data?.owner || "",
  };
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
  notify({ userId: user.id, email: user.email, event: "listing-submitted" }).catch(() => {});
  return json(response, 200, { listings: result.rows.map(publicRecord) });
}

async function create(request, response) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "Please sign in to save a listing." });
  const record = await readJson(request);
  const name = String(record.name || "").trim();
  if (!name) return json(response, 400, { error: "Business name is required." });
  const status = user.role === "admin" && record.status ? String(record.status) : "Draft";
  const result = await query(
    `INSERT INTO listings (owner_id, status, name, category, location, data)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [user.id, status, name, String(record.category || ""), String(record.location || ""), JSON.stringify(record)],
  );
  if (user.role === "admin" && record.status === "Published") notify({ userId: listing.owner_id, email: listing.data?.email, event: "listing-approved" }).catch(() => {});
  if (user.role === "admin" && record.status === "Declined") notify({ userId: listing.owner_id, email: listing.data?.email, event: "listing-declined" }).catch(() => {});
  return json(response, 201, { listing: publicRecord({ ...result.rows[0], owner_name: user.display_name }) });
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
  const name = String(record.name || listing.name).trim();
  const result = await query(
    `UPDATE listings SET name = $1, category = $2, location = $3, data = $4::jsonb,
       updated_at = NOW() WHERE id = $5 RETURNING *`,
    [name, String(record.category || ""), String(record.location || ""), JSON.stringify(record), id],
  );
  return json(response, 200, { listing: publicRecord({ ...result.rows[0], owner_name: user.display_name }) });
}

export async function handleListingsRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/listings")) return false;
  try {
    if (request.method === "GET" && url.pathname === "/api/listings") return await list(request, response), true;
    if (request.method === "POST" && url.pathname === "/api/listings") return await create(request, response), true;
    const match = url.pathname.match(/^\/api\/listings\/(\d+)$/);
    if (request.method === "PATCH" && match) return await update(request, response, match[1]), true;
    return json(response, 404, { error: "Listing endpoint not found." }), true;
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || "Listing request failed." }), true;
  }
}
