import pg from "pg";

const { Pool } = pg;
let pool;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!databaseConfigured()) {
    const error = new Error(
      "Database is not configured. Add DATABASE_URL to the server environment.",
    );
    error.status = 503;
    throw error;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, values = []) {
  return getPool().query(text, values);
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
}
