/**
 * Shared PostgreSQL connection pool.
 * Single instance reused across all controllers and routes.
 */
import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

// Mock implementations for testing
let _mockDbQueryImpl: Function | null = null;
let _mockDbTransactionImpl: Function | null = null;

// Function to inject mock implementations for testing
export function __setMockDb(queryImpl: Function, transactionImpl: Function) {
    _mockDbQueryImpl = queryImpl;
    _mockDbTransactionImpl = transactionImpl;
}

// Function to reset mocks (for clean test state)
export function __resetMockDb() {
    _mockDbQueryImpl = null;
    _mockDbTransactionImpl = null;
    _pool = null; // Also reset the pool to force re-initialization
}

export function getPool(): InstanceType<typeof Pool> {
  if (_pool) return _pool;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'test' && (_mockDbQueryImpl || _mockDbTransactionImpl)) {
        logger.warn("[db] Using dummy DATABASE_URL in test environment with mocked DB.");
        // Provide a mock pool that uses the injected mock query/transaction functions
        _pool = {
            connect: async () => ({
                query: (sql: string, params: any[]) => {
                    if (_mockDbQueryImpl) return _mockDbQueryImpl(sql, params);
                    throw new Error("dbQuery mock not set in test environment");
                },
                release: () => {},
            }),
            on: () => {},
            end: async () => {},
        } as unknown as InstanceType<typeof Pool>;
        return _pool;
    }
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
    if (process.env.NODE_ENV === 'test' && _mockDbQueryImpl) {
        return _mockDbQueryImpl(sql, params);
    }
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
    if (process.env.NODE_ENV === 'test' && _mockDbTransactionImpl) {
        return _mockDbTransactionImpl(fn);
    }
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
