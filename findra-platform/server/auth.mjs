import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { databaseConfigured, query } from "./db.mjs";
import { notify } from "./notifications.mjs";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "findra_session";
const SESSION_DAYS = 14;
const PASSWORD_MIN_LENGTH = 10;

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
    if (body.length > 64_000) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error("Invalid request body.");
    error.status = 400;
    throw error;
  }
}

function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function passwordError(password) {
  if (String(password || "").length < PASSWORD_MIN_LENGTH)
    return `Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`;
  return "";
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, expectedHex] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((pair) => pair.trim().split(/=(.*)/s, 2))
      .filter(([key]) => key),
  );
}

function cookieAttributes(maxAge = 0) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name,
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
    profileImage: row.profile_image || "",
  };
}

async function createSession(response, user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), user.id, hashToken(token), expiresAt],
  );
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; ${cookieAttributes(SESSION_DAYS * 86_400)}`,
  );
}

export async function readSession(request) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const result = await query(
    `SELECT users.id, users.email, users.display_name, users.role, users.email_verified_at, users.profile_image
       FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    [hashToken(token)],
  );
  return result.rows[0] || null;
}

async function register(request, response) {
  const body = await readJson(request);
  const email = normaliseEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!email.includes("@") || !name)
    return json(response, 400, { error: "Enter your name and a valid email address." });
  const issue = passwordError(password);
  if (issue) return json(response, 400, { error: issue });
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount)
    return json(response, 409, { error: "An account already uses this email. Please sign in instead." });
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  const bootstrapAdminEmail = normaliseEmail(
    process.env.BOOTSTRAP_ADMIN_EMAIL,
  );
  const role = bootstrapAdminEmail && email === bootstrapAdminEmail ? "admin" : "user";
  const result = await query(
    `INSERT INTO users (id, email, display_name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, role, email_verified_at, profile_image`,
    [id, email, name, passwordHash, role],
  );
  const user = result.rows[0];
  await createSession(response, user);
  notify({ userId: user.id, email: user.email, event: "new-user" }).catch(() => {});
  return json(response, 201, { user: publicUser(user) });
}

async function login(request, response) {
  const body = await readJson(request);
  const email = normaliseEmail(body.email);
  const password = String(body.password || "");
  const result = await query(
    "SELECT id, email, display_name, role, password_hash, email_verified_at, profile_image FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash)))
    return json(response, 401, { error: "Email or password is incorrect." });
  await createSession(response, user);
  return json(response, 200, { user: publicUser(user) });
}

async function logout(request, response) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (token)
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieAttributes(0)}`);
  return json(response, 200, { ok: true });
}

async function session(request, response) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "No active session." });
  return json(response, 200, { user: publicUser(user) });
}

async function updateProfile(request, response) {
  const user = await readSession(request);
  if (!user) return json(response, 401, { error: "Please sign in." });
  const body = await readJson(request);
  const displayName = String(body.name || user.display_name).trim().slice(0, 120);
  const profileImage = String(body.profileImage || "").trim().slice(0, 2000);
  if (!displayName) return json(response, 400, { error: "Add your display name." });
  const result = await query("UPDATE users SET display_name=$1, profile_image=$2, updated_at=NOW() WHERE id=$3 RETURNING id,email,display_name,role,email_verified_at,profile_image", [displayName, profileImage, user.id]);
  return json(response, 200, { user: publicUser(result.rows[0]) });
}

export async function handleAuthRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api/auth/")) return false;
  try {
    if (!databaseConfigured())
      return json(response, 503, {
        error: "Account service is not configured yet. Please try again after the database setup is complete.",
      });
    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      await session(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      await register(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      await login(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      await logout(request, response);
      return true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/auth/profile") { await updateProfile(request, response); return true; }
    return json(response, 404, { error: "Authentication endpoint not found." });
  } catch (error) {
    return json(response, error.status || 500, {
      error: error.message || "The account service could not process your request.",
    });
  }
}
