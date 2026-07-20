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
  // A signed-in session, or a matching account email, identifies the sender as
  // a registered member instead of a guest.
  const sessionUser = await readSession(request).catch(() => null);
  let senderUserId = sessionUser?.id || null;
  if (!senderUserId) {
    const match = await query("SELECT id FROM users WHERE email = $1", [email]);
    senderUserId = match.rows[0]?.id || null;
  }
  const target = listing ? "business" : "admin";
  const created = await query(
    `INSERT INTO inquiries (listing_id, target, name, email, phone, message, sender_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [listing ? listing.id : null, target, name, email, phone, message, senderUserId],
  );

  const context = { contactFirstName: name, contactFullName: name, contactEmail: email, contactPhone: phone, businessName: listing ? listing.name : "Website contact form", inquiryMessage: message };
  if (listing) {
    notify({ userId: listing.owner_id, email: listing.data?.email, event: "inquiry-received", context }).catch(() => {});
  }
  notifyAdmins("inbox-message-admin", context).catch(() => {});
  notify({ userId: senderUserId, email, event: "inquiry-sent-guest", context }).catch(() => {});
  return json(response, 201, { inquiry: created.rows[0] });
}

const listSelect = `SELECT inquiries.*, listings.name AS listing_name,
    users.role AS sender_role, users.display_name AS sender_display_name,
    (inquiries.sender_user_id IS NOT NULL) AS sender_registered`;

async function list(request, response, user) {
  const result =
    user.role === "admin"
      ? await query(`${listSelect} FROM inquiries
          LEFT JOIN listings ON listings.id = inquiries.listing_id
          LEFT JOIN users ON users.id = inquiries.sender_user_id
          ORDER BY inquiries.created_at DESC LIMIT 200`)
      : await query(
          `${listSelect} FROM inquiries
            JOIN listings ON listings.id = inquiries.listing_id
            LEFT JOIN users ON users.id = inquiries.sender_user_id
            WHERE listings.owner_id = $1 ORDER BY inquiries.created_at DESC LIMIT 200`,
          [user.id],
        );
  return json(response, 200, { inquiries: result.rows });
}

async function findAccessibleInquiry(id, user) {
  const result =
    user.role === "admin"
      ? await query("SELECT inquiries.*, listings.name AS listing_name FROM inquiries LEFT JOIN listings ON listings.id = inquiries.listing_id WHERE inquiries.id = $1", [id])
      : await query(
          `SELECT inquiries.*, listings.name AS listing_name FROM inquiries
            JOIN listings ON listings.id = inquiries.listing_id
            WHERE inquiries.id = $1 AND listings.owner_id = $2`,
          [id, user.id],
        );
  return result.rows[0] || null;
}

async function listReplies(response, inquiry) {
  const result = await query(
    "SELECT * FROM inquiry_replies WHERE inquiry_id = $1 ORDER BY created_at ASC",
    [inquiry.id],
  );
  return json(response, 200, { replies: result.rows });
}

async function createReply(request, response, inquiry, user) {
  const body = await readJson(request);
  const message = String(body.message || "").trim().slice(0, 4000);
  if (!message) return json(response, 400, { error: "Write a reply message first." });
  const senderName = user.display_name || "Findra";
  const context = {
    contactFirstName: inquiry.name,
    contactFullName: inquiry.name,
    contactEmail: inquiry.email,
    businessName: inquiry.listing_name || "Findra",
    replyFrom: senderName,
    replyMessage: message,
  };
  let emailStatus = "queued";
  try {
    await notify({ userId: inquiry.sender_user_id, email: inquiry.email, event: "inquiry-reply", context });
    emailStatus = "sent";
  } catch {
    emailStatus = "failed";
  }
  const created = await query(
    `INSERT INTO inquiry_replies (inquiry_id, sender_user_id, sender_name, message, email_status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [inquiry.id, user.id, senderName, message, emailStatus],
  );
  await query("UPDATE inquiries SET status = 'Responded' WHERE id = $1", [inquiry.id]);
  notify({ userId: user.id, email: user.email, event: "inquiry-reply-sent-owner", context: { ...context, contactFirstName: senderName, contactFullName: senderName } }).catch(() => {});
  return json(response, 201, { reply: created.rows[0] });
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

    const replyMatch = url.pathname.match(/^\/api\/inquiries\/(\d+)\/replies$/);
    if (replyMatch) {
      const inquiry = await findAccessibleInquiry(replyMatch[1], user);
      if (!inquiry) return json(response, 404, { error: "Inquiry not found." }), true;
      if (request.method === "GET") return await listReplies(response, inquiry), true;
      if (request.method === "POST") return await createReply(request, response, inquiry, user), true;
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
