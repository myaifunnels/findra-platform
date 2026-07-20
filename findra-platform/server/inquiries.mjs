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
    if (body.length > 50_000) throw new Error("Message is too long.");
  }
  return body ? JSON.parse(body) : {};
}

async function create(request, response) {
  const body = await readJson(request);
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const message = String(body.message || "").trim().slice(0, 4000);
  const listingId = body.listingId ? Number(body.listingId) : null;
  if (!name || !email.includes("@") || !message)
    return json(response, 400, { error: "Add your name, a valid email address, and a message." });

  let listing = null;
  if (listingId) {
    const result = await query("SELECT * FROM listings WHERE id = $1", [listingId]);
    listing = result.rows[0] || null;
  }
  const target = listing ? "business" : "admin";
  const created = await query(
    `INSERT INTO inquiries (listing_id, target, name, email, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [listing ? listing.id : null, target, name, email, phone, message],
  );

  const context = { contactFirstName: name, contactFullName: name, contactEmail: email, contactPhone: phone, businessName: listing ? listing.name : "Website contact form" };
  if (listing) {
    notify({ userId: listing.owner_id, email: listing.data?.email, event: "inquiry-received", context }).catch(() => {});
  }
  notifyAdmins("inbox-message-admin", context).catch(() => {});
  return json(response, 201, { inquiry: created.rows[0] });
}

async function list(request, response, user) {
  const result =
    user.role === "admin"
      ? await query("SELECT inquiries.*, listings.name AS listing_name FROM inquiries LEFT JOIN listings ON listings.id = inquiries.listing_id ORDER BY inquiries.created_at DESC LIMIT 200")
      : await query(
          "SELECT inquiries.*, listings.name AS listing_name FROM inquiries JOIN listings ON listings.id = inquiries.listing_id WHERE listings.owner_id = $1 ORDER BY inquiries.created_at DESC LIMIT 200",
          [user.id],
        );
  return json(response, 200, { inquiries: result.rows });
}

export async function handleInquiriesRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/inquiries")) return false;
  try {
    if (request.method === "POST" && url.pathname === "/api/inquiries") {
      await create(request, response);
      return true;
    }
    const user = await readSession(request);
    if (!user) return json(response, 401, { error: "Please sign in." }), true;

    if (request.method === "GET" && url.pathname === "/api/inquiries") {
      await list(request, response, user);
      return true;
    }

    const match = url.pathname.match(/^\/api\/inquiries\/(\d+)$/);
    if (match && request.method === "PATCH") {
      const body = await readJson(request);
      const status = ["New", "Read", "Responded"].includes(body.status) ? body.status : "Read";
      const result =
        user.role === "admin"
          ? await query("UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING *", [status, match[1]])
          : await query(
              `UPDATE inquiries SET status = $1 WHERE id = $2
                 AND listing_id IN (SELECT id FROM listings WHERE owner_id = $3) RETURNING *`,
              [status, match[1], user.id],
            );
      if (!result.rows[0]) return json(response, 404, { error: "Inquiry not found." }), true;
      return json(response, 200, { inquiry: result.rows[0] }), true;
    }

    return json(response, 404, { error: "Inquiry endpoint not found." }), true;
  } catch (error) {
    return json(response, error.status || 500, { error: error.message }), true;
  }
}
