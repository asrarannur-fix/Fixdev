/**
 * Audit Controller — DB-backed (Postgres).
 * Replaces the previous in-memory array which was lost on every restart.
 *
 * Table expected (already in postgresql-schema.sql):
 *   audit_logs(id, timestamp, endpoint, method, tenant_id, branch_id,
 *              is_valid_tenant, is_valid_branch, verified, client_ip)
 */
import type { Request, Response, NextFunction } from "express";
import { dbQuery } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

export interface ApiAuditEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  tenantId: string;
  branchId: string;
  isValidTenant: boolean;
  isValidBranch: boolean;
  verified: boolean;
  clientIp: string;
}

// ---------------------------------------------------------------------------
// Middleware — runs on every /api/* request
// ---------------------------------------------------------------------------

export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip audit of the audit endpoint itself (feedback loop)
  if (!req.path.startsWith("/api/") || req.path.includes("/api/admin/audit-trail")) {
    return next();
  }

  const rawTenantId =
    ((req.headers["x-tenant-id"] as string) ||
      (req.query.tenant_id as string) ||
      req.body?.tenant_id ||
      req.body?.tenantId ||
      "unknown") as string;

  const rawBranchId =
    ((req.headers["x-branch-id"] as string) ||
      (req.query.branch_id as string) ||
      req.body?.branch_id ||
      req.body?.branchId ||
      "unknown") as string;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const tenantId = uuidPattern.test(rawTenantId) ? rawTenantId : null;
  const branchId = uuidPattern.test(rawBranchId) ? rawBranchId : null;
  const isValidTenant = Boolean(tenantId);
  const isValidBranch = Boolean(branchId);
  const verified = isValidTenant;

  const clientIp =
    ((req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "127.0.0.1");

  // Fire-and-forget — never block the request
  const action = `${req.method} ${req.path.slice(0, 50)}`;
  const details = `Client IP: ${clientIp}, method: ${req.method}, path: ${req.path}`;
  const category = "API";
  const riskLevel = req.method === "DELETE" ? "HIGH" : req.method === "POST" || req.method === "PUT" || req.method === "PATCH" ? "MEDIUM" : "LOW";

  if (tenantId) {
    dbQuery(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, details, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
      [tenantId, req.authActor?.userId || null, action, details],
    ).catch((err) => {
      logger.warn({ err: err.message }, "[audit] Failed to persist audit entry");
    });
  }

  next();
};

// ---------------------------------------------------------------------------
// GET /api/admin/audit-trail
// ---------------------------------------------------------------------------

export const getAuditTrail = async (req: Request, res: Response) => {
  const requestedTenantId = req.query.tenantId as string | undefined;
  const tenantId = req.authActor?.role === "SUPER_ADMIN"
    ? requestedTenantId
    : req.authActor?.tenantId;

  if (req.authActor?.role !== "SUPER_ADMIN" && !tenantId) {
    return res.status(403).json({ error: "Tenant audit scope is unavailable." });
  }
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      params.push(tenantId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const result = await dbQuery(
      `SELECT id, timestamp, endpoint, method,
              tenant_id as "tenantId", branch_id as "branchId",
              is_valid_tenant as "isValidTenant", is_valid_branch as "isValidBranch",
              verified, client_ip as "clientIp"
       FROM audit_logs
       ${where}
       ORDER BY timestamp DESC
       LIMIT $${idx}`,
      params,
    );

    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err: err.message }, "[audit] getAuditTrail failed");
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/audit-trail/clear  — requires admin token (see route)
// ---------------------------------------------------------------------------

export const clearAuditTrail = async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId as string | undefined;

  try {
    if (tenantId) {
      await dbQuery(`DELETE FROM audit_logs WHERE tenant_id = $1`, [tenantId]);
      logger.info({ tenantId }, "[audit] Audit logs cleared for tenant");
    } else {
      await dbQuery(`TRUNCATE TABLE audit_logs`);
      logger.info("[audit] All audit logs cleared");
    }
    res.json({ status: "success", message: "Audit logs cleared." });
  } catch (err: any) {
    logger.error({ err: err.message }, "[audit] clearAuditTrail failed");
    res.status(500).json({ error: err.message });
  }
};
