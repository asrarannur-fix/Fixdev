/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generic CRUD API plugin.
 *
 * Exposes a self-documenting, tenant-isolated REST surface at /api/crud/:table
 * for every configured resource. Reuses the existing column-whitelist sanitizer
 * and tenant-scope enforcement so behaviour stays consistent with the rest of
 * the platform. Mount once in server.ts — no per-table route boilerplate.
 */

import express from "express";
import { dbQuery } from "../../lib/db.js";
import { toApiResponse } from "../utils/responseTransform.js";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/feature.middleware.js";
import { getTableColumns, sanitizePayloadForTable } from "../controllers/data.controller.js";

export interface CrudResourceConfig {
  /** Physical table name in the public schema. */
  table: string;
  /** Optional subscription feature gate (e.g. "ACCOUNTING"). */
  feature?: string;
  /** Soft-delete via deleted_at instead of hard DELETE. Default: true. */
  softDelete?: boolean;
}

/**
 * Allowed generic CRUD resources. The key is the URL segment (:table) so only
 * explicitly whitelisted tables are ever reachable — table names never come
 * from the client.
 */
export const CRUD_RESOURCES: Record<string, CrudResourceConfig> = {
  customers: { table: "customers" },
  products: { table: "products" },
  service_tickets: { table: "service_tickets" },
  warehouses: { table: "warehouses" },
  branches: { table: "branches" },
  coa_accounts: { table: "coa_accounts", feature: "ACCOUNTING" },
  journal_entries: { table: "journal_entries", feature: "ACCOUNTING" },
  pos_shifts: { table: "pos_shifts" },
  module_records: { table: "module_records" },
};

const RESERVED_QUERY = new Set([
  "page", "limit", "search", "sort", "order", "tenantId", "branchId",
]);

declare global {
  namespace Express {
    interface Request {
      crudCfg?: CrudResourceConfig;
      crudColumns?: string[];
    }
  }
}

/** Validate the :table param, resolve config + columns, enforce feature gate. */
const resolveResource = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = String(req.params.table || "");
  const cfg = CRUD_RESOURCES[key];
  if (!cfg) return res.status(404).json({ error: `Unknown CRUD resource: ${key}` });
  req.crudCfg = cfg;
  try {
    req.crudColumns = await getTableColumns(cfg.table);
  } catch (err: any) {
    return res.status(500).json({ error: `Cannot resolve schema for ${cfg.table}: ${err.message}` });
  }
  if (cfg.feature) return requireFeature(cfg.feature)(req, res, next);
  next();
};

const hasColumn = (cols: string[] | undefined, name: string) => Boolean(cols && cols.includes(name));

/** Build the shared WHERE clause + params for tenant/branch/soft-delete scoping. */
function buildScope(req: express.Request, cfg: CrudResourceConfig, cols: string[], params: any[]) {
  const clauses: string[] = [];
  if (hasColumn(cols, "tenant_id") && req.tenantId) {
    params.push(req.tenantId);
    clauses.push(`tenant_id = $${params.length}`);
  }
  if (hasColumn(cols, "branch_id") && req.branchId) {
    params.push(req.branchId);
    clauses.push(`branch_id = $${params.length}`);
  }
  if ((cfg.softDelete ?? true) && hasColumn(cols, "deleted_at")) {
    clauses.push(`deleted_at IS NULL`);
  }
  return clauses;
}

function buildFilters(req: express.Request, cols: string[], params: any[]) {
  const clauses: string[] = [];
  for (const [key, value] of Object.entries(req.query)) {
    if (RESERVED_QUERY.has(key) || !hasColumn(cols, key) || value === undefined || value === "") continue;
    const vals = Array.isArray(value) ? value : [value];
    if (vals.length === 1) {
      params.push(vals[0]);
      clauses.push(`${key} = $${params.length}`);
    } else {
      const placeholders = vals.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      clauses.push(`${key} IN (${placeholders.join(",")})`);
    }
  }
  return clauses;
}

export async function listCrud(req: express.Request, res: express.Response) {
  const cfg = req.crudCfg!;
  const cols = req.crudColumns!;
  const params: any[] = [];

  const where = [
    ...buildScope(req, cfg, cols, params),
    ...buildFilters(req, cols, params),
  ];

  const search = String(req.query.search || "").trim();
  if (search) {
    const like = `%${search}%`;
    const searchCols = cols.filter((c) => c !== "id" && c !== "tenant_id");
    if (searchCols.length) {
      const orClause = searchCols
        .map((c) => {
          params.push(like);
          return `CAST(${c} AS TEXT) ILIKE $${params.length}`;
        })
        .join(" OR ");
      where.push(`(${orClause})`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return runList(req, res, cfg, cols, whereSql, params);
}

async function runList(
  req: express.Request,
  res: express.Response,
  cfg: CrudResourceConfig,
  cols: string[],
  whereSql: string,
  params: any[],
) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const sortRaw = String(req.query.sort || "id");
  const sortCol = hasColumn(cols, sortRaw) ? sortRaw : "id";
  const order = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const countSql = `SELECT COUNT(*)::int AS total FROM ${cfg.table} ${whereSql}`;
  const countRes = await dbQuery(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  const dataSql = `SELECT * FROM ${cfg.table} ${whereSql} ORDER BY ${sortCol} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const dataRes = await dbQuery(dataSql, [...params, limit, offset]);

  res.json({
    data: dataRes.rows.map(toApiResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getCrud(req: express.Request, res: express.Response) {
  const cfg = req.crudCfg!;
  const cols = req.crudColumns!;
  const params: any[] = [];
  const scope = buildScope(req, cfg, cols, params);
  params.push(req.params.id);
  const where = [...scope, `id = $${params.length}`].join(" AND ");
  const result = await dbQuery(`SELECT * FROM ${cfg.table} WHERE ${where}`, params);
  if (!result.rows[0]) return res.status(404).json({ error: "Record not found" });
  res.json(toApiResponse(result.rows[0]));
}

export async function createCrud(req: express.Request, res: express.Response) {
  const cfg = req.crudCfg!;
  const cols = req.crudColumns!;
  const sanitized = sanitizePayloadForTable(cfg.table, req.body || {}, cols);
  if (hasColumn(cols, "tenant_id") && req.tenantId) sanitized.tenant_id = req.tenantId;
  if (hasColumn(cols, "branch_id") && req.branchId) sanitized.branch_id = req.branchId;

  Object.keys(sanitized).forEach((k) => {
    if (sanitized[k] !== null && typeof sanitized[k] === "object") sanitized[k] = JSON.stringify(sanitized[k]);
  });

  const keys = Object.keys(sanitized);
  if (keys.length === 0) return res.status(422).json({ error: "No valid fields in payload" });

  const colSql = keys.join(",");
  const valSql = keys.map((_, i) => `$${i + 1}`).join(",");
  const result = await dbQuery(
    `INSERT INTO ${cfg.table} (${colSql}) VALUES (${valSql}) RETURNING *`,
    keys.map((k) => sanitized[k]),
  );
  res.status(201).json(toApiResponse(result.rows[0]));
}

export async function updateCrud(req: express.Request, res: express.Response) {
  const cfg = req.crudCfg!;
  const cols = req.crudColumns!;
  const sanitized = sanitizePayloadForTable(cfg.table, req.body || {}, cols);
  delete sanitized.id;
  delete sanitized.tenant_id;
  delete sanitized.branch_id;

  Object.keys(sanitized).forEach((k) => {
    if (sanitized[k] !== null && typeof sanitized[k] === "object") sanitized[k] = JSON.stringify(sanitized[k]);
  });

  const keys = Object.keys(sanitized);
  if (keys.length === 0) return res.status(422).json({ error: "No updatable fields in payload" });

  const params: any[] = [];
  const scope = buildScope(req, cfg, cols, params);
  const setSql = keys.map((k) => {
    params.push(sanitized[k]);
    return `${k} = $${params.length}`;
  }).join(",");
  params.push(req.params.id);
  const where = [...scope, `id = $${params.length}`].join(" AND ");

  const result = await dbQuery(`UPDATE ${cfg.table} SET ${setSql} WHERE ${where} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ error: "Record not found" });
  res.json(toApiResponse(result.rows[0]));
}

export async function deleteCrud(req: express.Request, res: express.Response) {
  const cfg = req.crudCfg!;
  const cols = req.crudColumns!;
  const params: any[] = [];
  const scope = buildScope(req, cfg, cols, params);
  params.push(req.params.id);
  const where = [...scope, `id = $${params.length}`].join(" AND ");

  let result;
  if ((cfg.softDelete ?? true) && hasColumn(cols, "deleted_at")) {
    result = await dbQuery(`UPDATE ${cfg.table} SET deleted_at = now() WHERE ${where} RETURNING id`, params);
  } else {
    result = await dbQuery(`DELETE FROM ${cfg.table} WHERE ${where} RETURNING id`, params);
  }
  if (!result.rows[0]) return res.status(404).json({ error: "Record not found" });
  res.json({ success: true, id: result.rows[0].id });
}

export function createCrudRouter(): express.Router {
  const router = express.Router();
  router.use(requireSupabaseJwt, requireTenantScope, resolveResource);

  router.get("/:table", listCrud);
  router.get("/:table/:id", getCrud);
  router.post("/:table", createCrud);
  router.put("/:table/:id", updateCrud);
  router.delete("/:table/:id", deleteCrud);

  return router;
}
