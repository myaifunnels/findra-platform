import { query } from "./db.mjs";
import { readSession } from "./auth.mjs";

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}
async function body(request) {
  let text = "";
  for await (const chunk of request) text += chunk;
  return text ? JSON.parse(text) : {};
}
function record(row) { return { ...row, id: Number(row.id), price: Number(row.price), features: row.features || [] }; }
async function requireAdmin(request) {
  const user = await readSession(request);
  if (!user || user.role !== "admin") { const error = new Error("Administrator access is required."); error.status = 403; throw error; }
}
export async function activePackage() {
  const result = await query("SELECT * FROM packages WHERE status = 'Active' ORDER BY featured DESC, id ASC LIMIT 1");
  return result.rows[0] ? record(result.rows[0]) : null;
}
export async function handlePackagesRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/packages")) return false;
  try {
    const admin = url.searchParams.get("admin") === "true";
    if (admin) await requireAdmin(request);
    if (request.method === "GET" && url.pathname === "/api/packages") {
      const result = await query(`SELECT * FROM packages ${admin ? "" : "WHERE status = 'Active'"} ORDER BY featured DESC, id ASC`);
      return json(response, 200, { packages: result.rows.map(record) }), true;
    }
    if (request.method === "POST" && url.pathname === "/api/packages") {
      await requireAdmin(request); const item = await body(request);
      const result = await query("INSERT INTO packages (name, price, interval, status, featured, features) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *", [String(item.name || "").trim(), Number(item.price), item.interval || "Yearly", item.status || "Active", Boolean(item.featured), JSON.stringify(item.features || [])]);
      return json(response, 201, { package: record(result.rows[0]) }), true;
    }
    const match = url.pathname.match(/^\/api\/packages\/(\d+)$/);
    if (request.method === "PATCH" && match) {
      await requireAdmin(request); const item = await body(request);
      const result = await query("UPDATE packages SET name=$1, price=$2, interval=$3, status=$4, featured=$5, features=$6::jsonb, updated_at=NOW() WHERE id=$7 RETURNING *", [String(item.name || "").trim(), Number(item.price), item.interval || "Yearly", item.status || "Active", Boolean(item.featured), JSON.stringify(item.features || []), match[1]]);
      if (!result.rows[0]) return json(response, 404, { error: "Package not found." }), true;
      return json(response, 200, { package: record(result.rows[0]) }), true;
    }
    return json(response, 404, { error: "Package endpoint not found." }), true;
  } catch (error) { return json(response, error.status || 500, { error: error.message || "Package request failed." }), true; }
}
