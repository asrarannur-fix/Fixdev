/**
 * Shared PostgreSQL connection pool.
 * Single instance reused across all controllers and routes.
 * Uses Supabase Transaction Pooler (port 5432) for production (supports multi-statement transactions).
 */
import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

export function getPool(): InstanceType<typeof Pool> {
  if (_pool) return _pool;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const poolMax = Number(process.env.DB_POOL_MAX || 10);

  _pool = new Pool({
    connectionString: dbUrl,
    ssl: false,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on("error", (err) => {
    logger.error({ err: err.message }, "[db] Idle client error");
  });

  _pool.on("connect", () => {
    logger.debug("[db] New client connected to pool");
  });

  logger.info({ poolMax }, "[db] Shared pool initialized");
  return _pool;
}

/** Run a parameterized query and release the connection automatically. */
export async function dbQuery(sql: string, params?: any[]) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

/** Run multiple statements inside a single transaction. */
export async function dbTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* connection may be lost */ }
    throw err;
  } finally {
    client.release();
  }
}
