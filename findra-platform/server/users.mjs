import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";

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

function publicUser(row) {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    role: row.role === "admin" ? "Administrator" : "Business owner",
    status: row.status,
    joined: row.created_at,
  };
}

export async function handleUsersRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/users")) return false;
  try {
    const user = await readSession(request);
    if (!user) return json(response, 401, { error: "Please sign in." }), true;
    if (user.role !== "admin") return json(response, 403, { error: "Administrator access is required." }), true;

    if (request.method === "GET" && url.pathname === "/api/users") {
      const result = await query(
        "SELECT id, email, display_name, role, status, created_at FROM users ORDER BY created_at DESC",
      );
      return json(response, 200, { users: result.rows.map(publicUser) }), true;
    }

    const match = url.pathname.match(/^\/api\/users\/([0-9a-f-]+)$/i);
    if (match && request.method === "PATCH") {
      const id = match[1];
      const body = await readJson(request);
      const fields = [];
      const values = [];
      if (body.status && ["Active", "Suspended"].includes(body.status)) {
        values.push(body.status);
        fields.push(`status = $${values.length}`);
      }
      if (body.role && ["Administrator", "Business owner"].includes(body.role)) {
        values.push(body.role === "Administrator" ? "admin" : "user");
        fields.push(`role = $${values.length}`);
      }
      if (!fields.length) return json(response, 400, { error: "Nothing to update." }), true;
      values.push(id);
      const result = await query(
        `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, email, display_name, role, status, created_at`,
        values,
      );
      if (!result.rows[0]) return json(response, 404, { error: "User not found." }), true;
      return json(response, 200, { user: publicUser(result.rows[0]) }), true;
    }

    if (match && request.method === "DELETE") {
      if (match[1] === user.id) return json(response, 400, { error: "You cannot delete your own account." }), true;
      const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [match[1]]);
      if (!result.rows[0]) return json(response, 404, { error: "User not found." }), true;
      return json(response, 200, { ok: true }), true;
    }

    return json(response, 404, { error: "User endpoint not found." }), true;
  } catch (error) {
    return json(response, 500, { error: error.message }), true;
  }
}
