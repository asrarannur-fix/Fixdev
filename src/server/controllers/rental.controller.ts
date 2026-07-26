import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { dbTransaction, dbQuery } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';

// Validation schemas
const createCatalogSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumberPrefix: z.string().max(20).optional(),
  ratePerDay: z.number().int().min(0),
  depositAmount: z.number().int().min(0),
  specifications: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const updateCatalogSchema = createCatalogSchema.partial();

const createDeviceSchema = z.object({
  catalogId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  serialNumber: z.string().min(1).max(100),
  imeiOrMac: z.string().max(100).optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'NEEDS_REPAIR']).optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED', 'LOST']).optional(),
  purchaseDate: z.string().date().optional(),
  purchaseCost: z.number().int().min(0).optional(),
  currentLocation: z.enum(['WAREHOUSE', 'BRANCH', 'CUSTOMER', 'VENDOR']).optional(),
  notes: z.string().optional(),
});

const updateDeviceSchema = createDeviceSchema.partial();

const createContractSchema = z
  .object({
    customerId: z.string().uuid(),
    deviceId: z.string().uuid(),
    startDate: z.string().date().optional(),
    endDate: z.string().date(),
    depositAmount: z.number().int().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'CARD', 'EWALLET']).default('CASH'),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'endDate harus setelah atau sama dengan startDate',
      });
    }
  });

const returnContractSchema = z.object({
  damageDeductionAmount: z.number().int().min(0).optional(),
  damageNotes: z.string().optional(),
});

const extendContractSchema = z.object({
  additionalDays: z.number().int().positive(),
});

const createPaymentSchema = z.object({
  contractId: z.string().uuid(),
  amount: z.number().int().min(1),
  paymentType: z.enum(['RENT', 'DEPOSIT', 'DAMAGE_FEE', 'LATE_FEE', 'REFUND']),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'CARD', 'EWALLET']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const createInspectionSchema = z.object({
  contractId: z.string().uuid(),
  inspectionType: z.enum(['PRE_RENTAL', 'POST_RETURN', 'PERIODIC', 'DAMAGE_CLAIM']),
  conditionBefore: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  conditionAfter: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  damageDescription: z.string().optional(),
  damagePhotos: z.array(z.string().url()).optional(),
  estimatedRepairCost: z.number().int().min(0).optional(),
});

const updateInspectionSchema = z
  .object({
    conditionBefore: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
    conditionAfter: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
    damageDescription: z.string().optional(),
    damagePhotos: z.array(z.string().url()).optional(),
    estimatedRepairCost: z.number().int().min(0).optional(),
  })
  .strict();

// Helper: get tenantId from request
function getTenantId(req: Request): string {
  const tenantId = req.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID not found in request');
  }
  return tenantId;
}

// Helper: get userId from request
function getUserId(req: Request): string | undefined {
  return req.authActor?.userId;
}

// Helper: get branchId from request
function getBranchId(req: Request): string | undefined {
  return req.branchId;
}

async function refreshOverdueContracts(tenantId: string): Promise<void> {
  await dbQuery(
    `UPDATE rental_contracts
     SET status = 'OVERDUE', updated_at = now()
     WHERE tenant_id = $1 AND status IN ('ACTIVE', 'EXTENDED') AND end_date < CURRENT_DATE`,
    [tenantId]
  );
}

// Helper: generate contract number
async function generateContractNumber(client: PoolClient, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RNT-${year}-`;
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
    `rental-contract:${tenantId}:${year}`,
  ]);
  const result = await client.query(
    `SELECT contract_number FROM rental_contracts 
     WHERE tenant_id = $1 AND contract_number LIKE $2 
     ORDER BY contract_number DESC LIMIT 1`,
    [tenantId, `${prefix}%`]
  );
  let nextNum = 1;
  if (result.rows.length > 0) {
    const lastNum = parseInt(result.rows[0].contract_number.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// Helper: log contract event
async function logContractEvent(
  tenantId: string,
  contractId: string,
  eventType: string,
  description: string,
  metadata: Record<string, unknown> = {},
  userId?: string
) {
  try {
    await dbQuery(
      `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, contractId, eventType, description, JSON.stringify(metadata), userId]
    );
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), contractId, eventType },
      'logContractEvent failed'
    );
  }
}

// Helper: handle Zod parse errors
function handleZodError(err: unknown, res: Response): boolean {
  if (err instanceof z.ZodError) {
    res.status(422).json({ error: 'Validasi input gagal', details: err.issues });
    return true;
  }
  return false;
}

// ========== CATALOG CONTROLLER ==========

export async function listCatalog(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { activeOnly } = req.query;

    let query = `SELECT * FROM rental_device_catalog WHERE tenant_id = $1`;
    const params: string[] = [tenantId];

    if (activeOnly === 'true') {
      query += ` AND is_active = true`;
    }
    query += ` ORDER BY category, name`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'listCatalog failed');
    res.status(500).json({ error: 'Gagal memuat data katalog.' });
  }
}

export async function getCatalog(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const result = await dbQuery(
      `SELECT * FROM rental_device_catalog WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Catalog item not found' });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'getCatalog failed');
    res.status(500).json({ error: 'Gagal memuat data katalog.' });
  }
}

export async function createCatalog(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    let data;
    try {
      data = createCatalogSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const result = await dbQuery(
      `INSERT INTO rental_device_catalog 
       (tenant_id, name, category, brand, model, serial_number_prefix, rate_per_day, deposit_amount, specifications, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        data.name,
        data.category,
        data.brand ?? null,
        data.model ?? null,
        data.serialNumberPrefix ?? null,
        data.ratePerDay,
        data.depositAmount,
        JSON.stringify(data.specifications ?? {}),
        data.isActive ?? true,
      ]
    );
    await logContractEvent(
      tenantId,
      result.rows[0].id,
      'CATALOG_CREATED',
      `Created catalog item: ${data.name}`,
      { catalogId: result.rows[0].id },
      userId
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'createCatalog failed');
    res.status(500).json({ error: 'Gagal membuat data katalog.' });
  }
}

export async function updateCatalog(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    let data;
    try {
      data = updateCatalogSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const fields: string[] = [];
    const values: unknown[] = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col} = $${paramIndex}`);
        values.push(key === 'specifications' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = now()`);
    const result = await dbQuery(
      `UPDATE rental_device_catalog SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Catalog item not found' });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'updateCatalog failed');
    res.status(500).json({ error: 'Gagal memperbarui data katalog.' });
  }
}

export async function deleteCatalog(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deviceCheck = await dbQuery(
      `SELECT 1 FROM rental_devices WHERE catalog_id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );
    if (deviceCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete catalog item with existing devices' });
    }

    const result = await dbQuery(
      `DELETE FROM rental_device_catalog WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Catalog item not found' });
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'deleteCatalog failed');
    res.status(500).json({ error: 'Gagal menghapus data katalog.' });
  }
}

// ========== DEVICE CONTROLLER ==========

export async function listDevices(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { status, catalogId, branchId, available } = req.query;

    let query = `
      SELECT d.*, c.name as catalog_name, c.category, c.rate_per_day, c.deposit_amount
      FROM rental_devices d
      JOIN rental_device_catalog c ON d.catalog_id = c.id
      WHERE d.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (catalogId) {
      query += ` AND d.catalog_id = $${paramIndex}`;
      params.push(catalogId);
      paramIndex++;
    }
    if (branchId) {
      query += ` AND d.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }
    if (available === 'true') {
      query += ` AND d.status = 'AVAILABLE'`;
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'listDevices failed');
    res.status(500).json({ error: 'Gagal memuat data perangkat.' });
  }
}

export async function getDevice(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const result = await dbQuery(
      `SELECT d.*, c.name as catalog_name, c.category, c.rate_per_day, c.deposit_amount, c.specifications
       FROM rental_devices d
       JOIN rental_device_catalog c ON d.catalog_id = c.id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'getDevice failed');
    res.status(500).json({ error: 'Gagal memuat data perangkat.' });
  }
}

export async function createDevice(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const branchId = getBranchId(req);
    let data;
    try {
      data = createDeviceSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const catalogCheck = await dbQuery(
      `SELECT id, rate_per_day, deposit_amount FROM rental_device_catalog WHERE id = $1 AND tenant_id = $2`,
      [data.catalogId, tenantId]
    );
    if (catalogCheck.rows.length === 0)
      return res.status(404).json({ error: 'Catalog item not found' });

    const serialCheck = await dbQuery(
      `SELECT 1 FROM rental_devices WHERE tenant_id = $1 AND serial_number = $2`,
      [tenantId, data.serialNumber]
    );
    if (serialCheck.rows.length > 0)
      return res.status(400).json({ error: 'Serial number already exists' });

    const result = await dbQuery(
      `INSERT INTO rental_devices 
       (tenant_id, catalog_id, branch_id, serial_number, imei_or_mac, condition, status, purchase_date, purchase_cost, current_location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        tenantId,
        data.catalogId,
        data.branchId ?? branchId ?? null,
        data.serialNumber,
        data.imeiOrMac ?? null,
        data.condition ?? 'NEW',
        data.status ?? 'AVAILABLE',
        data.purchaseDate ?? null,
        data.purchaseCost ?? 0,
        data.currentLocation ?? 'WAREHOUSE',
        data.notes ?? null,
      ]
    );
    await logContractEvent(
      tenantId,
      result.rows[0].id,
      'DEVICE_CREATED',
      `Created device: ${data.serialNumber}`,
      { deviceId: result.rows[0].id },
      userId
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'createDevice failed');
    res.status(500).json({ error: 'Gagal membuat data perangkat.' });
  }
}

export async function updateDevice(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    let data;
    try {
      data = updateDeviceSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const fields: string[] = [];
    const values: unknown[] = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = now()`);
    const result = await dbQuery(
      `UPDATE rental_devices SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'updateDevice failed');
    res.status(500).json({ error: 'Gagal memperbarui data perangkat.' });
  }
}

export async function deleteDevice(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const contractCheck = await dbQuery(
      `SELECT 1 FROM rental_contracts WHERE device_id = $1 AND tenant_id = $2 AND status IN ('ACTIVE', 'OVERDUE', 'EXTENDED') LIMIT 1`,
      [id, tenantId]
    );
    if (contractCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete device with active rental contracts' });
    }

    const result = await dbQuery(
      `DELETE FROM rental_devices WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'deleteDevice failed');
    res.status(500).json({ error: 'Gagal menghapus data perangkat.' });
  }
}

// ========== CONTRACT CONTROLLER ==========

export async function listContracts(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    await refreshOverdueContracts(tenantId);
    const {
      status,
      customerId,
      deviceId,
      startDate,
      endDate,
      page: rawPage = '1',
      limit: rawLimit = '50',
    } = req.query;

    const page = Math.max(1, Math.floor(Number(rawPage) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(rawLimit) || 50)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT rc.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             d.serial_number, cat.name as device_name, cat.category as device_category
      FROM rental_contracts rc
      JOIN customers c ON rc.customer_id = c.id
      JOIN rental_devices d ON rc.device_id = d.id
      JOIN rental_device_catalog cat ON d.catalog_id = cat.id
      WHERE rc.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND rc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (customerId) {
      query += ` AND rc.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }
    if (deviceId) {
      query += ` AND rc.device_id = $${paramIndex}`;
      params.push(deviceId);
      paramIndex++;
    }
    if (startDate) {
      query += ` AND rc.start_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND rc.end_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY rc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    let countQuery = `SELECT COUNT(*)::int FROM rental_contracts WHERE tenant_id = $1`;
    const countParams: unknown[] = [tenantId];
    let countParamIndex = 2;
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    if (customerId) {
      countQuery += ` AND customer_id = $${countParamIndex}`;
      countParams.push(customerId);
      countParamIndex++;
    }
    if (deviceId) {
      countQuery += ` AND device_id = $${countParamIndex}`;
      countParams.push(deviceId);
      countParamIndex++;
    }
    if (startDate) {
      countQuery += ` AND start_date >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }
    if (endDate) {
      countQuery += ` AND end_date <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }

    const countResult = await dbQuery(countQuery, countParams);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: Number(countResult.rows[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult.rows[0]?.count ?? 0) / limit),
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'listContracts failed');
    res.status(500).json({ error: 'Gagal memuat data kontrak.' });
  }
}

export async function getContract(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const result = await dbQuery(
      `SELECT rc.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
              d.serial_number, d.imei_or_mac, d.condition as device_condition,
              cat.name as device_name, cat.category as device_category, cat.specifications,
              b.name as branch_name
       FROM rental_contracts rc
       JOIN customers c ON rc.customer_id = c.id
       JOIN rental_devices d ON rc.device_id = d.id
       JOIN rental_device_catalog cat ON d.catalog_id = cat.id
       LEFT JOIN branches b ON rc.branch_id = b.id
       WHERE rc.id = $1 AND rc.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'getContract failed');
    res.status(500).json({ error: 'Gagal memuat data kontrak.' });
  }
}

export async function getContractWithEvents(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const contractResult = await dbQuery(
      `SELECT rc.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              d.serial_number, cat.name as device_name, cat.category as device_category
       FROM rental_contracts rc
       JOIN customers c ON rc.customer_id = c.id
       JOIN rental_devices d ON rc.device_id = d.id
       JOIN rental_device_catalog cat ON d.catalog_id = cat.id
       WHERE rc.id = $1 AND rc.tenant_id = $2`,
      [id, tenantId]
    );
    if (contractResult.rows.length === 0)
      return res.status(404).json({ error: 'Contract not found' });

    const eventsResult = await dbQuery(
      `SELECT * FROM rental_contract_events WHERE contract_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [id, tenantId]
    );

    const paymentsResult = await dbQuery(
      `SELECT * FROM rental_payments WHERE contract_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [id, tenantId]
    );

    const inspectionsResult = await dbQuery(
      `SELECT * FROM rental_inspections WHERE contract_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [id, tenantId]
    );

    res.json({
      contract: contractResult.rows[0],
      events: eventsResult.rows,
      payments: paymentsResult.rows,
      inspections: inspectionsResult.rows,
    });
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'getContractWithEvents failed'
    );
    res.status(500).json({ error: 'Gagal memuat detail kontrak.' });
  }
}

export async function createContract(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const branchId = getBranchId(req);
    let data;
    try {
      data = createContractSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const customerCheck = await dbQuery(
      `SELECT id FROM customers WHERE id = $1 AND tenant_id = $2`,
      [data.customerId, tenantId]
    );
    if (customerCheck.rows.length === 0)
      return res.status(404).json({ error: 'Customer not found' });

    const startDate = data.startDate || new Date().toISOString().split('T')[0];
    const durationDays =
      Math.ceil(
        (new Date(data.endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const contract = await dbTransaction(async (client) => {
      const deviceCheck = await client.query(
        `SELECT d.*, cat.rate_per_day, cat.deposit_amount
         FROM rental_devices d
         JOIN rental_device_catalog cat ON cat.id = d.catalog_id AND cat.tenant_id = d.tenant_id
         WHERE d.id = $1 AND d.tenant_id = $2 AND d.status = 'AVAILABLE'
         FOR UPDATE OF d`,
        [data.deviceId, tenantId]
      );
      if (deviceCheck.rows.length === 0) throw new Error('DEVICE_NOT_AVAILABLE');

      const device = deviceCheck.rows[0];
      const dailyRate = Number(device.rate_per_day);
      const totalRent = dailyRate * durationDays;
      const depositAmount = data.depositAmount ?? Number(device.deposit_amount);
      const contractNumber = await generateContractNumber(client, tenantId);
      const contractResult = await client.query(
        `INSERT INTO rental_contracts
         (tenant_id, contract_number, branch_id, customer_id, device_id, start_date, end_date,
          duration_days, rate_per_day, total_rent_amount, deposit_amount, deposit_paid, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, 'ACTIVE', $12)
         RETURNING *`,
        [
          tenantId,
          contractNumber,
          branchId ?? null,
          data.customerId,
          data.deviceId,
          startDate,
          data.endDate,
          durationDays,
          dailyRate,
          totalRent,
          depositAmount,
          data.notes ?? null,
        ]
      );
      const newContract = contractResult.rows[0];

      const deviceUpdate = await client.query(
        `UPDATE rental_devices SET status = 'RENTED', current_location = 'CUSTOMER'
         WHERE id = $1 AND tenant_id = $2 AND status = 'AVAILABLE' RETURNING id`,
        [data.deviceId, tenantId]
      );
      if (deviceUpdate.rowCount !== 1) throw new Error('DEVICE_NOT_AVAILABLE');

      for (const [paymentType, amount] of [
        ['RENT', totalRent],
        ['DEPOSIT', depositAmount],
      ] as const) {
        if (amount > 0) {
          await client.query(
            `INSERT INTO rental_payments
             (tenant_id, contract_id, payment_type, amount, payment_method, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenantId, newContract.id, paymentType, amount, data.paymentMethod, userId ?? null]
          );
        }
      }

      await client.query(
        `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
         VALUES ($1, $2, 'CREATED', $3, $4, $5)`,
        [
          tenantId,
          newContract.id,
          `Contract created: ${contractNumber}`,
          JSON.stringify({ contractNumber }),
          userId ?? null,
        ]
      );

      await client.query(
        `INSERT INTO rental_inspections
         (tenant_id, contract_id, inspection_type, condition_before, status, inspector_id)
         VALUES ($1, $2, 'PRE_RENTAL', 'GOOD', 'COMPLETED', $3)`,
        [tenantId, newContract.id, userId ?? null]
      );
      return newContract;
    });

    res.status(201).json(contract);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'DEVICE_NOT_AVAILABLE') {
      return res.status(409).json({ error: 'Device not available or not found' });
    }
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'createContract failed'
    );
    res.status(500).json({ error: 'Gagal membuat kontrak.' });
  }
}

export async function returnContract(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    let damageDeductionAmount: number | undefined;
    let damageNotes: string | undefined;
    try {
      const parsed = returnContractSchema.parse(req.body);
      damageDeductionAmount = parsed.damageDeductionAmount;
      damageNotes = parsed.damageNotes;
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const contract = await dbTransaction(async (client) => {
      const contractResult = await client.query(
        `SELECT rc.*, d.id as device_id, d.serial_number
         FROM rental_contracts rc
         JOIN rental_devices d ON rc.device_id = d.id
         WHERE rc.id = $1 AND rc.tenant_id = $2 AND rc.status IN ('ACTIVE', 'OVERDUE', 'EXTENDED')
         FOR UPDATE OF rc`,
        [id, tenantId]
      );
      if (contractResult.rows.length === 0) {
        return { code: 404, error: 'Kontrak tidak ditemukan atau tidak aktif.' };
      }
      const c = contractResult.rows[0];

      const actualReturnDate = new Date().toISOString().split('T')[0];
      const damageDeduction = damageDeductionAmount || 0;
      if (damageDeduction > +c.deposit_paid) {
        return { code: 422, error: 'Potongan kerusakan melebihi deposit dibayar.' };
      }
      const depositRefund = Math.max(0, c.deposit_paid - damageDeduction);

      const updateResult = await client.query(
        `UPDATE rental_contracts 
         SET status = 'RETURNED', actual_return_date = $1, damage_deduction_amount = $2, damage_notes = $3, deposit_refunded_amount = $4, updated_at = now()
         WHERE id = $5 AND tenant_id = $6 RETURNING *`,
        [actualReturnDate, damageDeduction, damageNotes || null, depositRefund, id, tenantId]
      );

      await client.query(
        `UPDATE rental_devices SET status = 'AVAILABLE', current_location = 'WAREHOUSE' WHERE id = $1 AND tenant_id = $2`,
        [c.device_id, tenantId]
      );

      await client.query(
        `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
         VALUES ($1, $2, 'RETURNED', $3, $4, $5)`,
        [
          tenantId,
          id,
          `Device returned: ${c.serial_number}`,
          JSON.stringify({ damageDeduction, depositRefund }),
          userId,
        ]
      );

      if (damageDeduction > 0) {
        await client.query(
          `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
           VALUES ($1, $2, 'DAMAGE_REPORTED', $3, $4, $5)`,
          [
            tenantId,
            id,
            `Damage reported on return: ${damageNotes}`,
            JSON.stringify({ damageDeduction, damageNotes }),
            userId,
          ]
        );
      }

      if (depositRefund > 0) {
        await client.query(
          `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
           VALUES ($1, $2, 'DEPOSIT_REFUNDED', $3, $4, $5)`,
          [
            tenantId,
            id,
            `Deposit refunded: ${depositRefund}`,
            JSON.stringify({ depositRefund }),
            userId,
          ]
        );
      }

      return updateResult.rows[0];
    });

    if ((contract as Record<string, unknown>).code)
      return res
        .status((contract as Record<string, unknown>).code as number)
        .json({ error: (contract as Record<string, unknown>).error });
    res.json(contract);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'returnContract failed'
    );
    res.status(500).json({ error: 'Gagal memproses pengembalian.' });
  }
}

export async function extendContract(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    let additionalDays: number;
    try {
      const parsed = extendContractSchema.parse(req.body);
      additionalDays = parsed.additionalDays;
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const contract = await dbTransaction(async (client) => {
      const contractResult = await client.query(
        `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2 AND status IN ('ACTIVE', 'OVERDUE', 'EXTENDED') FOR UPDATE`,
        [id, tenantId]
      );
      if (contractResult.rows.length === 0) {
        return { code: 404, error: 'Kontrak tidak ditemukan atau tidak aktif.' };
      }
      const c = contractResult.rows[0];

      const newEndDate = new Date(c.end_date);
      newEndDate.setDate(newEndDate.getDate() + additionalDays);
      const newDurationDays = c.duration_days + additionalDays;
      const additionalRent = c.rate_per_day * additionalDays;
      const newTotalRent = c.total_rent_amount + additionalRent;

      const updateResult = await client.query(
        `UPDATE rental_contracts 
         SET end_date = $1, duration_days = $2, total_rent_amount = $3, status = 'EXTENDED', updated_at = now()
         WHERE id = $4 AND tenant_id = $5 RETURNING *`,
        [newEndDate.toISOString().split('T')[0], newDurationDays, newTotalRent, id, tenantId]
      );

      await client.query(
        `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
         VALUES ($1, $2, 'EXTENDED', $3, $4, $5)`,
        [
          tenantId,
          id,
          `Contract extended by ${additionalDays} days`,
          JSON.stringify({ additionalDays, additionalRent }),
          userId,
        ]
      );

      return updateResult.rows[0];
    });

    if ((contract as Record<string, unknown>).code)
      return res
        .status((contract as Record<string, unknown>).code as number)
        .json({ error: (contract as Record<string, unknown>).error });
    res.json(contract);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'extendContract failed'
    );
    res.status(500).json({ error: 'Gagal memperpanjang kontrak.' });
  }
}

export async function cancelContract(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    const contract = await dbTransaction(async (client) => {
      const contractResult = await client.query(
        `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2 AND status IN ('DRAFT', 'ACTIVE', 'OVERDUE', 'EXTENDED') FOR UPDATE`,
        [id, tenantId]
      );
      if (contractResult.rows.length === 0) {
        return { code: 404, error: 'Kontrak tidak ditemukan atau tidak dapat dibatalkan.' };
      }
      const c = contractResult.rows[0];

      await client.query(
        `UPDATE rental_devices SET status = 'AVAILABLE', current_location = 'WAREHOUSE' WHERE id = $1 AND tenant_id = $2`,
        [c.device_id, tenantId]
      );

      const updateResult = await client.query(
        `UPDATE rental_contracts SET status = 'CANCELLED', updated_at = now() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [id, tenantId]
      );

      await client.query(
        `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
         VALUES ($1, $2, 'CANCELLED', $3, $4, $5)`,
        [tenantId, id, 'Contract cancelled', JSON.stringify({}), userId]
      );

      return updateResult.rows[0];
    });

    if ((contract as Record<string, unknown>).code)
      return res
        .status((contract as Record<string, unknown>).code as number)
        .json({ error: (contract as Record<string, unknown>).error });
    res.json(contract);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'cancelContract failed'
    );
    res.status(500).json({ error: 'Gagal membatalkan kontrak.' });
  }
}

// ========== PAYMENTS ==========

export async function listPayments(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { contractId, paymentType } = req.query;

    let query = `SELECT * FROM rental_payments WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (contractId) {
      query += ` AND contract_id = $${paramIndex}`;
      params.push(contractId);
      paramIndex++;
    }
    if (paymentType) {
      query += ` AND payment_type = $${paramIndex}`;
      params.push(paymentType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'listPayments failed');
    res.status(500).json({ error: 'Gagal memuat data pembayaran.' });
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    let data;
    try {
      data = createPaymentSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const payment = await dbTransaction(async (client) => {
      const contractCheck = await client.query(
        `SELECT status FROM rental_contracts WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [data.contractId, tenantId]
      );
      if (contractCheck.rows.length === 0) throw new Error('CONTRACT_NOT_FOUND');
      if (['RETURNED', 'CANCELLED'].includes(contractCheck.rows[0].status))
        throw new Error('CONTRACT_CLOSED');

      const paymentResult = await client.query(
        `INSERT INTO rental_payments 
         (tenant_id, contract_id, payment_type, amount, payment_method, reference_number, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          tenantId,
          data.contractId,
          data.paymentType,
          data.amount,
          data.paymentMethod,
          data.referenceNumber ?? null,
          data.notes ?? null,
          userId ?? 'system',
        ]
      );

      if (data.paymentType === 'DEPOSIT') {
        await client.query(
          `UPDATE rental_contracts SET deposit_paid = deposit_paid + $1 WHERE id = $2 AND tenant_id = $3`,
          [data.amount, data.contractId, tenantId]
        );
      }

      await client.query(
        `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
         VALUES ($1, $2, 'PAYMENT_RECEIVED', $3, $4, $5)`,
        [
          tenantId,
          data.contractId,
          `Payment received: ${data.paymentType} - ${data.amount}`,
          JSON.stringify(data),
          userId,
        ]
      );

      return paymentResult.rows[0];
    });

    res.status(201).json(payment);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ error: 'Contract not found' });
    }
    if (err instanceof Error && err.message === 'CONTRACT_CLOSED') {
      return res.status(409).json({ error: 'Contract already closed' });
    }
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'createPayment failed');
    res.status(500).json({ error: 'Gagal membuat data pembayaran.' });
  }
}

// ========== INSPECTIONS ==========

export async function listInspections(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { contractId, inspectionType } = req.query;

    let query = `SELECT * FROM rental_inspections WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (contractId) {
      query += ` AND contract_id = $${paramIndex}`;
      params.push(contractId);
      paramIndex++;
    }
    if (inspectionType) {
      query += ` AND inspection_type = $${paramIndex}`;
      params.push(inspectionType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'listInspections failed'
    );
    res.status(500).json({ error: 'Gagal memuat data inspeksi.' });
  }
}

export async function createInspection(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    let data;
    try {
      data = createInspectionSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const contractCheck = await dbQuery(
      `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2`,
      [data.contractId, tenantId]
    );
    if (contractCheck.rows.length === 0)
      return res.status(404).json({ error: 'Contract not found' });

    const result = await dbQuery(
      `INSERT INTO rental_inspections 
       (tenant_id, contract_id, inspection_type, condition_before, condition_after, damage_description, damage_photos, estimated_repair_cost, inspector_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId,
        data.contractId,
        data.inspectionType,
        data.conditionBefore ?? null,
        data.conditionAfter ?? null,
        data.damageDescription ?? null,
        JSON.stringify(data.damagePhotos ?? []),
        data.estimatedRepairCost ?? null,
        userId ?? 'system',
      ]
    );

    await logContractEvent(
      tenantId,
      data.contractId,
      'INSPECTION_DONE',
      `Inspection completed: ${data.inspectionType}`,
      { inspectionId: result.rows[0].id },
      userId
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'createInspection failed'
    );
    res.status(500).json({ error: 'Gagal membuat data inspeksi.' });
  }
}

export async function updateInspection(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    let data;
    try {
      data = updateInspectionSchema.parse(req.body);
    } catch (err: unknown) {
      if (handleZodError(err, res)) return;
      throw err;
    }

    const check = await dbQuery(
      `SELECT 1 FROM rental_inspections WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Inspection not found' });

    const fields: string[] = [];
    const values: unknown[] = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col} = $${paramIndex}`);
        values.push(key === 'damagePhotos' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const result = await dbQuery(
      `UPDATE rental_inspections SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'updateInspection failed'
    );
    res.status(500).json({ error: 'Gagal memperbarui data inspeksi.' });
  }
}

// ========== STATS & OVERDUE ==========

export async function getRentalStats(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    await refreshOverdueContracts(tenantId);

    const [
      activeContracts,
      overdueContracts,
      totalDevices,
      availableDevices,
      rentedDevices,
      maintenanceDevices,
      revenueResult,
      depositResult,
      avgDurationResult,
    ] = await Promise.all([
      dbQuery(
        `SELECT COUNT(*)::int FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE', 'EXTENDED')`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COUNT(*)::int FROM rental_contracts WHERE tenant_id = $1 AND status = 'OVERDUE'`,
        [tenantId]
      ),
      dbQuery(`SELECT COUNT(*)::int FROM rental_devices WHERE tenant_id = $1`, [tenantId]),
      dbQuery(
        `SELECT COUNT(*)::int FROM rental_devices WHERE tenant_id = $1 AND status = 'AVAILABLE'`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COUNT(*)::int FROM rental_devices WHERE tenant_id = $1 AND status = 'RENTED'`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COUNT(*)::int FROM rental_devices WHERE tenant_id = $1 AND status = 'MAINTENANCE'`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COALESCE(SUM(total_rent_amount), 0)::numeric as total FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE', 'RETURNED', 'EXTENDED')`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COALESCE(SUM(deposit_amount - deposit_paid), 0)::numeric as total FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE', 'EXTENDED')`,
        [tenantId]
      ),
      dbQuery(
        `SELECT COALESCE(AVG(duration_days), 0)::numeric as avg FROM rental_contracts WHERE tenant_id = $1 AND status IN ('RETURNED', 'ACTIVE', 'OVERDUE', 'EXTENDED')`,
        [tenantId]
      ),
    ]);

    res.json({
      active_contracts: Number(activeContracts.rows[0]?.count ?? 0),
      overdue_contracts: Number(overdueContracts.rows[0]?.count ?? 0),
      total_devices: Number(totalDevices.rows[0]?.count ?? 0),
      available_devices: Number(availableDevices.rows[0]?.count ?? 0),
      rented_devices: Number(rentedDevices.rows[0]?.count ?? 0),
      maintenance_devices: Number(maintenanceDevices.rows[0]?.count ?? 0),
      total_revenue: Number(revenueResult.rows[0]?.total ?? 0),
      pending_deposits: Number(depositResult.rows[0]?.total ?? 0),
      avg_rental_duration: Number(avgDurationResult.rows[0]?.avg ?? 0),
    });
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'getRentalStats failed'
    );
    res.status(500).json({ error: 'Gagal memuat statistik rental.' });
  }
}

export async function getOverdueContracts(req: Request, res: Response) {
  try {
    const tenantId = getTenantId(req);
    await refreshOverdueContracts(tenantId);

    const result = await dbQuery(
      `SELECT rc.id, rc.contract_number, c.name as customer_name, c.phone as customer_phone,
              cat.name as device_name, rc.end_date, rc.rate_per_day, rc.deposit_amount, rc.total_rent_amount
       FROM rental_contracts rc
       JOIN customers c ON rc.customer_id = c.id
       JOIN rental_devices d ON rc.device_id = d.id
       JOIN rental_device_catalog cat ON d.catalog_id = cat.id
       WHERE rc.tenant_id = $1 AND rc.status = 'OVERDUE'
       ORDER BY rc.end_date ASC`,
      [tenantId]
    );

    const today = new Date();
    const overdue = result.rows.map((row) => {
      const endDate = new Date(row.end_date);
      const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...row, days_overdue: daysOverdue };
    });

    res.json(overdue);
  } catch (err: unknown) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'getOverdueContracts failed'
    );
    res.status(500).json({ error: 'Gagal memuat data kontrak overdue.' });
  }
}
