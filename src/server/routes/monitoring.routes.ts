/**
 * Monitoring Routes — uses the shared DB pool from src/lib/db.ts.
 * Previously created a new Pool() on every health check request,
 * which exhausted connections. Now reuses the singleton pool.
 */
import express from "express";
import { getPool, dbQuery } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

const router = express.Router();
const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

// ---------------------------------------------------------------------------
// GET /api/monitoring/health — detailed health with DB connectivity
// ---------------------------------------------------------------------------
router.get("/health", async (req, res) => {
  requestCount++;
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  let poolStatus = "unchecked";
  try {
    const pool = getPool();
    const client = await pool.connect();
    const dbResult = await client.query("SELECT 1 AS ok");
    client.release();
    poolStatus = dbResult.rows[0]?.ok === 1 ? "connected" : "error";
  } catch {
    poolStatus = "disconnected";
  }

  const dbUrl = process.env.SUPABASE_DB_URL || "";

  res.json({
    status: poolStatus === "connected" ? "healthy" : "degraded",
    uptime: `${uptime}s`,
    startedAt: new Date(startTime).toISOString(),
    requests: { total: requestCount, errors: errorCount },
    memory: {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
    },
    database: {
      status: poolStatus,
      url: dbUrl.replace(/\/\/.*@/, "//***:***@"),
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// ---------------------------------------------------------------------------
// GET /api/monitoring/health/db — per-table row counts + query latency
// ---------------------------------------------------------------------------
router.get("/health/db", async (req, res) => {
  requestCount++;

  const queries = [
    { name: "tenants",          sql: "SELECT COUNT(*) FROM tenants" },
    { name: "customers",        sql: "SELECT COUNT(*) FROM customers" },
    { name: "products",         sql: "SELECT COUNT(*) FROM products" },
    { name: "service_tickets",  sql: "SELECT COUNT(*) FROM service_tickets" },
    { name: "pos_transactions", sql: "SELECT COUNT(*) FROM pos_transactions" },
  ];

  const results: any[] = [];
  let allOk = true;

  // Reuse a single client from the shared pool for all queries
  const pool = getPool();
  let client: any;
  try {
    client = await pool.connect();
    for (const q of queries) {
      const start = Date.now();
      try {
        const result = await client.query(q.sql);
        results.push({
          table: q.name,
          rowCount: parseInt(result.rows[0]?.count || "0"),
          elapsedMs: Date.now() - start,
          status: "ok",
        });
      } catch (err: any) {
        allOk = false;
        results.push({ table: q.name, status: "error", error: err.message });
      }
    }
  } catch (err: any) {
    allOk = false;
    results.push({ error: "Connection failed: " + err.message });
  } finally {
    client?.release();
  }

  res.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    queries: results,
  });
});

// ---------------------------------------------------------------------------
// GET /api/monitoring/health/ping — ultra-lightweight liveness probe
// ---------------------------------------------------------------------------
router.get("/health/ping", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Error middleware
router.use((err: any, _req: any, res: any, _next: any) => {
  errorCount++;
  logger.error({ err: err.message }, "[monitoring] Internal error");
  res.status(500).json({ error: "Monitoring internal error" });
});

export default router;
