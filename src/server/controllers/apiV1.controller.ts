/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ==========================================
 * API V1 CONTROLLER — PRODUCTION VERSION
 * ==========================================
 * All data is now persisted to PostgreSQL via pg.Pool.
 * In-memory caches have been removed.
 * Auth tokens are stored in the database, not in memory.
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { getPool } from "../../lib/db.js";

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const customerSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(255),
  email: z.string().email({ message: "Invalid email format." }).optional().nullable(),
  phone: z.string().min(5, { message: "Phone must be at least 5 digits." }).max(50),
  address: z.string().max(1000).optional().nullable(),
  segment: z.enum(["PERSONAL", "CORPORATE"]).default("PERSONAL"),
  companyName: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const customerUpdateSchema = customerSchema.partial();

export const ticketSchema = z.object({
  customerId: z.string().uuid({ message: "Invalid Customer ID format (UUID required)." }),
  deviceName: z.string().min(1, { message: "Device name is required." }).max(255),
  deviceBrandModel: z.string().max(255).optional().nullable(),
  customerComplaints: z.string().min(1, { message: "Customer complaints are required." }),
  estimatedCost: z.number().nonnegative().optional().default(0),
  deviceCategory: z.string().max(100).optional().nullable(),
  accessoriesLeft: z.array(z.string()).optional().default([]),
});

export const ticketUpdateSchema = z.object({
  status: z.string().max(100).optional(),
  techDiagnosis: z.string().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional(),
  assignedTechId: z.string().uuid().optional().nullable(),
  warrantyMonths: z.number().int().nonnegative().optional(),
});

export const inventorySchema = z.object({
  name: z.string().min(1, { message: "Product name is required." }).max(255),
  sku: z.string().min(1, { message: "SKU is required." }).max(100),
  barcode: z.string().max(100).optional().nullable(),
  category: z.enum(["SPAREPART", "AKSESORIS", "JASA", "LAINNYA"]),
  purchaseCost: z.number().nonnegative({ message: "Purchase cost cannot be negative." }),
  sellPrice: z.number().nonnegative({ message: "Sell price cannot be negative." }),
  unit: z.string().default("pcs"),
  stockQty: z.number().int().nonnegative().optional().default(0),
});

export const inventoryUpdateSchema = inventorySchema.partial();

export const saleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid().optional().nullable(),
      name: z.string().optional(),
      quantity: z.number().int().positive({ message: "Quantity must be at least 1." }),
      unitPrice: z.number().nonnegative().optional(),
    })
  ).min(1, { message: "At least 1 sale item is required." }),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "QRIS", "EDC", "E_WALLET", "DEPOSIT", "TEMPO"]),
  discountAmount: z.number().nonnegative().optional().default(0),
  amountPaid: z.number().nonnegative().optional(),
});

// Middleware helper for controller validation
export const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        err.issues.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res.status(422).json({
          message: "The given data was invalid.",
          errors,
        });
      }
      next(err);
    }
  };
};

// ==========================================
// 1. SHARED DATABASE POOL (connection reuse)
// ==========================================

// Helper: run a query and always release the connection
async function dbQuery(sql: string, params?: any[]) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ==========================================
// 2. PERSONAL ACCESS TOKENS STORE (DB-backed)
// ==========================================

export interface PersonalAccessToken {
  id: string;
  token: string;
  name: string;
  abilities: string[];
  lastUsedAt?: string;
  createdAt: string;
  tenantId: string;
  branchId: string;
}

// Seed default developer tokens — ONLY active when ALLOW_DEV_API_TOKENS=true.
// ponytail: remove entirely when real token provisioning is in place.
const allowDevTokens = process.env.ALLOW_DEV_API_TOKENS === "true";
const SEED_TOKENS_FALLBACK: PersonalAccessToken[] = allowDevTokens
  ? [
      {
        id: "tok-owner-1",
        token: "km_sanctum_token_owner",
        name: "Owner Production Sync Key",
        abilities: ["*"],
        createdAt: new Date().toISOString(),
        tenantId: "bd7725f3-02cf-4944-bdc9-80ba642a2c55",
        branchId: "bd7725f3-0001-4000-8000-000000000001",
      },
      {
        id: "tok-read-only",
        token: "km_sanctum_token_read_only",
        name: "Third-Party Logistics Key",
        abilities: ["customers:read", "inventory:read"],
        createdAt: new Date().toISOString(),
        tenantId: "bd7725f3-02cf-4944-bdc9-80ba642a2c55",
        branchId: "bd7725f3-0001-4000-8000-000000000001",
      },
    ]
  : [];

// Lookup token from DB (with in-memory fallback when dev tokens enabled)
async function findToken(tokenValue: string): Promise<PersonalAccessToken | null> {
  // Check dev tokens first (only when ALLOW_DEV_API_TOKENS=true)
  if (allowDevTokens) {
    const seed = SEED_TOKENS_FALLBACK.find((t) => t.token === tokenValue);
    if (seed) return seed;
  }

  // Check DB
  try {
    const tokenHash = createHash("sha256").update(tokenValue).digest("hex");
    const result = await dbQuery(
      `SELECT id, name, abilities, last_used_at as "lastUsedAt", created_at as "createdAt",
              tenant_id as "tenantId", branch_id as "branchId"
       FROM api_tokens
       WHERE (token_hash = $1 OR (token_hash IS NULL AND token = $2))
         AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
       LIMIT 1`,
      [tokenHash, tokenValue],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      abilities: typeof row.abilities === "string" ? JSON.parse(row.abilities) : row.abilities,
    };
  } catch {
    return null;
  }
}

// ==========================================
// 3. SANCTUM AUTH & ABILITIES MIDDLEWARES
// ==========================================

export const sanctumAuthMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthenticated.",
      error: "Authorization header with 'Bearer <token>' is missing or invalid.",
    });
  }

  const tokenValue = authHeader.split(" ")[1];
  const tokenRecord = await findToken(tokenValue);

  if (!tokenRecord) {
    return res.status(401).json({
      message: "Unauthenticated.",
      error: "The provided Personal Access Token is invalid or has been revoked.",
    });
  }

  // Update last used timestamp without persisting or logging the plaintext token.
  const tokenHash = createHash("sha256").update(tokenValue).digest("hex");
  dbQuery("UPDATE api_tokens SET last_used_at = now() WHERE token_hash = $1 OR (token_hash IS NULL AND token = $2)", [tokenHash, tokenValue]).catch(() => {});

  req.sanctumToken = tokenRecord;
  req.tenantId = tokenRecord.tenantId;
  req.branchId = tokenRecord.branchId;

  next();
};

export const checkAbilities = (abilitiesRequired: string[]) => {
  return (req: any, res: any, next: any) => {
    const token = req.sanctumToken as PersonalAccessToken;
    if (!token) return res.status(401).json({ message: "Unauthenticated." });

    if (token.abilities.includes("*")) return next();

    const hasRequired = abilitiesRequired.every((a) => token.abilities.includes(a));
    if (!hasRequired) {
      return res.status(403).json({
        message: "Forbidden.",
        error: `Your token lacks: [${abilitiesRequired.join(", ")}]. Has: [${token.abilities.join(", ")}].`,
      });
    }
    next();
  };
};

// ==========================================
// 4. AUTH & TOKEN CONTROLLER HANDLERS
// ==========================================

export const createToken = async (req: any, res: any) => {
  const { tokenName, abilities } = req.body || {};
  const tenantId = req.tenantId;
  if (!tenantId || !req.authActor) {
    return res.status(403).json({ message: "A verified tenant identity is required." });
  }

  const allowedAbilities = new Set([
    "customers:read", "customers:write", "tickets:read", "tickets:write",
    "inventory:read", "inventory:write", "sales:read", "sales:write",
  ]);
  const requestedAbilities = Array.isArray(abilities) ? abilities : ["customers:read"];
  const tokenAbilities = requestedAbilities.filter((ability: unknown): ability is string =>
    typeof ability === "string" && allowedAbilities.has(ability),
  );
  if (tokenAbilities.length === 0 || tokenAbilities.length !== requestedAbilities.length) {
    return res.status(422).json({ message: "One or more requested token abilities are invalid." });
  }

  let branchId: string | null = null;
  try {
    const branchResult = await dbQuery(
      `SELECT branch_id FROM user_branches WHERE user_id = $1 LIMIT 1`,
      [req.authActor.userId],
    );
    branchId = branchResult.rows[0]?.branch_id || null;
  } catch {}

  const secret = randomBytes(32).toString("base64url");
  const tokenString = `km_pat_${secret}`;
  const tokenHash = createHash("sha256").update(tokenString).digest("hex");
  const tokenId = randomUUID();
  const resolvedName = String(tokenName || `API Token for ${req.authActor.email || req.authActor.userId}`).slice(0, 100);

  try {
    await dbQuery(
      `INSERT INTO api_tokens
         (id, token, token_hash, token_prefix, name, abilities, tenant_id, branch_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, now())`,
      [tokenId, tokenString, tokenHash, tokenString.slice(0, 16), resolvedName, JSON.stringify(tokenAbilities), tenantId, branchId, req.authActor.userId],
    );
  } catch (err: any) {
    return res.status(500).json({ message: "Token could not be persisted.", error: err.message });
  }

  return res.status(201).json({
    token: tokenString,
    token_type: "Bearer",
    abilities: tokenAbilities,
    name: resolvedName,
    tenantId,
    branchId,
    createdAt: new Date().toISOString(),
  });
};

export const getAuthMe = async (req: any, res: any) => {
  const token = req.sanctumToken as PersonalAccessToken | undefined;
  if (!token) return res.status(401).json({ message: "Unauthenticated." });

  res.json({
    authenticated: true,
    token: {
      id: token.id,
      name: token.name,
      abilities: token.abilities,
      lastUsedAt: token.lastUsedAt || null,
      createdAt: token.createdAt,
    },
    tenantId: req.tenantId,
    branchId: req.branchId,
  });
};

export const listTokens = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  try {
    const result = await dbQuery(
      `SELECT id, name, abilities, last_used_at as "lastUsedAt", created_at as "createdAt", tenant_id as "tenantId"
       FROM api_tokens WHERE tenant_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
      [tenantId],
    );
    res.json(result.rows);
  } catch {
    res.json([]);
  }
};

export const revokeToken = async (req: any, res: any) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  try {
    const result = await dbQuery(
      `UPDATE api_tokens SET revoked_at = now() WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Token not found." });
    }
    res.json({ success: true, message: "Personal Access Token successfully revoked." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 5. CUSTOMER CONTROLLERS (DB queries)
// ==========================================

export const getCustomers = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { search, segment } = req.query;

  const conditions: string[] = ["tenant_id = $1"];
  const params: any[] = [tenantId];
  let idx = 2;

  if (segment) {
    conditions.push(`segment = $${idx++}`);
    params.push((segment as string).toUpperCase());
  }

  if (search) {
    const q = `%${search}%`;
    conditions.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR company_name ILIKE $${idx})`,
    );
    params.push(q);
    idx++;
  }

  const where = conditions.join(" AND ");
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", name, email, phone, address, segment,
              company_name as "companyName", npwp, loyalty_points as "loyaltyPoints",
              store_credit as "storeCredit", referral_code as "referralCode",
              sales_pipeline_stage as "salesPipelineStage", notes,
              created_at as "createdAt"
       FROM customers WHERE ${where}
       ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    res.json({ data: result.rows, meta: { total: result.rows.length, tenantId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCustomerById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", name, email, phone, address, segment,
              company_name as "companyName", loyalty_points as "loyaltyPoints",
              store_credit as "storeCredit", sales_pipeline_stage as "salesPipelineStage",
              notes, created_at as "createdAt"
       FROM customers WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer resource not found." });
    }
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCustomer = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { name, email, phone, address, segment, companyName, notes } = req.body;

  if (!name || !phone) {
    return res.status(422).json({
      message: "Validation Error",
      errors: {
        name: !name ? ["The name field is required."] : [],
        phone: !phone ? ["The phone field is required."] : [],
      },
    });
  }

  try {
    const result = await dbQuery(
      `INSERT INTO customers (tenant_id, name, email, phone, address, segment, company_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id as "tenantId", name, email, phone, address, segment,
                 company_name as "companyName", notes, created_at as "createdAt"`,
      [
        tenantId,
        name,
        email || null,
        phone,
        address || null,
        (segment || "PERSONAL").toUpperCase(),
        companyName || null,
        notes || null,
      ],
    );
    res.status(201).json({ data: result.rows[0], message: "Customer created successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCustomer = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const { name, email, phone, address, segment, companyName, notes } = req.body;

  try {
    const result = await dbQuery(
      `UPDATE customers SET
         name = COALESCE($3, name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         address = COALESCE($6, address),
         segment = COALESCE($7, segment),
         company_name = COALESCE($8, company_name),
         notes = COALESCE($9, notes)
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name, email, phone, address, segment, company_name as "companyName", notes`,
      [id, tenantId, name, email, phone, address, segment, companyName, notes],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.json({ data: result.rows[0], message: "Customer updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCustomer = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      "DELETE FROM customers WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.json({ message: "Customer successfully deleted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 6. SERVICE TICKET CONTROLLERS (DB queries)
// ==========================================

export const getTickets = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { status, customerId, search } = req.query;

  const conditions: string[] = ["tenant_id = $1", "branch_id = $2"];
  const params: any[] = [tenantId, branchId];
  let idx = 3;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push((status as string).toUpperCase());
  }
  if (customerId) {
    conditions.push(`customer_id = $${idx++}`);
    params.push(customerId);
  }
  if (search) {
    const q = `%${search}%`;
    conditions.push(`(ticket_no ILIKE $${idx} OR device_name ILIKE $${idx} OR device_brand_model ILIKE $${idx})`);
    params.push(q);
    idx++;
  }

  const where = conditions.join(" AND ");
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", ticket_no as "ticketNo",
              customer_id as "customerId", device_name as "deviceName",
              device_brand_model as "deviceBrandModel", device_serial as "deviceSerial",
              customer_complaints as "customerComplaints", tech_diagnosis as "techDiagnosis",
              estimated_cost as "estimatedCost", customer_approval_status as "customerApprovalStatus",
              assigned_tech_id as "assignedTechId", status, warranty_months as "warrantyMonths",
              is_outsourced as "isOutsourced", created_at as "createdAt"
       FROM service_tickets WHERE ${where}
       ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    res.json({ data: result.rows, meta: { total: result.rows.length, tenantId, branchId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTicketById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", ticket_no as "ticketNo",
              customer_id as "customerId", device_name as "deviceName",
              device_brand_model as "deviceBrandModel", device_serial as "deviceSerial",
              customer_complaints as "customerComplaints", tech_diagnosis as "techDiagnosis",
              estimated_cost as "estimatedCost", customer_approval_status as "customerApprovalStatus",
              assigned_tech_id as "assignedTechId", status, warranty_months as "warrantyMonths",
              is_outsourced as "isOutsourced", created_at as "createdAt",
              initial_checklist as "initialChecklist", initial_photos as "initialPhotos"
       FROM service_tickets WHERE id = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1`,
      [id, tenantId, branchId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Service ticket not found." });
    }
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createTicket = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { customerId, deviceName, deviceBrandModel, customerComplaints, estimatedCost, deviceCategory, accessoriesLeft } = req.body;

  if (!customerId || !deviceName || !customerComplaints) {
    return res.status(422).json({
      message: "Validation Error",
      errors: {
        customerId: !customerId ? ["customerId is required."] : [],
        deviceName: !deviceName ? ["deviceName is required."] : [],
        customerComplaints: !customerComplaints ? ["customerComplaints is required."] : [],
      },
    });
  }

  // Generate unique ticket number
  const year = new Date().getFullYear();
  const seq = Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90);
  const ticketNo = `TKT-${year}${seq}`;

  try {
    const result = await dbQuery(
      `INSERT INTO service_tickets
         (tenant_id, branch_id, ticket_no, customer_id, device_name, device_brand_model,
          customer_complaints, estimated_cost, status, customer_approval_status, warranty_months, is_outsourced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DITERIMA', 'PENDING', 0, false)
       RETURNING id, tenant_id as "tenantId", branch_id as "branchId", ticket_no as "ticketNo",
                 customer_id as "customerId", device_name as "deviceName", status, created_at as "createdAt"`,
      [tenantId, branchId, ticketNo, customerId, deviceName, deviceBrandModel || "Unknown",
       customerComplaints, Number(estimatedCost) || 0],
    );
    res.status(201).json({ data: result.rows[0], message: "Service ticket created successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTicket = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;
  const { status, techDiagnosis, estimatedCost, assignedTechId, warrantyMonths } = req.body;

  try {
    const result = await dbQuery(
      `UPDATE service_tickets SET
         status = COALESCE($3, status),
         tech_diagnosis = COALESCE($4, tech_diagnosis),
         estimated_cost = COALESCE($5, estimated_cost),
         assigned_tech_id = COALESCE($6, assigned_tech_id),
         warranty_months = COALESCE($7, warranty_months)
       WHERE id = $1 AND tenant_id = $2 AND branch_id = $8
       RETURNING id, status, tech_diagnosis as "techDiagnosis", estimated_cost as "estimatedCost"`,
      [id, tenantId, status, techDiagnosis, estimatedCost !== undefined ? Number(estimatedCost) : null,
        assignedTechId, warrantyMonths !== undefined ? Number(warrantyMonths) : null, branchId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Service ticket not found." });
    }
    res.json({ data: result.rows[0], message: "Service ticket updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTicket = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      "DELETE FROM service_tickets WHERE id = $1 AND tenant_id = $2 AND branch_id = $3 RETURNING id",
      [id, tenantId, branchId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Service ticket not found." });
    }
    res.json({ message: "Service ticket successfully deleted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 7. INVENTORY CONTROLLERS (DB queries)
// ==========================================

export const getInventory = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { search, category } = req.query;

  const conditions: string[] = ["p.tenant_id = $1"];
  const params: any[] = [tenantId];
  let idx = 2;

  if (category) {
    conditions.push(`p.category = $${idx++}`);
    params.push((category as string).toUpperCase());
  }
  if (search) {
    const q = `%${search}%`;
    conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.barcode ILIKE $${idx})`);
    params.push(q);
    idx++;
  }

  const where = conditions.join(" AND ");
  try {
    const result = await dbQuery(
      `SELECT p.id, p.tenant_id as "tenantId", p.name, p.sku, p.barcode, p.category,
              p.purchase_cost as "purchaseCost", p.sell_price as "sellPrice",
              p.unit, p.min_stock as "minStock", p.reorder_level as "reorderLevel",
              p.grade, p.is_consignment as "isConsignment",
              COALESCE(SUM(ps.quantity), 0)::int as "stockQty"
       FROM products p
       LEFT JOIN product_stock ps ON ps.product_id = p.id
       WHERE ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC LIMIT 500`,
      params,
    );
    res.json({ data: result.rows, meta: { total: result.rows.length, tenantId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getInventoryById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `SELECT p.id, p.tenant_id as "tenantId", p.name, p.sku, p.barcode, p.category,
              p.purchase_cost as "purchaseCost", p.sell_price as "sellPrice",
              p.unit, p.min_stock as "minStock", p.reorder_level as "reorderLevel",
              p.grade, p.is_consignment as "isConsignment",
              COALESCE(SUM(ps.quantity), 0)::int as "stockQty"
       FROM products p
       LEFT JOIN product_stock ps ON ps.product_id = p.id
       WHERE p.id = $1 AND p.tenant_id = $2
       GROUP BY p.id LIMIT 1`,
      [id, tenantId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product resource not found." });
    }
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createInventory = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { name, sku, barcode, category, purchaseCost, sellPrice, unit, stockQty } = req.body;

  if (!name || !sku || !category || purchaseCost === undefined || sellPrice === undefined) {
    return res.status(422).json({
      message: "Validation Error",
      errors: {
        name: !name ? ["The product name is required."] : [],
        sku: !sku ? ["The product SKU is required."] : [],
        category: !category ? ["The category field is required."] : [],
        purchaseCost: purchaseCost === undefined ? ["purchaseCost is required."] : [],
        sellPrice: sellPrice === undefined ? ["sellPrice is required."] : [],
      },
    });
  }

  try {
    const result = await dbQuery(
      `INSERT INTO products (tenant_id, name, sku, barcode, category, purchase_cost, sell_price, unit, min_stock, reorder_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 5)
       RETURNING id, tenant_id as "tenantId", name, sku, barcode, category,
                 purchase_cost as "purchaseCost", sell_price as "sellPrice", unit`,
      [tenantId, name, sku, barcode || sku, (category as string).toUpperCase(),
       Number(purchaseCost), Number(sellPrice), unit || "pcs"],
    );
    const product = result.rows[0];

    // Initialize stock in first warehouse of this tenant
    const qty = Number(stockQty) || 0;
    if (qty > 0) {
      const warehouseRes = await dbQuery(
        `SELECT id FROM warehouses WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      );
      if (warehouseRes.rows.length > 0) {
        await dbQuery(
          `INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)
           ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [product.id, warehouseRes.rows[0].id, qty],
        );
      }
    }

    res.status(201).json({ data: { ...product, stockQty: qty }, message: "Inventory product created successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateInventory = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const { name, sku, barcode, category, purchaseCost, sellPrice, unit } = req.body;

  try {
    const result = await dbQuery(
      `UPDATE products SET
         name = COALESCE($3, name),
         sku = COALESCE($4, sku),
         barcode = COALESCE($5, barcode),
         category = COALESCE($6, category),
         purchase_cost = COALESCE($7, purchase_cost),
         sell_price = COALESCE($8, sell_price),
         unit = COALESCE($9, unit)
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name, sku, category, purchase_cost as "purchaseCost", sell_price as "sellPrice"`,
      [id, tenantId, name, sku, barcode, category, purchaseCost !== undefined ? Number(purchaseCost) : null,
        sellPrice !== undefined ? Number(sellPrice) : null, unit],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.json({ data: result.rows[0], message: "Product updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteInventory = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      "DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.json({ message: "Product successfully deleted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 8. SALES (POS TRANSACTIONS) CONTROLLERS (DB queries)
// ==========================================

export const getSales = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { paymentMethod, customerId } = req.query;

  const conditions: string[] = ["tenant_id = $1", "branch_id = $2"];
  const params: any[] = [tenantId, branchId];
  let idx = 3;

  if (paymentMethod) {
    conditions.push(`payment_method = $${idx++}`);
    params.push((paymentMethod as string).toUpperCase());
  }
  if (customerId) {
    conditions.push(`customer_id = $${idx++}`);
    params.push(customerId);
  }

  const where = conditions.join(" AND ");
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
              invoice_no as "invoiceNo", customer_id as "customerId", items,
              subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
              grand_total as "grandTotal", payment_method as "paymentMethod",
              amount_paid as "amountPaid", change_amount as "changeAmount",
              is_refunded as "isRefunded", timestamp
       FROM pos_transactions WHERE ${where}
       ORDER BY timestamp DESC LIMIT 500`,
      params,
    );
    res.json({ data: result.rows, meta: { total: result.rows.length, tenantId, branchId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSaleById = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", branch_id as "branchId", shift_id as "shiftId",
              invoice_no as "invoiceNo", customer_id as "customerId", items,
              subtotal, discount_amount as "discountAmount", tax_amount as "taxAmount",
              grand_total as "grandTotal", payment_method as "paymentMethod",
              amount_paid as "amountPaid", change_amount as "changeAmount",
              is_refunded as "isRefunded", timestamp
       FROM pos_transactions WHERE id = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1`,
      [id, tenantId, branchId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sale transaction not found." });
    }
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createSale = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const branchId = req.branchId;
  const { customerId, items, paymentMethod, discountAmount, amountPaid } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(422).json({
      message: "The given data was invalid.",
      errors: { items: ["The items array is required and must contain at least 1 item."] },
    });
  }
  if (!paymentMethod) {
    return res.status(422).json({
      message: "The given data was invalid.",
      errors: { paymentMethod: ["The paymentMethod is required."] },
    });
  }

  // Find active shift for this branch
  let shiftId: string | null = null;
  try {
    const shiftRes = await dbQuery(
      `SELECT id FROM pos_shifts WHERE branch_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`,
      [branchId],
    );
    shiftId = shiftRes.rows[0]?.id || null;
  } catch {}

  if (!shiftId) {
    return res.status(422).json({
      message: "No active POS shift found for this branch. Please open a shift first.",
    });
  }

  // Resolve product prices from DB
  let subtotal = 0;
  const calculatedItems: any[] = [];
  for (const i of items) {
    let price = 0;
    let productName = i.name || "Unknown Component";
    if (i.productId) {
      try {
        const prodRes = await dbQuery(
          `SELECT name, sell_price FROM products WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [i.productId, tenantId],
        );
        if (prodRes.rows.length > 0) {
          price = Number(prodRes.rows[0].sell_price) || 0;
          productName = prodRes.rows[0].name;
        }
      } catch {}
    } else {
      price = Number(i.unitPrice) || 0;
    }
    const qty = Number(i.quantity) || 1;
    const itemTotal = price * qty;
    subtotal += itemTotal;
    calculatedItems.push({
      productId: i.productId || null,
      name: productName,
      quantity: qty,
      unitPrice: price,
      discount: 0,
      tax: 0,
      total: itemTotal,
    });
  }

  const disc = Number(discountAmount) || 0;
  const tax = Math.round((subtotal - disc) * 0.11); // Standard PPN 11%
  const grandTotal = subtotal - disc + tax;
  const paid = Number(amountPaid) || grandTotal;
  const change = Math.max(0, paid - grandTotal);

  const year = new Date().getFullYear();
  const invoiceNo = `INV-${year}${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const txResult = await client.query(
      `INSERT INTO pos_transactions
         (tenant_id, branch_id, shift_id, invoice_no, customer_id, items, subtotal,
          discount_amount, tax_amount, grand_total, payment_method, amount_paid, change_amount, is_refunded)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, false)
       RETURNING id, invoice_no as "invoiceNo", grand_total as "grandTotal", timestamp`,
      [
        tenantId, branchId, shiftId, invoiceNo, customerId || null,
        JSON.stringify(calculatedItems), subtotal, disc, tax, grandTotal,
        (paymentMethod as string).toUpperCase(), paid, change,
      ],
    );

    // Deduct atomically. Insufficient stock or wrong tenant rolls back the sale.
    for (const item of calculatedItems) {
      if (item.productId) {
        const stockResult = await client.query(
          `UPDATE product_stock ps
           SET quantity = ps.quantity - $1
           WHERE ps.product_id = $2
             AND ps.quantity >= $1
             AND ps.warehouse_id = (
               SELECT w.id FROM warehouses w
               WHERE w.branch_id = $4 AND w.tenant_id = $3
               LIMIT 1
             )`,
          [item.quantity, item.productId, tenantId, branchId],
        );
        if (stockResult.rowCount !== 1) {
          throw new Error(`Stok tidak cukup untuk produk ${item.productId}.`);
        }
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      data: { ...txResult.rows[0], items: calculatedItems },
      message: "Sale transaction processed successfully.",
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
