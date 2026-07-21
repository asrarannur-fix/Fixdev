import { Request, Response } from "express";
import { getPool } from "../../lib/db.js";
import { toApiResponse } from "../utils/responseTransform.js";

async function withDb<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); }
}

const SERVICE_TICKET_ALLOWED_COLUMNS = [
  "id", "tenant_id", "branch_id", "ticket_no", "customer_id", "device_name", "device_serial",
  "device_brand_model", "initial_checklist", "initial_photos", "customer_complaints",
  "tech_diagnosis", "estimated_cost", "customer_approval_status", "assigned_tech_id",
  "parts_used", "qc_score", "qc_checklist", "qc_photos", "qc_notes", "status",
  "warranty_months", "warranty_ends_at", "invoice_id", "is_outsourced",
  "outsourced_vendor_id", "outsourcing_cost", "supplier_rma_id", "down_payment",
  "is_check_only", "warranty_card_sent", "warranty_card_url", "device_category",
  "accessories_left", "custom_accessories", "physical_condition", "screen_lock_pin",
  "estimated_completion_date", "captured_conditions", "provisional_signature",
  "provisional_approved_at", "payment_method", "payment_ref", "payment_proof_name",
  "tempo_days", "handover_at", "estimate_approved", "notes",
  "provisional_signature_name", "dynamic_fields", "technician_notes", "qc_status",
  "internal_discussions", "repair_start_time", "repair_end_time", "tech_pre_checklist",
  "tech_post_checklist", "parts_requested", "storage_location_id", "created_at", "updated_at"
];

export function sanitizePayloadForTable(table: string, data: any, allowedColumns: string[]) {
  if (!data || typeof data !== "object") return {};
  const columns = allowedColumns;
  const normalized: Record<string, any> = {};

  Object.entries(data).forEach(([rawKey, value]) => {
    const snakeKey = rawKey.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    const directMatch = columns.includes(snakeKey);
    const camelMatch = columns.includes(rawKey);
    const selectedKey = directMatch ? snakeKey : camelMatch ? rawKey : null;
    if (!selectedKey) return;
    normalized[selectedKey] = value;
  });

  if (table === "service_tickets" && !normalized.tenant_id) {
    normalized.tenant_id = data.tenantId || data.tenant_id || "";
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Column whitelist cache — reflects the real DB schema so sanitizePayloadForTable
// never silently drops fields for tables without a hand-maintained column list.
// ---------------------------------------------------------------------------

const tableColumnsCache = new Map<string, string[]>();

export async function getTableColumns(table: string): Promise<string[]> {
  const cached = tableColumnsCache.get(table);
  if (cached) return cached;

  const columns = await withDb(async (client) => {
    const result = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    return result.rows.map((row: any) => row.column_name as string);
  });

  tableColumnsCache.set(table, columns);
  return columns;
}

async function ensureServiceTicketColumns() {
  await withDb(async (client) => {
    const columns = [
      { name: "device_serial", definition: "TEXT" },
      { name: "initial_checklist", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "initial_photos", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "tech_diagnosis", definition: "TEXT" },
      { name: "customer_approval_status", definition: "TEXT DEFAULT 'PENDING'" },
      { name: "assigned_tech_id", definition: "UUID" },
      { name: "parts_used", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "qc_score", definition: "NUMERIC DEFAULT 0" },
      { name: "qc_checklist", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "qc_photos", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "qc_notes", definition: "TEXT" },
      { name: "warranty_months", definition: "INTEGER DEFAULT 0" },
      { name: "warranty_ends_at", definition: "TIMESTAMP" },
      { name: "invoice_id", definition: "TEXT" },
      { name: "is_outsourced", definition: "BOOLEAN DEFAULT FALSE" },
      { name: "outsourced_vendor_id", definition: "TEXT" },
      { name: "outsourcing_cost", definition: "NUMERIC DEFAULT 0" },
      { name: "supplier_rma_id", definition: "TEXT" },
      { name: "down_payment", definition: "NUMERIC DEFAULT 0" },
      { name: "is_check_only", definition: "BOOLEAN DEFAULT FALSE" },
      { name: "warranty_card_sent", definition: "BOOLEAN DEFAULT FALSE" },
      { name: "warranty_card_url", definition: "TEXT" },
      { name: "device_category", definition: "TEXT" },
      { name: "accessories_left", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "custom_accessories", definition: "TEXT" },
      { name: "physical_condition", definition: "TEXT" },
      { name: "screen_lock_pin", definition: "TEXT" },
      { name: "estimated_completion_date", definition: "TEXT" },
      { name: "captured_conditions", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "provisional_signature", definition: "TEXT" },
      { name: "provisional_approved_at", definition: "TIMESTAMP" },
      { name: "payment_method", definition: "TEXT" },
      { name: "payment_ref", definition: "TEXT" },
      { name: "payment_proof_name", definition: "TEXT" },
      { name: "tempo_days", definition: "INTEGER DEFAULT 0" },
      { name: "handover_at", definition: "TIMESTAMP" },
      { name: "estimate_approved", definition: "BOOLEAN DEFAULT FALSE" },
      { name: "notes", definition: "TEXT" },
      { name: "provisional_signature_name", definition: "TEXT" },
      { name: "dynamic_fields", definition: "JSONB DEFAULT '{}'::jsonb" },
      { name: "technician_notes", definition: "TEXT" },
      { name: "qc_status", definition: "TEXT" },
      { name: "internal_discussions", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "repair_start_time", definition: "TIMESTAMP" },
      { name: "repair_end_time", definition: "TIMESTAMP" },
      { name: "tech_pre_checklist", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "tech_post_checklist", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "parts_requested", definition: "JSONB DEFAULT '[]'::jsonb" },
      { name: "storage_location_id", definition: "TEXT" },
      { name: "updated_at", definition: "TIMESTAMP DEFAULT NOW()" },
    ];

    for (const column of columns) {
      await client.query(`ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`);
    }
  });
}

async function syncProductWarehouseStock(tenantId: string, productId: string, warehouseStock: Record<string, unknown>) {
  const entries = Object.entries(warehouseStock || {});
  if (!entries.length) return;

  await withDb(async (client) => {
    for (const [warehouseId, rawQuantity] of entries) {
      const quantity = Number(rawQuantity);
      if (!warehouseId || !Number.isFinite(quantity) || quantity < 0) {
        throw Object.assign(new Error("Stok gudang harus berupa angka non-negatif."), { status: 422 });
      }
      const result = await client.query(
        `INSERT INTO product_stock (product_id, warehouse_id, quantity)
         SELECT $1, $2, $3
         WHERE EXISTS (
           SELECT 1
           FROM products p
           JOIN warehouses w ON w.tenant_id = p.tenant_id
           WHERE p.id = $1 AND p.tenant_id = $4 AND w.id = $2
         )
         ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [productId, warehouseId, quantity, tenantId],
      );
      if (result.rowCount !== 1) {
        throw Object.assign(new Error("Produk atau gudang tidak ditemukan pada tenant aktif."), { status: 422 });
      }
    }
  });
}

export async function moduleRecordsGetHandler(req: Request, res: Response) {
  const tenantId = String(req.tenantId || "");
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  try {
    const rows = await withDb(c => c.query(`select * from module_records where tenant_id = $1 and deleted_at is null`, [tenantId]).then((r: any) => r.rows));
    res.json(toApiResponse(rows));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function moduleRecordsPostHandler(req: Request, res: Response) {
  const { module, recordId, payload, action } = req.body || {};
  const tenantId = req.tenantId;
  if (!tenantId || !module || !recordId) return res.status(422).json({ error: "tenantId, module, recordId required" });
  try {
    const now = new Date().toISOString();
    const rows = await withDb(async (client) => {
      if (action === "delete") {
        return (await client.query(
          `update module_records set deleted_at = $1, updated_at = $1 where tenant_id = $2 and module = $3 and record_id = $4 returning id`,
          [now, tenantId, module, recordId]
        )).rows;
      }
      return (await client.query(
        `insert into module_records (tenant_id, module, record_id, payload, updated_at, created_at) values ($1,$2,$3,$4,$5,$5)
         on conflict (tenant_id, module, record_id) do update set payload = $4, updated_at = $5, deleted_at = null returning id`,
        [tenantId, module, recordId, JSON.stringify(payload), now]
      )).rows;
    });
    res.json({ success: true, id: rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

const ALLOWED_TABLES = new Set([
  "tenants",
  "branches", "warehouses", "customers", "products", "service_tickets",
  "pos_shifts", "pos_transactions", "coa_accounts", "journal_entries",
  "module_records",
]);

export async function dataSyncHandler(req: Request, res: Response) {
  const { table, action, data } = req.body;
  if (!table || !action || !data) return res.status(422).json({ error: "table, action, data required" });
  if (!ALLOWED_TABLES.has(table)) return res.status(403).json({ error: "Table not allowed for direct sync" });
  // req.tenantId is resolved by requireTenantScope, which also allows SUPER_ADMIN
  // to act on a different tenant than their own (e.g. from the billing admin panel).
  const tenantId = (req as any).tenantId || "";
  if (!tenantId) return res.status(403).json({ error: "Tenant not resolved" });
  if (table === "tenants") {
    if (action !== "update") {
      return res.status(403).json({ error: "Tenant creation/deletion is not allowed through direct sync" });
    }
    if (String(data.id || "") !== String(tenantId)) {
      return res.status(403).json({ error: "Cross-tenant update is forbidden" });
    }
  }

  try {
    if (table === "service_tickets") {
      await ensureServiceTicketColumns();
    }

    const allowedColumns = table === "service_tickets"
      ? SERVICE_TICKET_ALLOWED_COLUMNS
      : await getTableColumns(table);

    const sanitizedPayload = sanitizePayloadForTable(table, data, allowedColumns);
    const safePayload = table === "tenants"
      ? {
          id: tenantId,
          ...(sanitizedPayload.settings !== undefined ? { settings: sanitizedPayload.settings } : {}),
          ...(sanitizedPayload.branding !== undefined ? { branding: sanitizedPayload.branding } : {}),
        }
      : sanitizedPayload;
    // `tenants` is the scope root and deliberately has no tenant_id column.
    // All other tables are tenant-owned and must be forced to the authenticated
    // request scope rather than trusting a client-supplied tenant_id.
    const payload = table === "tenants"
      ? safePayload
      : { ...safePayload, tenant_id: tenantId };
    // pg does not serialize nested JS values for JSON/JSONB parameters.
    // Convert only structured values; scalar columns keep native types.
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== null && typeof payload[key] === "object") {
        payload[key] = JSON.stringify(payload[key]);
      }
    });
    const idCol = "id";

    if (action === "insert") {

      const cols = Object.keys(payload);
      const vals = cols.map((_, i) => `$${i + 1}`);
      const query = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${vals.join(",")}) ON CONFLICT (id) DO NOTHING RETURNING id`;
      const result = await withDb(async (c) => c.query(query, Object.values(payload)));
      const insertedId = (result as any).rows[0]?.id;
      if (table === "journal_entries" && data.lines?.length) {
        for (const ln of data.lines.map((line: any) => ({ id: line.id || `fallback-${Date.now()}-${Date.now().toString(36)}`, journal_entry_id: data.id, account_id: line.accountId, debit: line.debit || 0, credit: line.credit || 0 }))) {
          const lCols = Object.keys(ln);
          const lVals = lCols.map((_, i) => `$${i + 1}`);
          await withDb(c => c.query(`INSERT INTO journal_lines (${lCols.join(",")}) SELECT ${lVals.join(",")} WHERE EXISTS (SELECT 1 FROM journal_entries WHERE id = $${lCols.length + 1} AND tenant_id = $${lCols.length + 2}) ON CONFLICT (id) DO NOTHING`, [...Object.values(ln), data.id, tenantId]));
        }
      }
      if (table === "products" && data.warehouseStock) await syncProductWarehouseStock(tenantId, String(data.id), data.warehouseStock);
      res.json({ success: true, id: insertedId });
    } else if (action === "update") {
      const idVal = payload[idCol];
      delete payload[idCol];
      if (table !== "tenants") delete payload.tenant_id;
      const cols = Object.keys(payload);
      if (cols.length === 0) return res.status(422).json({ error: "No updatable fields in payload" });
      const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(",");
      const params = table === "tenants"
        ? [...Object.values(payload), idVal]
        : [...Object.values(payload), idVal, tenantId];
      const scopeClause = table === "tenants"
        ? `id = $${cols.length + 1}`
        : `id = $${cols.length + 1} AND tenant_id = $${cols.length + 2}`;
      const query = `UPDATE ${table} SET ${setClause} WHERE ${scopeClause} RETURNING id`;
      const result = await withDb(c => c.query(query, params));
      if (!(result as any).rows[0]) return res.status(404).json({ error: "Record not found" });
      if (table === "products" && data.warehouseStock) await syncProductWarehouseStock(tenantId, String(idVal), data.warehouseStock);
      res.json({ success: true, id: (result as any).rows[0].id });
    } else if (action === "delete") {
      const idVal = payload[idCol];
      const result = await withDb(async (c) => c.query(
        table === "tenants"
          ? `DELETE FROM ${table} WHERE id = $1 RETURNING id`
          : `DELETE FROM ${table} WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        table === "tenants" ? [idVal] : [idVal, tenantId],
      ));
      if (!(result as any).rows[0]) return res.status(404).json({ error: "Record not found" });
      res.json({ success: true, id: (result as any).rows[0].id });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
