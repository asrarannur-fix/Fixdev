import type { Request, Response } from 'express';
import { z } from 'zod';
import { dbTransaction, dbQuery } from '../../lib/db.js';
import { ensureAccount, paymentDebitAccountCode } from '../lib/coa.js';

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

const createContractSchema = z.object({
  customerId: z.string().uuid(),
  deviceId: z.string().uuid(),
  startDate: z.string().date().optional(),
  endDate: z.string().date(),
  depositAmount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const returnContractSchema = z.object({
  damageDeductionAmount: z.number().int().min(0).optional(),
  damageNotes: z.string().optional(),
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

// Helper: get tenantId from request
function getTenantId(req: Request): string {
  return req.tenantId!;
}

// Helper: get userId from request
function getUserId(req: Request): string | undefined {
  return req.authActor?.userId;
}

// Helper: get branchId from request
function getBranchId(req: Request): string | undefined {
  return req.branchId;
}

// Helper: generate contract number
async function generateContractNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RNT-${year}-`;
  const result = await dbQuery(
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
  metadata: Record<string, any> = {},
  userId?: string
) {
  await dbQuery(
    `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, contractId, eventType, description, JSON.stringify(metadata), userId]
  );
}

// ========== CATALOG CONTROLLER ==========

export async function listCatalog(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { activeOnly } = req.query;

  let query = `SELECT * FROM rental_device_catalog WHERE tenant_id = $1`;
  const params: any[] = [tenantId];

  if (activeOnly === 'true') {
    query += ` AND is_active = true`;
  }
  query += ` ORDER BY category, name`;

  const result = await dbQuery(query, params);
  res.json(result.rows);
}

export async function getCatalog(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const result = await dbQuery(
    `SELECT * FROM rental_device_catalog WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Catalog item not found' });
  res.json(result.rows[0]);
}

export async function createCatalog(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const data = createCatalogSchema.parse(req.body);

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
}

export async function updateCatalog(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const data = updateCatalogSchema.parse(req.body);

  const fields: string[] = [];
  const values: any[] = [id, tenantId];
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
}

export async function deleteCatalog(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  // Check if any devices reference this catalog
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
}

// ========== DEVICE CONTROLLER ==========

export async function listDevices(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { status, catalogId, branchId, available } = req.query;

  let query = `
    SELECT d.*, c.name as catalog_name, c.category, c.rate_per_day, c.deposit_amount
    FROM rental_devices d
    JOIN rental_device_catalog c ON d.catalog_id = c.id
    WHERE d.tenant_id = $1
  `;
  const params: any[] = [tenantId];
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
}

export async function getDevice(req: Request, res: Response) {
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
}

export async function createDevice(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const branchId = getBranchId(req);
  const data = createDeviceSchema.parse(req.body);

  // Verify catalog exists and belongs to tenant
  const catalogCheck = await dbQuery(
    `SELECT id, rate_per_day, deposit_amount FROM rental_device_catalog WHERE id = $1 AND tenant_id = $2`,
    [data.catalogId, tenantId]
  );
  if (catalogCheck.rows.length === 0)
    return res.status(404).json({ error: 'Catalog item not found' });

  // Check serial number uniqueness
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
}

export async function updateDevice(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const data = updateDeviceSchema.parse(req.body);

  const fields: string[] = [];
  const values: any[] = [id, tenantId];
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
}

export async function deleteDevice(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  // Check if device has active contracts
  const contractCheck = await dbQuery(
    `SELECT 1 FROM rental_contracts WHERE device_id = $1 AND tenant_id = $2 AND status IN ('ACTIVE', 'OVERDUE') LIMIT 1`,
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
}

// ========== CONTRACT CONTROLLER ==========

export async function listContracts(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { status, customerId, deviceId, startDate, endDate, page = '1', limit = '50' } = req.query;

  let query = `
    SELECT rc.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
           d.serial_number, cat.name as device_name, cat.category as device_category
    FROM rental_contracts rc
    JOIN customers c ON rc.customer_id = c.id
    JOIN rental_devices d ON rc.device_id = d.id
    JOIN rental_device_catalog cat ON d.catalog_id = cat.id
    WHERE rc.tenant_id = $1
  `;
  const params: any[] = [tenantId];
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
  params.push(
    parseInt(limit as string),
    (parseInt(page as string) - 1) * parseInt(limit as string)
  );

  const result = await dbQuery(query, params);

  // Count total
  let countQuery = `SELECT COUNT(*) FROM rental_contracts WHERE tenant_id = $1`;
  const countParams: any[] = [tenantId];
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
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit as string)),
    },
  });
}

export async function getContract(req: Request, res: Response) {
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
}

export async function getContractWithEvents(req: Request, res: Response) {
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
    `SELECT * FROM rental_contract_events WHERE contract_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  const paymentsResult = await dbQuery(
    `SELECT * FROM rental_payments WHERE contract_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  const inspectionsResult = await dbQuery(
    `SELECT * FROM rental_inspections WHERE contract_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  res.json({
    contract: contractResult.rows[0],
    events: eventsResult.rows,
    payments: paymentsResult.rows,
    inspections: inspectionsResult.rows,
  });
}

export async function createContract(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const branchId = getBranchId(req);
  const data = createContractSchema.parse(req.body);

  // Validate customer
  const customerCheck = await dbQuery(`SELECT id FROM customers WHERE id = $1 AND tenant_id = $2`, [
    data.customerId,
    tenantId,
  ]);
  if (customerCheck.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

  // Validate device availability
  const deviceCheck = await dbQuery(
    `SELECT d.*, cat.name as device_name, cat.rate_per_day, cat.deposit_amount
     FROM rental_devices d
     JOIN rental_device_catalog cat ON d.catalog_id = cat.id
     WHERE d.id = $1 AND d.tenant_id = $2 AND d.status = 'AVAILABLE'`,
    [data.deviceId, tenantId]
  );
  if (deviceCheck.rows.length === 0)
    return res.status(400).json({ error: 'Device not available or not found' });

  const device = deviceCheck.rows[0];
  const startDate = data.startDate || new Date().toISOString().split('T')[0];
  const endDate = data.endDate;
  const dailyRate = device.rate_per_day;
  const durationDays =
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const totalRent = dailyRate * durationDays;
  const depositAmount = data.depositAmount ?? device.deposit_amount;
  const contractNumber = await generateContractNumber(tenantId);

  // Use transaction for contract creation + device status update
  const contract = await dbTransaction(async (client) => {
    const contractResult = await client.query(
      `INSERT INTO rental_contracts 
       (tenant_id, contract_number, branch_id, customer_id, device_id, start_date, end_date, 
        duration_days, daily_rate, total_rent, deposit_amount, deposit_paid, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'DRAFT', $13)
       RETURNING *`,
      [
        tenantId,
        contractNumber,
        branchId ?? null,
        data.customerId,
        data.deviceId,
        startDate,
        endDate,
        durationDays,
        dailyRate,
        totalRent,
        depositAmount,
        0,
        data.notes ?? null,
      ]
    );

    // Update device status to RENTED
    await client.query(
      `UPDATE rental_devices SET status = 'RENTED', current_location = 'CUSTOMER' WHERE id = $1`,
      [data.deviceId]
    );

    // Log event
    await client.query(
      `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
       VALUES ($1, $2, 'CREATED', $3, $4, $5)`,
      [
        tenantId,
        contractResult.rows[0].id,
        `Contract created: ${contractNumber}`,
        JSON.stringify({ contractNumber }),
        userId,
      ]
    );

    return contractResult.rows[0];
  });

  res.status(201).json(contract);
}

export async function returnContract(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;
  const { damageDeductionAmount, damageNotes } = returnContractSchema.parse(req.body);

  const contract = await dbTransaction(async (client) => {
    // Get contract with device
    const contractResult = await client.query(
      `SELECT rc.*, d.id as device_id, d.serial_number
       FROM rental_contracts rc
       JOIN rental_devices d ON rc.device_id = d.id
       WHERE rc.id = $1 AND rc.tenant_id = $2 AND rc.status IN ('ACTIVE', 'OVERDUE')`,
      [id, tenantId]
    );
    if (contractResult.rows.length === 0) {
      throw new Error('Contract not found or not active');
    }
    const c = contractResult.rows[0];

    const actualReturnDate = new Date().toISOString().split('T')[0];
    const damageDeduction = damageDeductionAmount || 0;
    const depositRefund = Math.max(0, c.deposit_paid - damageDeduction);

    // Update contract
    const updateResult = await client.query(
      `UPDATE rental_contracts 
       SET status = 'RETURNED', actual_return_date = $1, damage_deduction = $2, damage_notes = $3, deposit_paid = $4, updated_at = now()
       WHERE id = $5 RETURNING *`,
      [actualReturnDate, damageDeduction, damageNotes || null, depositRefund, id]
    );

    // Update device status back to AVAILABLE
    await client.query(
      `UPDATE rental_devices SET status = 'AVAILABLE', current_location = 'WAREHOUSE' WHERE id = $1`,
      [c.device_id]
    );

    // Log event
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

    // If there's damage deduction, log it
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

    // If deposit refunded, log it
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

  res.json(contract);
}

export async function extendContract(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;
  const { additionalDays } = req.body;

  const contract = await dbTransaction(async (client) => {
    const contractResult = await client.query(
      `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2 AND status IN ('ACTIVE', 'OVERDUE')`,
      [id, tenantId]
    );
    if (contractResult.rows.length === 0) {
      throw new Error('Contract not found or not active');
    }
    const c = contractResult.rows[0];

    const newEndDate = new Date(c.end_date);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);
    const newDurationDays = c.duration_days + additionalDays;
    const additionalRent = c.daily_rate * additionalDays;
    const newTotalRent = c.total_rent + additionalRent;

    const updateResult = await client.query(
      `UPDATE rental_contracts 
       SET end_date = $1, duration_days = $2, total_rent = $3, status = 'EXTENDED', updated_at = now()
       WHERE id = $4 RETURNING *`,
      [newEndDate.toISOString().split('T')[0], newDurationDays, newTotalRent, id]
    );

    // Log event
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

  res.json(contract);
}

export async function cancelContract(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;

  const contract = await dbTransaction(async (client) => {
    const contractResult = await client.query(
      `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2 AND status IN ('DRAFT', 'ACTIVE', 'OVERDUE')`,
      [id, tenantId]
    );
    if (contractResult.rows.length === 0) {
      throw new Error('Contract not found or cannot be cancelled');
    }
    const c = contractResult.rows[0];

    // Update device status
    await client.query(
      `UPDATE rental_devices SET status = 'AVAILABLE', current_location = 'WAREHOUSE' WHERE id = $1`,
      [c.device_id]
    );

    // Update contract
    const updateResult = await client.query(
      `UPDATE rental_contracts SET status = 'CANCELLED', updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );

    // Log event
    await client.query(
      `INSERT INTO rental_contract_events (tenant_id, contract_id, event_type, description, metadata, user_id)
       VALUES ($1, $2, 'CANCELLED', $3, $4, $5)`,
      [tenantId, id, 'Contract cancelled', JSON.stringify({}), userId]
    );

    return updateResult.rows[0];
  });

  res.json(contract);
}

// ========== PAYMENTS ==========

export async function listPayments(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { contractId, paymentType } = req.query;

  let query = `SELECT * FROM rental_payments WHERE tenant_id = $1`;
  const params: any[] = [tenantId];
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
}

export async function createPayment(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const data = createPaymentSchema.parse(req.body);

  // Verify contract belongs to tenant
  const contractCheck = await dbQuery(
    `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2`,
    [data.contractId, tenantId]
  );
  if (contractCheck.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

  const payment = await dbTransaction(async (client) => {
    const paymentResult = await client.query(
      `INSERT INTO rental_payments 
       (tenant_id, contract_id, payment_type, amount, payment_method, reference_number, notes, received_by)
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

    // Update contract deposit_paid if DEPOSIT payment
    if (data.paymentType === 'DEPOSIT') {
      await client.query(
        `UPDATE rental_contracts SET deposit_paid = deposit_paid + $1 WHERE id = $2`,
        [data.amount, data.contractId]
      );
    }

    // Log event
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
}

// ========== INSPECTIONS ==========

export async function listInspections(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { contractId, inspectionType } = req.query;

  let query = `SELECT * FROM rental_inspections WHERE tenant_id = $1`;
  const params: any[] = [tenantId];
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
}

export async function createInspection(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const data = createInspectionSchema.parse(req.body);

  // Verify contract
  const contractCheck = await dbQuery(
    `SELECT * FROM rental_contracts WHERE id = $1 AND tenant_id = $2`,
    [data.contractId, tenantId]
  );
  if (contractCheck.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

  const result = await dbQuery(
    `INSERT INTO rental_inspections 
     (tenant_id, contract_id, inspection_type, condition_before, condition_after, damage_description, damage_photos, estimated_repair_cost, inspected_by)
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
}

export async function updateInspection(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const data = req.body;

  // Verify inspection belongs to tenant
  const check = await dbQuery(`SELECT 1 FROM rental_inspections WHERE id = $1 AND tenant_id = $2`, [
    id,
    tenantId,
  ]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Inspection not found' });

  const fields: string[] = [];
  const values: any[] = [id, tenantId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(data)) {
    if (
      value !== undefined &&
      key !== 'id' &&
      key !== 'tenant_id' &&
      key !== 'contract_id' &&
      key !== 'created_at'
    ) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${paramIndex}`);
      values.push(key === 'damage_photos' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const result = await dbQuery(
    `UPDATE rental_inspections SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    values
  );
  res.json(result.rows[0]);
}

// ========== STATS & OVERDUE ==========

export async function getRentalStats(req: Request, res: Response) {
  const tenantId = getTenantId(req);

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
      `SELECT COUNT(*) FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE')`,
      [tenantId]
    ),
    dbQuery(`SELECT COUNT(*) FROM rental_contracts WHERE tenant_id = $1 AND status = 'OVERDUE'`, [
      tenantId,
    ]),
    dbQuery(`SELECT COUNT(*) FROM rental_devices WHERE tenant_id = $1`, [tenantId]),
    dbQuery(`SELECT COUNT(*) FROM rental_devices WHERE tenant_id = $1 AND status = 'AVAILABLE'`, [
      tenantId,
    ]),
    dbQuery(`SELECT COUNT(*) FROM rental_devices WHERE tenant_id = $1 AND status = 'RENTED'`, [
      tenantId,
    ]),
    dbQuery(`SELECT COUNT(*) FROM rental_devices WHERE tenant_id = $1 AND status = 'MAINTENANCE'`, [
      tenantId,
    ]),
    dbQuery(
      `SELECT COALESCE(SUM(total_rent), 0) as total FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE', 'RETURNED', 'EXTENDED')`,
      [tenantId]
    ),
    dbQuery(
      `SELECT COALESCE(SUM(deposit_amount - deposit_paid), 0) as total FROM rental_contracts WHERE tenant_id = $1 AND status IN ('ACTIVE', 'OVERDUE')`,
      [tenantId]
    ),
    dbQuery(
      `SELECT COALESCE(AVG(duration_days), 0) as avg FROM rental_contracts WHERE tenant_id = $1 AND status IN ('RETURNED', 'ACTIVE', 'OVERDUE', 'EXTENDED')`,
      [tenantId]
    ),
  ]);

  res.json({
    active_contracts: parseInt(activeContracts.rows[0].count),
    overdue_contracts: parseInt(overdueContracts.rows[0].count),
    total_devices: parseInt(totalDevices.rows[0].count),
    available_devices: parseInt(availableDevices.rows[0].count),
    rented_devices: parseInt(rentedDevices.rows[0].count),
    maintenance_devices: parseInt(maintenanceDevices.rows[0].count),
    total_revenue: parseFloat(revenueResult.rows[0].total),
    pending_deposits: parseFloat(depositResult.rows[0].total),
    avg_rental_duration: parseFloat(avgDurationResult.rows[0].avg),
  });
}

export async function getOverdueContracts(req: Request, res: Response) {
  const tenantId = getTenantId(req);

  const result = await dbQuery(
    `SELECT rc.id, rc.contract_number, c.name as customer_name, c.phone as customer_phone,
            cat.name as device_name, rc.end_date, rc.daily_rate, rc.deposit_amount, rc.total_rent
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
}
