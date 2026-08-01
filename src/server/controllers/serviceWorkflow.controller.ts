import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getStorage, safeStoragePath } from '../lib/storage.js';
import type { Request, Response } from 'express';
import { dbTransaction, dbQuery } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { ensureAccount, paymentDebitAccountCode } from '../lib/coa.js';
import {
  SERVICE_TRANSITIONS as DOMAIN_SERVICE_TRANSITIONS,
  canServiceTransition,
  serviceApprovalTransition,
} from '../../domain/serviceWorkflow.js';
import {
  partOrderSchema,
  partOrderUpdateSchema,
  partArrivalSchema,
  additionalCostSchema,
  transitionSchema,
  diagnosisSchema,
  photo,
  approvalSchema,
  intakeChecklistSchema,
  qcDraftSchema,
  qcSchema,
  handoverSchema,
  receivableSettlementSchema,
  bulkDeleteSchema,
  partSchema,
  workMetadataSchema,
} from './serviceWorkflow.schemas.js';
import { queueNotification } from './serviceWorkflow.notifications.js';
import { timelineAggregate } from './serviceWorkflow.timeline.js';
export { partOrderUpdateSchema } from './serviceWorkflow.schemas.js';

export const SERVICE_TRANSITIONS: Record<string, string[]> = DOMAIN_SERVICE_TRANSITIONS;

export function canTransition(from: string, to: string): boolean {
  return canServiceTransition(
    from as keyof typeof SERVICE_TRANSITIONS,
    to as keyof typeof SERVICE_TRANSITIONS
  );
}

export function calculateServiceInvoice(
  estimatedCost: number,
  downPayment: number,
  taxRate = 0,
  taxInclusive = false
) {
  const subtotal = Math.max(0, Number(estimatedCost) || 0);
  const normalizedTaxRate = Math.max(0, taxRate);
  const taxAmount = Math.round(
    taxInclusive && normalizedTaxRate > 0
      ? subtotal - subtotal / (1 + normalizedTaxRate / 100)
      : subtotal * (normalizedTaxRate / 100)
  );
  const total = taxInclusive ? subtotal : subtotal + taxAmount;
  const downPaymentUsed = Math.min(total, Math.max(0, Number(downPayment) || 0));
  return { subtotal, taxAmount, total, downPaymentUsed, amountDue: total - downPaymentUsed };
}

export function calculateAdditionalCost(previousCost: number, amount: number) {
  const previous = Math.max(0, Number(previousCost) || 0);
  const additional = Math.max(0, Number(amount) || 0);
  return { previousCost: previous, additionalCost: additional, newCost: previous + additional };
}

const SERVICE_PHOTO_BYTES = 5 * 1024 * 1024;
const storage = getStorage();
export const SERVICE_PHOTO_WRITE_MODE = "flag: 'wx'";
export const SERVICE_PHOTO_ROLLBACK = 'await fs.unlink(target).catch(() => undefined);';

function servicePhotoPath(tenantId: string, ticketId: string, fileId: string, extension: string) {
  return `tenant/${tenantId}/service/${ticketId}/${fileId}.${extension}`;
}

function validTicketPhotos(values: string[], tenantId: string, ticketId: string) {
  const prefix = `tenant/${tenantId}/service/${ticketId}/`;
  return values.every((value) => value.startsWith(prefix) && photo.safeParse(value).success);
}

export const serviceLocalPath = safeStoragePath;

async function cleanupServicePhotos(objectPaths: unknown[]) {
  const paths = objectPaths.filter((value): value is string => photo.safeParse(value).success);
  const results = await Promise.allSettled(paths.map((objectPath) => storage.delete(objectPath)));
  return results.filter((result) => result.status === 'fulfilled' || result.reason?.code === 'ENOENT').length;
}

function validPhotoSignature(buffer: Buffer, contentType: string) {
  return contentType === 'image/png'
    ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : contentType === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function ticketSelect(prefix = '') {
  return `${prefix}id, ${prefix}tenant_id AS "tenantId", ${prefix}branch_id AS "branchId", ${prefix}ticket_no AS "ticketNo",
    ${prefix}customer_id AS "customerId", ${prefix}device_name AS "deviceName", ${prefix}device_serial AS "deviceSerial",
    ${prefix}device_brand_model AS "deviceBrandModel", ${prefix}customer_complaints AS "customerComplaints",
    ${prefix}tech_diagnosis AS "techDiagnosis", ${prefix}estimated_cost::float AS "estimatedCost",
    ${prefix}customer_approval_status AS "customerApprovalStatus", ${prefix}assigned_tech_id AS "assignedTechId",
    ${prefix}parts_requested AS "partsRequested", ${prefix}parts_used AS "partsUsed", ${prefix}initial_checklist AS "initialChecklist",
    ${prefix}initial_photos AS "initialPhotos", ${prefix}accessories_left AS "accessoriesLeft", ${prefix}custom_accessories AS "customAccessories",
    ${prefix}physical_condition AS "physicalCondition", ${prefix}estimated_completion_date AS "estimatedCompletionDate",
    ${prefix}captured_conditions AS "capturedConditions", ${prefix}dynamic_fields AS "dynamicFields", ${prefix}storage_location_id AS "storageLocationId",
    ${prefix}internal_discussions AS "internalDiscussions", ${prefix}tech_pre_checklist AS "techPreChecklist",
    ${prefix}tech_post_checklist AS "techPostChecklist", ${prefix}technician_notes AS "technicianNotes",
    ${prefix}repair_start_time AS "repairStartTime", ${prefix}repair_end_time AS "repairEndTime",
    ${prefix}qc_checklist AS "qcChecklist", ${prefix}qc_photos AS "qcPhotos", ${prefix}qc_notes AS "qcNotes", ${prefix}qc_status AS "qcStatus",
    ${prefix}status, ${timelineAggregate(prefix)}, ${prefix}warranty_months AS "warrantyMonths", ${prefix}warranty_ends_at AS "warrantyEndsAt",
    ${prefix}down_payment::float AS "downPayment", ${prefix}payment_method AS "paymentMethod", ${prefix}payment_ref AS "paymentRef",
    ${prefix}payment_proof_name AS "paymentProofName", ${prefix}tempo_days AS "tempoDays", ${prefix}handover_at AS "handoverAt",
    ${prefix}invoice_id AS "invoiceId", ${prefix}public_tracking_token AS "publicTrackingToken", ${prefix}created_at AS "createdAt"`;
}

async function requireTicketStorageLocation(client: any, ticket: any, locationId: string) {
  const result = await client.query(
    `SELECT record_id FROM module_records
     WHERE record_id=$1 AND tenant_id=$2 AND module='storage_locations' AND deleted_at IS NULL
       AND payload->>'branchId'=$3 LIMIT 1`,
    [locationId, ticket.tenantId, ticket.branchId]
  );
  if (!result.rows[0]) {
    const error: any = new Error('Lokasi penyimpanan tidak tersedia pada cabang tiket.');
    error.status = 403;
    throw error;
  }
}

async function requireTicketWarehouse(client: any, ticket: any, warehouseId: string) {
  const result = await client.query(
    'SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 LIMIT 1',
    [warehouseId, ticket.tenantId, ticket.branchId]
  );
  if (!result.rows[0]) {
    const error: any = new Error('Gudang tidak tersedia pada cabang tiket.');
    error.status = 403;
    throw error;
  }
}

async function lockedTicket(client: any, req: Request) {
  const result = await client.query(
    `SELECT ${ticketSelect()} FROM service_tickets
     WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL FOR UPDATE`,
    [req.params.id, req.tenantId, req.branchId || req.headers['x-branch-id']]
  );
  const ticket = result.rows[0];
  if (!ticket) {
    const error: any = new Error('Tiket servis tidak ditemukan.');
    error.status = 404;
    throw error;
  }
  return ticket;
}

async function appendEvent(
  client: any,
  req: Request,
  ticket: any,
  toStatus: string,
  note: string,
  metadata: any = {},
  templateCategory = 'SERVICE_UPDATE',
  allowSame = false
) {
  const sameStatus = ticket.status === toStatus;
  if (!sameStatus && !canTransition(ticket.status, toStatus)) {
    const error: any = new Error(`Transisi ${ticket.status} ke ${toStatus} tidak diizinkan.`);
    error.status = 409;
    throw error;
  }
  if (sameStatus && !allowSame) {
    const error: any = new Error(`Tiket sudah berstatus ${toStatus}.`);
    error.status = 409;
    throw error;
  }
  const event = {
    id: undefined,
    status: toStatus,
    note,
    timestamp: new Date().toISOString(),
    operator: req.authActor?.email || req.authActor?.userId || 'System',
  };
  const inserted = await client.query(
    `INSERT INTO service_status_events (tenant_id,ticket_id,from_status,to_status,note,actor_user_id,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
    [
      req.tenantId,
      ticket.id,
      ticket.status,
      toStatus,
      note,
      req.authActor?.userId,
      JSON.stringify(metadata),
    ]
  );
  event.id = inserted.rows[0].id;
  await client.query(
    `UPDATE service_tickets SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND branch_id=$4`,
    [toStatus, ticket.id, req.tenantId, ticket.branchId]
  );
  ticket.status = toStatus;
  ticket.timeline = [...(ticket.timeline || []), event];
  await client.query('SAVEPOINT service_notification');
  try {
    await queueNotification(
      client,
      req.tenantId!,
      ticket,
      inserted.rows[0].id,
      note,
      templateCategory,
      { toStatus, note, metadata }
    );
  } catch (error: any) {
    await client.query('ROLLBACK TO SAVEPOINT service_notification');
    logger.error({ err: error.message, tenantId: req.tenantId, ticketId: ticket.id }, '[service] notification queue failed');
  }
  await client.query('RELEASE SAVEPOINT service_notification');
  return ticket;
}

async function finalTicket(client: any, req: Request) {
  const branchId = req.branchId || String(req.headers['x-branch-id'] || '');
  return (
    await client.query(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL`,
      [req.params.id, req.tenantId, branchId]
    )
  ).rows[0];
}

function sendError(res: Response, error: any) {
  const isAppError = !!error.status;
  return res.status(error.status || 500).json({
    error: isAppError ? error.message || 'Workflow servis gagal.' : 'Workflow servis gagal.',
  });
}

function logServiceOperation(req: Request, operation: string, outcome: 'success' | 'rejected' | 'failed', startedAt: number, details: Record<string, unknown> = {}) {
  const fields = { operation, outcome, statusCode: outcome === 'success' ? 200 : Number(details.statusCode) || 500, durationMs: Date.now() - startedAt, tenantId: req.tenantId, branchId: req.branchId, ...details };
  if (outcome === 'failed') logger.error(fields, '[service] operation failed');
  else if (outcome === 'rejected') logger.warn(fields, '[service] operation rejected');
  else logger.info(fields, '[service] operation completed');
}

export async function createServicePhotoUpload(req: Request, res: Response) {
  const contentType = String(req.body?.contentType || '');
  const sizeBytes = Number(req.body?.sizeBytes);
  const conditionId = req.body?.conditionId ? String(req.body.conditionId) : '';
  if (!['image/jpeg', 'image/png'].includes(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > SERVICE_PHOTO_BYTES)
    return res.status(422).json({ error: 'Foto harus JPG atau PNG maksimal 5 MB.' });
  if (conditionId && !/^[\w-]{1,200}$/.test(conditionId)) return res.status(422).json({ error: 'Kondisi foto tidak valid.' });
  const objectPath = servicePhotoPath(req.tenantId!, req.params.id, randomUUID(), contentType === 'image/png' ? 'png' : 'jpg');
  const photoUrl = `/api/services/${req.params.id}/photos/${path.basename(objectPath)}`;
  const uploadUrl = conditionId ? `${photoUrl}?conditionId=${encodeURIComponent(conditionId)}` : photoUrl;
  res.json({ objectPath, photoUrl, uploadUrl, conditionId: conditionId || null, expiresIn: 60 });
}

export async function listServicePhotos(req: Request, res: Response) {
  try {
    const ticket = await dbQuery(
      'SELECT initial_photos, qc_photos FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL',
      [req.params.id, req.tenantId, req.branchId]
    );
    if (!ticket.rows[0]) return res.status(404).json({ error: 'Tiket servis tidak ditemukan.' });
    const photos = [...(ticket.rows[0].initial_photos || []), ...(ticket.rows[0].qc_photos || [])]
      .filter((value, index, values) => typeof value === 'string' && values.indexOf(value) === index);
    res.json({ data: photos });
  } catch (error: any) {
    return sendError(res, error);
  }
}

export async function deleteServicePhoto(req: Request, res: Response) {
  const fileName = path.basename(req.params.fileName || '');
  if (!/^[0-9a-f-]+\.(jpg|png)$/i.test(fileName)) return res.status(404).end();
  try {
    const objectPath = servicePhotoPath(req.tenantId!, req.params.id, fileName.replace(/\.(jpg|png)$/i, ''), fileName.endsWith('.png') ? 'png' : 'jpg');
    const result = await dbQuery(
      `UPDATE service_tickets SET initial_photos=COALESCE(initial_photos,'[]'::jsonb)-$1, qc_photos=COALESCE(qc_photos,'[]'::jsonb)-$1, updated_at=NOW()
       WHERE id=$2 AND tenant_id=$3 AND branch_id=$4 AND deleted_at IS NULL
       RETURNING id`,
      [objectPath, req.params.id, req.tenantId, req.branchId]
    );
    if (!result.rows[0]) return res.status(404).end();
    await storage.delete(objectPath).catch((error: any) => {
      if (error.code !== 'ENOENT') logger.error({ err: error.message, tenantId: req.tenantId, ticketId: req.params.id, objectPath }, '[service-photo] storage delete failed');
    });
    logger.info({ tenantId: req.tenantId, ticketId: req.params.id, objectPath, rows: result.rowCount }, '[service-photo] deleted');
    return res.status(204).end();
  } catch (error: any) {
    return sendError(res, error);
  }
}

export async function uploadServicePhoto(req: Request, res: Response) {
  const startedAt = Date.now();
  const fileName = path.basename(req.params.fileName || '');
  const contentType = String(req.headers['content-type'] || '').split(';')[0];
  const conditionId = typeof req.query.conditionId === 'string' ? req.query.conditionId : '';
  if (!/^[0-9a-f-]+\.(jpg|png)$/i.test(fileName) || (contentType === 'image/jpeg' && !fileName.endsWith('.jpg')) || (contentType === 'image/png' && !fileName.endsWith('.png')) || !Buffer.isBuffer(req.body) || req.body.length < 1 || req.body.length > SERVICE_PHOTO_BYTES || !validPhotoSignature(req.body, contentType))
    return res.status(422).json({ error: 'File foto tidak valid.' });
  if (conditionId && !/^[\w-]{1,200}$/.test(conditionId)) return res.status(422).json({ error: 'Kondisi foto tidak valid.' });
  const objectPath = servicePhotoPath(req.tenantId!, req.params.id, fileName.replace(/\.(jpg|png)$/i, ''), fileName.endsWith('.png') ? 'png' : 'jpg');
  try {
    await dbTransaction(async (client) => {
      const locked = await lockedTicket(client, req);
      const capturedConditions = Array.isArray(locked.capturedConditions) ? locked.capturedConditions : [];
      if (conditionId && !capturedConditions.some((condition: any) => condition?.id === conditionId)) {
        const error: any = new Error('Kondisi tiket tidak ditemukan.');
        error.status = 422;
        throw error;
      }
    });
    await storage.write(objectPath, req.body);
    const ticket = await dbTransaction(async (client) => {
      const locked = await lockedTicket(client, req);
      const capturedConditions = Array.isArray(locked.capturedConditions) ? locked.capturedConditions : [];
      if (conditionId && !capturedConditions.some((condition: any) => condition?.id === conditionId)) {
        const error: any = new Error('Kondisi tiket tidak ditemukan.');
        error.status = 422;
        throw error;
      }
      const updatedConditions = conditionId
        ? capturedConditions.map((condition: any) => condition?.id === conditionId ? { ...condition, photoUrl: objectPath, url: objectPath } : condition)
        : capturedConditions;
      const updated = await client.query(
`UPDATE service_tickets SET initial_photos=CASE WHEN $6::text = '' AND NOT (COALESCE(initial_photos, '[]'::jsonb) ? $1) THEN COALESCE(initial_photos, '[]'::jsonb) || to_jsonb($1::text) ELSE initial_photos END,
          qc_photos=CASE WHEN $6::text <> '' AND NOT (COALESCE(qc_photos, '[]'::jsonb) ? $1) THEN COALESCE(qc_photos, '[]'::jsonb) || to_jsonb($1::text) ELSE qc_photos END,
          captured_conditions=$2::jsonb, updated_at=NOW()
         WHERE id=$3 AND tenant_id=$4 AND branch_id=$5 RETURNING ${ticketSelect()}`,
        [objectPath, JSON.stringify(updatedConditions), req.params.id, req.tenantId, req.branchId || req.headers['x-branch-id'], conditionId]
      );
      await client.query(
        'INSERT INTO audit_logs(id,tenant_id,user_id,action,details) VALUES(gen_random_uuid(),$1,$2,$3,$4)',
        [req.tenantId, req.authActor?.userId || null, 'SERVICE_PHOTO_UPLOADED', `Foto ${objectPath} ditambahkan ke tiket ${req.params.id}`]
      );
      return updated.rows[0];
    });
    logServiceOperation(req, 'photo_upload', 'success', startedAt, { bytes: req.body.length });
    return res.status(200).json({ data: ticket, photoUrl: `/api/services/${req.params.id}/photos/${fileName}` });
  } catch (error: any) {
    if (error.code !== 'EEXIST') await storage.delete(objectPath).catch(() => undefined);
    if (error.code === 'EEXIST') {
      logServiceOperation(req, 'photo_upload', 'rejected', startedAt, { statusCode: 409, reason: 'duplicate_file' });
      return res.status(409).json({ error: 'Foto sudah diunggah.' });
    }
    logServiceOperation(req, 'photo_upload', 'failed', startedAt, { statusCode: Number(error.status) || 500, errorCode: error.code || 'unknown' });
    return sendError(res, error);
  }
}

export async function getServicePhoto(req: Request, res: Response) {
  const fileName = path.basename(req.params.fileName || '');
  if (!/^[0-9a-f-]+\.(jpg|png)$/i.test(fileName)) return res.status(404).end();
  try {
    const ticket = await dbQuery(
      'SELECT initial_photos, qc_photos FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL',
      [req.params.id, req.tenantId, req.branchId]
    );
    const objectPath = servicePhotoPath(req.tenantId!, req.params.id, fileName.replace(/\.(jpg|png)$/i, ''), fileName.endsWith('.png') ? 'png' : 'jpg');
    const registered = [...(ticket.rows[0]?.initial_photos || []), ...(ticket.rows[0]?.qc_photos || [])].includes(objectPath);
    if (!registered) return res.status(404).end();
    res.type(fileName.endsWith('.png') ? 'png' : 'jpg').send(await storage.read(objectPath));
  } catch (error: any) {
    if (error.code === 'ENOENT') return res.status(404).end();
    return sendError(res, error);
  }
}

function buildServiceTicketQuery(req: Request) {
  const branchId = req.branchId || String(req.query.branchId || req.headers['x-branch-id'] || '');
  const query = String(req.query.q || '').trim().slice(0, 200);
  const status = String(req.query.status || '').trim();
  const technician = String(req.query.technician || req.query.tech || '').trim();
  const group = String(req.query.group || '').trim();
  const sla = String(req.query.sla || '').trim();
  const from = String(req.query.from || req.query.dateFrom || '').trim();
  const to = String(req.query.to || req.query.dateTo || '').trim();
  const sort = String(req.query.sort || 'newest');
  const sortMap: Record<string, string> = { newest: 'st.created_at DESC', oldest: 'st.created_at ASC', cost_desc: 'st.estimated_cost DESC', cost_asc: 'st.estimated_cost ASC', urgent: 'st.estimated_completion_date ASC NULLS LAST, st.created_at ASC' };
  const values: any[] = [req.tenantId, branchId];
  const filters = ['st.tenant_id=$1', 'st.branch_id=$2', 'st.deleted_at IS NULL'];
  const add = (sql: string, value: any) => { values.push(value); filters.push(sql.replace('$N', `$${values.length}`)); };
  if (query) add(`(st.ticket_no ILIKE $N OR st.device_name ILIKE $N OR st.device_brand_model ILIKE $N OR c.name ILIKE $N)`, `%${query}%`);
  if (status && status !== 'ALL') add('st.status=$N', status);
  if (technician === 'unassigned') filters.push('st.assigned_tech_id IS NULL');
  else if (technician && technician !== 'ALL') add('st.assigned_tech_id=$N', technician);
  const groups: Record<string, string[]> = { diagnosis: ['DITERIMA', 'ANTRIAN'], approval: ['ESTIMATE_PENDING', 'MENUGGU_APPROVAL'], repair: ['SEDANG_DIKERJAKAN', 'REWORK'], qc: ['QC'], pickup: ['SIAP_DIAMBIL'] };
  if (groups[group]) { values.push(groups[group]); filters.push(`st.status = ANY($${values.length})`); }
  if (from) add('st.created_at >= $N::timestamptz', from);
  if (to) add('st.created_at < ($N::date + INTERVAL \'1 day\')', to);
  if (sla === 'overdue') filters.push("st.created_at < NOW() - INTERVAL '48 hours' AND st.status NOT IN ('DIAMBIL','DIBATALKAN','TIDAK_BISA_DIPERBAIKI','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','RUSAK')");
  if (sla === 'on-track') filters.push("(st.created_at >= NOW() - INTERVAL '48 hours' OR st.status IN ('SELESAI','DIAMBIL'))");
  return { where: filters.join(' AND '), values, sortSql: sortMap[sort] || sortMap.newest };
}

const CSV_TICKET_HEADER = ['Ticket No', 'Device', 'Customer', 'Status', 'Estimated Cost'];
function csvCell(v: unknown) {
  const s = String(v ?? '');
  return `"${(/^[=+@-]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
}
function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',');
}

export async function listServiceTickets(req: Request, res: Response) {
  try {
    const branchId = req.branchId || String(req.query.branchId || req.headers['x-branch-id'] || '');
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
    const offset = Math.min(1_000_000, Math.max(0, Number.parseInt(String(req.query.offset || '0'), 10) || 0));
    const { where, values } = buildServiceTicketQuery(req);
    const base = `FROM service_tickets st LEFT JOIN customers c ON c.id=st.customer_id AND c.tenant_id=st.tenant_id WHERE ${where}`;
    const countResult = await dbQuery(`SELECT COUNT(*)::int AS total ${base}`, values);
    const kpiResult = await dbQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE st.status NOT IN ('DIAMBIL','DIBATALKAN','TIDAK_BISA_DIPERBAIKI','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','RUSAK'))::int AS active, COUNT(*) FILTER (WHERE st.created_at < NOW() - INTERVAL '48 hours' AND st.status NOT IN ('DIAMBIL','DIBATALKAN','TIDAK_BISA_DIPERBAIKI','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','RUSAK'))::int AS overdue, COALESCE(SUM(st.estimated_cost),0)::float AS estimated FROM service_tickets st LEFT JOIN customers c ON c.id=st.customer_id AND c.tenant_id=st.tenant_id WHERE ${where}`, values);
    const result = await dbQuery(`SELECT ${ticketSelect('st.')}, c.name AS "customerName" ${base} ORDER BY ${buildServiceTicketQuery(req).sortSql}, st.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    res.json({ data: result.rows, total: countResult.rows[0]?.total || 0, limit, offset, kpi: kpiResult.rows[0] || { total: 0, active: 0, overdue: 0, estimated: 0 } });
  } catch (error: any) { sendError(res, error); }
}

export async function exportServiceTickets(req: Request, res: Response) {
  try {
    const { where, values, sortSql } = buildServiceTicketQuery(req);
    const base = `FROM service_tickets st LEFT JOIN customers c ON c.id=st.customer_id AND c.tenant_id=st.tenant_id WHERE ${where}`;
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="service-tickets.csv"');
    res.write(`\ufeff${csvRow(CSV_TICKET_HEADER)}\r\n`);
    const pageSize = 500;
    let offset = 0;
    while (true) {
      const page = await dbQuery(
        `SELECT st.ticket_no AS "ticketNo", st.device_name AS "deviceName", c.name AS "customerName", st.status, st.estimated_cost::float AS "estimatedCost" ${base} ORDER BY ${sortSql}, st.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset]
      );
      if (!page.rows.length) break;
      for (const s of page.rows) {
        res.write(`${csvRow([s.ticketNo, s.deviceName, s.customerName, s.status, s.estimatedCost])}\r\n`);
      }
      offset += pageSize;
      if (page.rows.length < pageSize) break;
    }
    res.end();
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function getServiceTicket(req: Request, res: Response) {
  try {
    const result = await dbQuery(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND deleted_at IS NULL LIMIT 1`,
      [req.params.id, req.tenantId, req.branchId || req.headers['x-branch-id']]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Tiket servis tidak ditemukan.' });
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function transitionServiceTicket(req: Request, res: Response) {
  const startedAt = Date.now();
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Status atau catatan tidak valid.' });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      const to = parsed.data.status;
      // Status pasca-pembayaran WAJIB lewat handoverServiceTicket (potong stok,
      // catat pembayaran, jurnal, invoice). Mencegah unit keluar tanpa bayar.
      if (['DIAMBIL', 'MENUGGU_PEMBAYARAN', 'SIAP_DIAMBIL'].includes(to)) {
        const error: any = new Error(
          'Serah terima & pembayaran harus melalui proses handover, tidak bisa via ubah status manual.'
        );
        error.status = 409;
        throw error;
      }
      if (to === 'SELESAI' && current.qcStatus !== 'PASSED') {
        const error: any = new Error(
          'Tiket harus lulus QC (qcStatus=PASSED) sebelum dapat diselesaikan.'
        );
        error.status = 409;
        throw error;
      }
      if (
        to === 'SEDANG_DIKERJAKAN' &&
        ![
          'DIAGNOSA',
          'REWORK',
          'MENUGGU_SPAREPART',
          'APPROVAL_DITOLAK',
          'DIKIRIM_KE_VENDOR',
        ].includes(current.status)
      ) {
        const error: any = new Error(
          'Pengerjaan hanya dapat dimulai setelah diagnosis/approval atau dari REWORK/MENUGGU_SPAREPART.'
        );
        error.status = 409;
        throw error;
      }
      if (to === 'MENUGGU_APPROVAL' && !current.techDiagnosis) {
        const error: any = new Error(
          'Diagnosis harus diisi sebelum menunggu persetujuan pelanggan.'
        );
        error.status = 409;
        throw error;
      }
      await appendEvent(client, req, current, to, parsed.data.note);
      return finalTicket(client, req);
    });
    logServiceOperation(req, 'workflow_transition', 'success', startedAt, { toStatus: parsed.data.status });
    res.json({ data: ticket });
  } catch (error: any) {
    logServiceOperation(req, 'workflow_transition', error.status === 409 ? 'rejected' : 'failed', startedAt, { statusCode: Number(error.status) || 500, reason: error.status === 409 ? 'workflow_conflict' : 'exception' });
    sendError(res, error);
  }
}

export async function addStatusEvent(req: Request, res: Response) {
  const { status, note } = req.body;
  if (!status || !note) {
    return res.status(422).json({ error: 'Status dan catatan wajib diisi.' });
  }

  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (!canTransition(current.status, status)) {
        const error: any = new Error(`Transisi ${current.status} ke ${status} tidak diizinkan.`);
        error.status = 409;
        throw error;
      }
      await appendEvent(client, req, current, status, note);
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

/**
 * Get status events for a service ticket
 */
export async function getStatusEvents(req: Request, res: Response) {
  try {
    const result = await dbQuery(
      `SELECT id, ticket_id AS "ticketId", from_status AS "fromStatus", to_status AS "toStatus", 
             note, actor_user_id AS "actorUserId", metadata, created_at AS "createdAt"
       FROM service_status_events
WHERE ticket_id=$1 AND tenant_id=$2 AND EXISTS (
          SELECT 1 FROM service_tickets st
          WHERE st.id=$1 AND st.tenant_id=$2 AND st.branch_id=$3 AND st.deleted_at IS NULL
        )
        ORDER BY created_at ASC`,
       [req.params.id, req.tenantId, req.branchId]
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function updateServiceIntakeChecklist(req: Request, res: Response) {
  const parsed = intakeChecklistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Checklist penerimaan tidak valid.', details: parsed.error.flatten() });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (!['DITERIMA', 'ANTRIAN'].includes(current.status)) {
        const error: any = new Error('Checklist penerimaan hanya dapat diubah sebelum diagnosis.');
        error.status = 409;
        throw error;
      }
      await client.query(
        'UPDATE service_tickets SET initial_checklist=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND branch_id=$4',
        [JSON.stringify(parsed.data.checklist), current.id, req.tenantId, current.branchId]
      );
      await client.query(
        'INSERT INTO audit_logs(id,tenant_id,user_id,action,details) VALUES(gen_random_uuid(),$1,$2,$3,$4)',
        [req.tenantId, req.authActor?.userId || null, 'SERVICE_INTAKE_CHECKLIST_UPDATED', `Checklist penerimaan diperbarui untuk ${current.ticketNo}.`]
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function updateServiceQcDraft(req: Request, res: Response) {
  const parsed = qcDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Draft QC tidak valid.', details: parsed.error.flatten() });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (current.status !== 'QC') {
        const error: any = new Error('Draft QC hanya dapat diubah pada tahap QC.');
        error.status = 409;
        throw error;
      }
      if (parsed.data.photos && !validTicketPhotos(parsed.data.photos, req.tenantId!, current.id)) {
        const error: any = new Error('Foto QC tidak sesuai tiket aktif.');
        error.status = 422;
        throw error;
      }
      await client.query(
        `UPDATE service_tickets SET qc_notes=COALESCE($1,qc_notes),qc_checklist=COALESCE($2::jsonb,qc_checklist),
         qc_photos=COALESCE($3::jsonb,qc_photos),updated_at=NOW()
         WHERE id=$4 AND tenant_id=$5 AND branch_id=$6`,
        [parsed.data.notes ?? null, parsed.data.checklist === undefined ? null : JSON.stringify(parsed.data.checklist), parsed.data.photos === undefined ? null : JSON.stringify(parsed.data.photos), current.id, req.tenantId, current.branchId]
      );
      await client.query(
        'INSERT INTO audit_logs(id,tenant_id,user_id,action,details) VALUES(gen_random_uuid(),$1,$2,$3,$4)',
        [req.tenantId, req.authActor?.userId || null, 'SERVICE_QC_DRAFT_UPDATED', `Draft QC diperbarui untuk ${current.ticketNo}.`]
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function diagnoseService(req: Request, res: Response) {
  const parsed = diagnosisSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(422)
      .json({ error: 'Data diagnosis tidak valid.', details: parsed.error.flatten() });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (!['DITERIMA', 'ANTRIAN', 'DIAGNOSA', 'APPROVAL_DITOLAK'].includes(current.status)) {
        const error: any = new Error(
          `Diagnosis tidak dapat disimpan pada status ${current.status}.`
        );
        error.status = 409;
        throw error;
      }
      await client.query(
        "DELETE FROM service_parts WHERE ticket_id=$1 AND tenant_id=$2 AND status='REQUESTED'",
        [current.id, req.tenantId]
      );
      for (const part of parsed.data.parts) {
        // Validasi produk milik tenant aktif untuk mencegah cross-tenant stock write.
        const owned = await client.query(
          'SELECT id, name, sell_price FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1',
          [part.productId, req.tenantId]
        );
        if (!owned.rows[0]) {
          const error: any = new Error(`Produk part tidak ditemukan pada tenant aktif.`);
          error.status = 404;
          throw error;
        }
        if (part.warehouseId) {
          const wh = await client.query(
            'SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2 LIMIT 1',
            [part.warehouseId, req.tenantId]
          );
          if (!wh.rows[0]) {
            const error: any = new Error(`Gudang part tidak ditemukan pada tenant aktif.`);
            error.status = 404;
            throw error;
          }
          await requireTicketWarehouse(client, current, part.warehouseId);
        }
        await client.query(
          `INSERT INTO service_parts (tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'REQUESTED')`,
          [
            req.tenantId,
            current.id,
            part.productId,
            part.warehouseId || null,
            owned.rows[0].name,
            part.quantity,
            Number(owned.rows[0].sell_price) || 0,
            part.serialNumber || null,
          ]
        );
      }
      await client.query(
        `UPDATE service_tickets SET tech_diagnosis=$1,estimated_cost=$2,parts_requested=$3::jsonb,customer_approval_status='PENDING',updated_at=NOW()
         WHERE id=$4 AND tenant_id=$5`,
        [
          parsed.data.diagnosis,
          parsed.data.estimatedCost,
          JSON.stringify(parsed.data.parts),
          current.id,
          req.tenantId,
        ]
      );
      // A rejected estimate may be revised directly into a new approval request;
      // APPROVAL_DITOLAK -> DIAGNOSA is not a legal transition in the state machine.
      if (!['DIAGNOSA', 'APPROVAL_DITOLAK'].includes(current.status)) {
        await appendEvent(
          client,
          req,
          current,
          'DIAGNOSA',
          'Teknisi memulai dan menyelesaikan pemeriksaan unit.'
        );
      }
      await appendEvent(
        client,
        req,
        current,
        'MENUGGU_APPROVAL',
        'Diagnosis selesai dan estimasi menunggu persetujuan pelanggan.',
        { estimatedCost: parsed.data.estimatedCost }
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function approveServiceEstimate(req: Request, res: Response) {
  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Data persetujuan tidak valid.' });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (!['MENUGGU_APPROVAL', 'ESTIMATE_PENDING'].includes(current.status)) {
        const error: any = new Error('Tiket tidak sedang menunggu persetujuan.');
        error.status = 409;
        throw error;
      }
      const approval = serviceApprovalTransition(parsed.data.approved);
      await client.query(
        `UPDATE service_tickets SET customer_approval_status=$1,provisional_signature_name=$2,
          provisional_signature=$3,provisional_approved_at=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6`,
        [
          approval.approvalStatus,
          parsed.data.signatureName || null,
          parsed.data.signature || null,
          parsed.data.approved ? new Date() : null,
          current.id,
          req.tenantId,
        ]
      );
      await appendEvent(
        client,
        req,
        current,
        approval.status,
        parsed.data.approved
          ? 'Estimasi disetujui; pengerjaan dimulai.'
          : 'Estimasi ditolak pelanggan.'
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function completeServiceQc(req: Request, res: Response) {
  const parsed = qcSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Data QC tidak valid.' });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (current.status !== 'QC') {
        const error: any = new Error(
          `Hasil QC hanya dapat dicatat saat tiket berada di tahap QC (status saat ini: ${current.status}).`
        );
        error.status = 409;
        throw error;
      }
      if (!validTicketPhotos(parsed.data.photos, req.tenantId!, current.id)) {
        const error: any = new Error('Foto QC tidak sesuai tiket aktif.');
        error.status = 422;
        throw error;
      }
      const passed = parsed.data.checklist.every((item) => item.passed);
      if (passed) {
        const unresolved = await client.query(
          `SELECT COUNT(*)::int AS total FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status='REQUESTED'`,
          [req.tenantId, current.id]
        );
        if ((unresolved.rows[0]?.total || 0) > 0) {
          const error: any = new Error(
            'Masih ada spare part REQUESTED yang belum direservasi atau dibatalkan.'
          );
          error.status = 409;
          throw error;
        }
      }
      await client.query(
        `UPDATE service_tickets SET qc_notes=$1,qc_checklist=$2::jsonb,qc_photos=$3::jsonb,qc_status=$4,updated_at=NOW()
         WHERE id=$5 AND tenant_id=$6`,
        [
          parsed.data.notes,
          JSON.stringify(parsed.data.checklist),
          JSON.stringify(parsed.data.photos),
          passed ? 'PASSED' : 'FAILED',
          current.id,
          req.tenantId,
        ]
      );
      await appendEvent(
        client,
        req,
        current,
        passed ? 'SELESAI' : 'REWORK',
        passed ? 'QC lulus; semua pemeriksaan checklist berhasil.' : 'QC gagal; unit kembali ke rework.'
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function createServicePartOrder(req: Request, res: Response) {
  const parsed = partOrderSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(422)
      .json({ error: 'Data permintaan spare part tidak valid.', details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      if (!['DIAGNOSA', 'SEDANG_DIKERJAKAN', 'REWORK'].includes(ticket.status)) {
        const error: any = new Error(
          `Permintaan spare part tidak dapat dibuat pada status ${ticket.status}.`
        );
        error.status = 409;
        throw error;
      }
      const order = await client.query(
        `INSERT INTO service_part_orders(tenant_id,ticket_id,idempotency_key,part_name,quantity,reason,supplier_name,estimated_cost,estimated_arrival_date,cost_approved,note,created_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (tenant_id,idempotency_key) DO NOTHING RETURNING *`,
        [
          req.tenantId,
          ticket.id,
          parsed.data.idempotencyKey,
          parsed.data.partName,
          parsed.data.quantity,
          parsed.data.reason,
          parsed.data.supplierName || null,
          parsed.data.estimatedCost,
          parsed.data.estimatedArrivalDate || null,
          parsed.data.costApproved,
          parsed.data.note || null,
          req.authActor?.userId,
        ]
      );
      if (!order.rows[0]) {
        const duplicate = await client.query(
          'SELECT * FROM service_part_orders WHERE tenant_id=$1 AND idempotency_key=$2',
          [req.tenantId, parsed.data.idempotencyKey]
        );
        if (duplicate.rows[0]?.ticket_id !== ticket.id) {
          const error: any = new Error('Idempotency key sudah digunakan untuk tiket lain.');
          error.status = 409;
          throw error;
        }
        return { ticket: await finalTicket(client, req), order: duplicate.rows[0], idempotent: true };
      }
      await client.query(
        'UPDATE service_tickets SET repair_end_time=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2',
        [ticket.id, req.tenantId]
      );
      await appendEvent(
        client,
        req,
        ticket,
        ticket.status === 'DIAGNOSA' ? 'MENUGGU_PART_ORDER' : 'MENUGGU_SPAREPART',
        `Pengerjaan ditunda menunggu ${parsed.data.partName} x${parsed.data.quantity}${parsed.data.estimatedArrivalDate ? `, estimasi tiba ${parsed.data.estimatedArrivalDate}` : ''}.`,
        { partOrderId: order.rows[0].id }
      );
      return { ticket: await finalTicket(client, req), order: order.rows[0], idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function updateServicePartOrder(req: Request, res: Response) {
  const parsed = partOrderUpdateSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({ error: 'Pembaruan permintaan part tidak valid.' });
  try {
    const result = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      const existing = await client.query(
        'SELECT status FROM service_part_orders WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 FOR UPDATE',
        [req.params.orderId, req.tenantId, ticket.id]
      );
      if (!existing.rows[0]) {
        const error: any = new Error('Permintaan spare part tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const transitions: Record<string, string[]> = {
        REQUESTED: ['APPROVED', 'CANCELLED'],
        APPROVED: ['ORDERED', 'CANCELLED'],
        ORDERED: ['SHIPPED', 'ARRIVED', 'CANCELLED'],
        SHIPPED: ['ARRIVED', 'CANCELLED'],
        ARRIVED: [],
        RESERVED: [],
      };
      if (parsed.data.status && !transitions[existing.rows[0].status]?.includes(parsed.data.status)) {
        const error: any = new Error('Transisi status permintaan part tidak diizinkan.');
        error.status = 409;
        throw error;
      }
      const updated = await client.query(
        `UPDATE service_part_orders SET status=COALESCE($1,status),supplier_name=COALESCE($2,supplier_name),
         estimated_arrival_date=COALESCE($3::date,estimated_arrival_date),note=COALESCE($4,note),updated_at=NOW()
         WHERE id=$5 AND tenant_id=$6 AND ticket_id=$7 AND status <> 'CANCELLED' RETURNING *`,
        [
          parsed.data.status || null,
          parsed.data.supplierName || null,
          parsed.data.estimatedArrivalDate || null,
          parsed.data.note || null,
          req.params.orderId,
          req.tenantId,
          ticket.id,
        ]
      );
      if (!updated.rows[0]) {
        const error: any = new Error('Permintaan spare part tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      return { ticket: await finalTicket(client, req), order: updated.rows[0] };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function receiveServicePartOrder(req: Request, res: Response) {
  const parsed = partArrivalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Produk dan gudang wajib dipilih.' });
  try {
    const result = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      if (!['MENUGGU_SPAREPART', 'MENUGGU_PART_ORDER'].includes(ticket.status)) {
        const error: any = new Error('Tiket tidak sedang menunggu spare part.');
        error.status = 409;
        throw error;
      }
      const orderResult = await client.query(
        'SELECT * FROM service_part_orders WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 FOR UPDATE',
        [req.params.orderId, req.tenantId, ticket.id]
      );
      const order = orderResult.rows[0];
      if (!order || order.status === 'CANCELLED' || order.status === 'RESERVED') {
        const error: any = new Error('Permintaan part tidak aktif.');
        error.status = 409;
        throw error;
      }
      await requireTicketWarehouse(client, ticket, parsed.data.warehouseId);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${parsed.data.productId}:${parsed.data.warehouseId}`,
      ]);
      const product = await client.query(
        'SELECT name,sell_price FROM products WHERE id=$1 AND tenant_id=$2',
        [parsed.data.productId, req.tenantId]
      );
      const stock = await client.query(
        'SELECT quantity::float AS stock FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE',
        [parsed.data.productId, parsed.data.warehouseId]
      );
      const reserved = await client.query(
        `SELECT COALESCE(SUM(quantity),0)::float quantity FROM service_parts
         WHERE tenant_id=$1 AND product_id=$2 AND warehouse_id=$3 AND status='RESERVED'`,
        [req.tenantId, parsed.data.productId, parsed.data.warehouseId]
      );
      if (
        !product.rows[0] ||
        Number(stock.rows[0]?.stock || 0) - Number(reserved.rows[0].quantity) < Number(order.quantity)
      ) {
        const error: any = new Error('Stok part yang tiba belum mencukupi setelah reservasi aktif.');
        error.status = 409;
        throw error;
      }
      await client.query(
        `INSERT INTO service_parts(tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,'RESERVED')`,
        [
          req.tenantId,
          ticket.id,
          parsed.data.productId,
          parsed.data.warehouseId,
          product.rows[0].name,
          order.quantity,
          product.rows[0].sell_price,
          parsed.data.serialNumber || null,
        ]
      );
       await client.query(
         "UPDATE service_part_orders SET status='RESERVED',product_id=$1,warehouse_id=$2,updated_at=NOW() WHERE id=$3 AND tenant_id=$4 AND ticket_id=$5",
         [parsed.data.productId, parsed.data.warehouseId, order.id, req.tenantId, ticket.id]
       );
       const activeOrders = await client.query(
         `SELECT COUNT(*)::int AS total FROM service_part_orders
          WHERE tenant_id=$1 AND ticket_id=$2 AND status NOT IN ('RESERVED','CANCELLED')`,
         [req.tenantId, ticket.id]
       );
       if (!activeOrders.rows[0]?.total) {
         await appendEvent(
           client,
           req,
           ticket,
           'SEDANG_DIKERJAKAN',
           `${order.part_name} telah tiba dan direservasi. Pengerjaan dilanjutkan.`,
           { partOrderId: order.id }
         );
       }
       return { ticket: await finalTicket(client, req), order: { ...order, status: 'RESERVED' } };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function cancelServicePartOrder(req: Request, res: Response) {
  try {
    const result = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      const cancelled = await client.query(
        `UPDATE service_part_orders SET status='CANCELLED',updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status NOT IN ('RESERVED','CANCELLED') RETURNING *`,
        [req.params.orderId, req.tenantId, ticket.id]
      );
       if (!cancelled.rows[0]) {
         const error: any = new Error('Permintaan tidak dapat dibatalkan.');
         error.status = 409;
         throw error;
       }
       const activeOrders = await client.query(
         `SELECT COUNT(*)::int AS total FROM service_part_orders
          WHERE tenant_id=$1 AND ticket_id=$2 AND status NOT IN ('RESERVED','CANCELLED')`,
         [req.tenantId, ticket.id]
       );
       if (!activeOrders.rows[0]?.total && ['MENUGGU_SPAREPART', 'MENUGGU_PART_ORDER'].includes(ticket.status)) {
         const recoveryStatus = ticket.status === 'MENUGGU_PART_ORDER' ? 'DIAGNOSA' : 'SEDANG_DIKERJAKAN';
         await appendEvent(client, req, ticket, recoveryStatus, 'Part order aktif terakhir dibatalkan; tiket dilanjutkan.');
       }
       return { ticket: await finalTicket(client, req), order: cancelled.rows[0] };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function addApprovedAdditionalCost(req: Request, res: Response) {
  const parsed = additionalCostSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(422)
      .json({ error: 'Data tambahan biaya tidak valid.', details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${req.tenantId}:cost:${parsed.data.idempotencyKey}`,
      ]);
      const duplicate = await client.query(
        'SELECT * FROM service_cost_adjustments WHERE tenant_id=$1 AND idempotency_key=$2 LIMIT 1',
        [req.tenantId, parsed.data.idempotencyKey]
      );
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].ticket_id !== req.params.id) {
          const error: any = new Error('Idempotency key sudah digunakan untuk tiket lain.');
          error.status = 409;
          throw error;
        }
        return {
          ticket: await finalTicket(client, req),
          adjustment: duplicate.rows[0],
          idempotent: true,
        };
      }

      const ticket = await lockedTicket(client, req);
      if (!['SEDANG_DIKERJAKAN', 'REWORK'].includes(ticket.status)) {
        const error: any = new Error(
          `Tambahan biaya tidak dapat dicatat pada status ${ticket.status}.`
        );
        error.status = 409;
        throw error;
      }
      const cost = calculateAdditionalCost(ticket.estimatedCost, parsed.data.amount);
      const adjustment = await client.query(
        `INSERT INTO service_cost_adjustments
          (tenant_id,ticket_id,idempotency_key,description,amount,previous_cost,new_cost,approval_method,approved_by_name,note,proof_name,recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          req.tenantId,
          ticket.id,
          parsed.data.idempotencyKey,
          parsed.data.description,
          parsed.data.amount,
          cost.previousCost,
          cost.newCost,
          parsed.data.approvalMethod,
          parsed.data.approvedByName || null,
          parsed.data.note || null,
          parsed.data.proofName || null,
          req.authActor?.userId,
        ]
      );
      await client.query(
        'UPDATE service_tickets SET estimated_cost=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',
        [cost.newCost, ticket.id, req.tenantId]
      );
      const methodLabel =
        parsed.data.approvalMethod === 'WHATSAPP'
          ? 'WhatsApp'
          : parsed.data.approvalMethod === 'PHONE'
            ? 'Telepon'
            : 'Langsung di toko';
      await appendEvent(
        client,
        req,
        ticket,
        ticket.status,
        `Tambahan biaya Rp ${parsed.data.amount.toLocaleString('id-ID')} untuk ${parsed.data.description} disetujui via ${methodLabel}. Total baru Rp ${cost.newCost.toLocaleString('id-ID')}.`,
        { ...cost, approvalMethod: parsed.data.approvalMethod },
        'SERVICE_UPDATE',
        true
      );
      await client.query(
        `INSERT INTO audit_logs(id,tenant_id,user_id,action,details)
         VALUES(gen_random_uuid(),$1,$2,'ADD_APPROVED_SERVICE_COST',$3)`,
        [
          req.tenantId,
          req.authActor?.userId,
          `${ticket.ticketNo}: ${parsed.data.description}; ${cost.previousCost} -> ${cost.newCost}`,
        ]
      );
      return {
        ticket: await finalTicket(client, req),
        adjustment: adjustment.rows[0],
        idempotent: false,
      };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function requestServicePart(req: Request, res: Response) {
  const parsed = partSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Data spare part tidak valid.' });
  try {
    const data = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      if (
        ![
          'SEDANG_DIKERJAKAN',
          'MENUGGU_SPAREPART',
          'REWORK',
        ].includes(ticket.status)
      ) {
        const error: any = new Error(
          `Spare part tidak dapat ditambahkan pada status ${ticket.status}.`
        );
        error.status = 409;
        throw error;
      }
      await requireTicketWarehouse(client, ticket, parsed.data.warehouseId);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${parsed.data.productId}:${parsed.data.warehouseId}`,
      ]);
      const product = await client.query(
        'SELECT id,name,sell_price,purchase_cost FROM products WHERE id=$1 AND tenant_id=$2',
        [parsed.data.productId, req.tenantId]
      );
      const stock = await client.query(
        'SELECT quantity::float AS stock FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE',
        [parsed.data.productId, parsed.data.warehouseId]
      );
      if (!product.rows[0]) {
        const error: any = new Error('Produk tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const reserved = await client.query(
        `SELECT COALESCE(SUM(quantity),0)::float AS quantity
           FROM service_parts
          WHERE tenant_id=$1 AND product_id=$2 AND warehouse_id=$3 AND status='RESERVED'`,
        [req.tenantId, parsed.data.productId, parsed.data.warehouseId]
      );
      const availableStock = Number(stock.rows[0]?.stock || 0) - Number(reserved.rows[0].quantity);
      if (availableStock < parsed.data.quantity) {
        const error: any = new Error(
          'Stok spare part tersedia tidak mencukupi setelah reservasi aktif.'
        );
        error.status = 409;
        throw error;
      }
      await client.query(
        `INSERT INTO service_parts (tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'RESERVED')`,
        [
          req.tenantId,
          ticket.id,
          parsed.data.productId,
          parsed.data.warehouseId,
          product.rows[0].name,
          parsed.data.quantity,
          product.rows[0].sell_price,
          parsed.data.serialNumber || null,
        ]
      );
      // Roll the reserved part cost into the ticket's estimated_cost so invoices
      // and estimates reflect spare-part charges (previously only locally bumped).
      await client.query(
        `UPDATE service_tickets SET estimated_cost = COALESCE(estimated_cost,0) + $1
         WHERE id=$2 AND tenant_id=$3`,
        [Number(parsed.data.quantity) * Number(product.rows[0].sell_price), ticket.id, req.tenantId]
      );
      const parts = await client.query(
        `SELECT id,product_id AS "productId",warehouse_id AS "warehouseId",name,quantity::float,
          unit_price::float AS "unitPrice",(quantity*unit_price)::float AS "totalPrice",serial_number AS "serialNumber",status
         FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status IN ('REQUESTED','RESERVED') ORDER BY created_at`,
        [req.tenantId, ticket.id]
      );
      await client.query(
        'UPDATE service_tickets SET parts_requested=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',
        [JSON.stringify(parts.rows), ticket.id, req.tenantId]
      );
      return {
        ticket: await finalTicket(client, req),
        availableStock: Number(stock.rows[0]?.stock || 0),
      };
    });
    res.json({ data });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function cancelServicePart(req: Request, res: Response) {
  try {
    const data = await dbTransaction(async (client) => {
      const ticket = await lockedTicket(client, req);
      const removed = await client.query(
        `UPDATE service_parts SET status='CANCELLED',updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status IN ('REQUESTED','RESERVED')
         RETURNING id, status, (quantity * unit_price)::float AS cost`,
        [req.params.partId, req.tenantId, ticket.id]
      );
      if (!removed.rows[0]) {
        const error: any = new Error('Spare part tidak ditemukan atau sudah digunakan.');
        error.status = 404;
        throw error;
      }
      // Only RESERVED parts were rolled into estimated_cost; REQUESTED (diagnosis) rows never were.
      const cancelledCost = removed.rows[0].status === 'RESERVED' ? Number(removed.rows[0].cost) || 0 : 0;
      await client.query(
        `UPDATE service_tickets SET estimated_cost = GREATEST(0, COALESCE(estimated_cost,0) - $1), updated_at=NOW()
         WHERE id=$2 AND tenant_id=$3`,
        [cancelledCost, ticket.id, req.tenantId]
      );
      const parts = await client.query(
        `SELECT id,product_id AS "productId",warehouse_id AS "warehouseId",name,quantity::float,
          unit_price::float AS "unitPrice",(quantity*unit_price)::float AS "totalPrice",serial_number AS "serialNumber",status
         FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status IN ('REQUESTED','RESERVED') ORDER BY created_at`,
        [req.tenantId, ticket.id]
      );
      await client.query(
        'UPDATE service_tickets SET parts_requested=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',
        [JSON.stringify(parts.rows), ticket.id, req.tenantId]
      );
      return { ticket: await finalTicket(client, req) };
    });
    res.json({ data });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function patchServiceWorkMetadata(req: Request, res: Response) {
  const parsed = workMetadataSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Metadata pekerjaan tidak valid.' });
  try {
    const ticket = await dbTransaction(async (client) => {
      const current = await lockedTicket(client, req);
      if (['QC', 'SELESAI', 'DIAMBIL', 'DIBATALKAN', 'TIDAK_BISA_DIPERBAIKI', 'CUSTOMER_TIDAK_MERESPON', 'BARANG_TIDAK_DIAMBIL', 'RUSAK'].includes(current.status)) {
        const error: any = new Error('Metadata pekerjaan tidak dapat diubah setelah QC.');
        error.status = 409;
        throw error;
      }
      if (parsed.data.assignedTechId) {
        const technician = await client.query(
          `SELECT u.id FROM users u JOIN user_branches ub ON ub.user_id=u.id
           WHERE u.id=$1 AND u.tenant_id=$2 AND u.role='TEKNISI' AND u.is_active=TRUE AND ub.branch_id=$3 LIMIT 1`,
          [parsed.data.assignedTechId, req.tenantId, current.branchId]
        );
        if (!technician.rows[0]) {
          const error: any = new Error('Teknisi tidak berada pada tenant dan cabang tiket.');
          error.status = 422;
          throw error;
        }
      }
      const repairStartTime = parsed.data.repairStartTime
        ? new Date(parsed.data.repairStartTime)
        : null;
      const repairEndTime = parsed.data.repairEndTime ? new Date(parsed.data.repairEndTime) : null;
      if (parsed.data.storageLocationId) await requireTicketStorageLocation(client, current, parsed.data.storageLocationId);
      if (repairEndTime && repairStartTime && repairEndTime < repairStartTime) {
        const error: any = new Error('Waktu selesai perbaikan tidak boleh sebelum waktu mulai.');
        error.status = 422;
        throw error;
      }
      const discussions = parsed.data.internalDiscussion
        ? [
            ...(current.internalDiscussions || []),
            {
              ...parsed.data.internalDiscussion,
              id: randomUUID(),
              operator: req.authActor?.email || req.authActor?.userId,
              timestamp: new Date().toISOString(),
            },
          ]
        : current.internalDiscussions || [];
      await client.query(
        `UPDATE service_tickets SET assigned_tech_id=CASE WHEN $11 THEN $1 ELSE assigned_tech_id END,technician_notes=COALESCE($2,technician_notes),
          internal_discussions=$3::jsonb,tech_pre_checklist=COALESCE($4::jsonb,tech_pre_checklist),
          tech_post_checklist=COALESCE($5::jsonb,tech_post_checklist),repair_start_time=CASE WHEN $12 THEN $6::timestamp ELSE repair_start_time END,
          repair_end_time=CASE WHEN $13 THEN $7::timestamp ELSE repair_end_time END,storage_location_id=CASE WHEN $14 THEN $8 ELSE storage_location_id END,
          updated_at=NOW() WHERE id=$9 AND tenant_id=$10`,

        [
          parsed.data.assignedTechId ?? null,
          parsed.data.technicianNotes ?? null,
          JSON.stringify(discussions),
          parsed.data.techPreChecklist ? JSON.stringify(parsed.data.techPreChecklist) : null,
          parsed.data.techPostChecklist ? JSON.stringify(parsed.data.techPostChecklist) : null,
          repairStartTime,
           repairEndTime,
           parsed.data.storageLocationId ?? null,
           current.id,
           req.tenantId,
           parsed.data.assignedTechId !== undefined,
           parsed.data.repairStartTime !== undefined,
           parsed.data.repairEndTime !== undefined,
           parsed.data.storageLocationId !== undefined,

        ]
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function bulkDeleteServiceTickets(req: Request, res: Response) {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Daftar tiket tidak valid.' });
  try {
    const branchId = req.branchId || String(req.headers['x-branch-id'] || '');
    const result = await dbQuery(
      `UPDATE service_tickets SET deleted_at=NOW(),updated_at=NOW()
       WHERE tenant_id=$1 AND branch_id=$2 AND deleted_at IS NULL AND id=ANY($3::uuid[])
         AND NOT EXISTS (SELECT 1 FROM service_payments sp WHERE sp.tenant_id=service_tickets.tenant_id AND sp.ticket_id=service_tickets.id)
         AND NOT EXISTS (SELECT 1 FROM service_parts part WHERE part.tenant_id=service_tickets.tenant_id AND part.ticket_id=service_tickets.id AND part.status='USED')
       RETURNING id, initial_photos, qc_photos`,
      [req.tenantId, branchId, parsed.data.ids]
    );
    const photoPaths = result.rows.flatMap((row) => [...(row.initial_photos || []), ...(row.qc_photos || [])]);
    const cleanedPhotos = await cleanupServicePhotos(photoPaths);
    logger.info({ tenantId: req.tenantId, branchId, ticketCount: result.rowCount, photoCount: cleanedPhotos }, '[service] tickets deleted');
    res.json({ data: { deletedIds: result.rows.map((row) => row.id) } });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function settleServiceReceivable(req: Request, res: Response) {
  const parsed = receivableSettlementSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({ error: 'Data pelunasan piutang tidak valid.' });
  try {
    const result = await dbTransaction(async (client) => {
      const receivable = await client.query(
        `SELECT sr.*,st.ticket_no FROM service_receivables sr
          JOIN service_tickets st ON st.id=sr.ticket_id AND st.tenant_id=sr.tenant_id AND st.branch_id=sr.branch_id
          WHERE sr.id=$1 AND sr.tenant_id=$2 AND sr.branch_id=$3 AND st.deleted_at IS NULL AND sr.status IN ('OPEN','PARTIAL') FOR UPDATE`,
        [req.params.receivableId, req.tenantId, req.branchId || req.headers['x-branch-id']]
      );
      if (!receivable.rows[0]) {
        const error: any = new Error('Piutang servis tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const item = receivable.rows[0];
      const duplicate = await client.query(
        'SELECT id FROM service_receivable_payments WHERE tenant_id=$1 AND receivable_id=$2 AND idempotency_key=$3',
        [req.tenantId, item.id, parsed.data.idempotencyKey]
      );
      if (duplicate.rows[0]) {
        const current = await client.query('SELECT * FROM service_receivables WHERE id=$1 AND tenant_id=$2 AND branch_id=$3', [item.id, req.tenantId, item.branch_id]);
        return { receivable: current.rows[0], idempotent: true };
      }
      const remaining = Number(item.amount) - Number(item.paid_amount);
      if (parsed.data.amount > remaining) {
        const error: any = new Error('Pelunasan melebihi sisa piutang.');
        error.status = 422;
        throw error;
      }
      await client.query(
        `INSERT INTO service_receivable_payments (tenant_id,branch_id,receivable_id,idempotency_key,amount,method,reference_no,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          req.tenantId,
          item.branch_id,
          item.id,
          parsed.data.idempotencyKey,
          parsed.data.amount,
          parsed.data.method,
          parsed.data.referenceNo || null,
          req.authActor?.userId,
        ]
      );
      const paidAmount = Number(item.paid_amount) + parsed.data.amount;
      const status = paidAmount === Number(item.amount) ? 'PAID' : 'PARTIAL';
      const updated = await client.query(
        `UPDATE service_receivables SET paid_amount=$1,status=$2,paid_at=CASE WHEN $2='PAID' THEN NOW() ELSE paid_at END,updated_at=NOW()
         WHERE id=$3 AND tenant_id=$4 AND branch_id=$5 RETURNING *`,
        [paidAmount, status, item.id, req.tenantId, item.branch_id]
      );
      await client.query('UPDATE service_payments SET status=$1 WHERE id=$2 AND tenant_id=$3', [
        status === 'PAID' ? 'PAID' : 'PARTIALLY_PAID',
        item.service_payment_id,
        req.tenantId,
      ]);
      const debitAccountId = await ensureAccount(
        client,
        req.tenantId!,
        paymentDebitAccountCode(parsed.data.method)
      );
      const receivableAccountId = await ensureAccount(client, req.tenantId!, '10300');
      const journal = await client.query(
        `INSERT INTO journal_entries (id,tenant_id,branch_id,description,reference_no,source_type,source_id,created_by)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,'SERVICE_RECEIVABLE_SETTLEMENT',$5,$6) RETURNING id`,
        [
          req.tenantId,
          item.branch_id,
          `Pelunasan piutang servis ${item.ticket_no}`,
          item.ticket_no,
          item.id,
          req.authActor?.userId,
        ]
      );
      await client.query(
        `INSERT INTO journal_lines (id,journal_entry_id,account_id,debit,credit) VALUES
         (gen_random_uuid(),$1,$2,$4,0),(gen_random_uuid(),$1,$3,0,$4)`,
        [journal.rows[0].id, debitAccountId, receivableAccountId, parsed.data.amount]
      );
      return { receivable: updated.rows[0], idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function handoverServiceTicket(req: Request, res: Response) {
  const parsed = handoverSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(422)
      .json({ error: 'Data pembayaran/handover tidak valid.', details: parsed.error.flatten() });
  const isReferenceRequired = !['CASH', 'TEMPO'].includes(parsed.data.paymentMethod);
  if (isReferenceRequired && !parsed.data.referenceNo && !parsed.data.proofName) {
    return res.status(422).json({ error: 'Nomor referensi atau bukti pembayaran diperlukan.' });
  }
  try {
    const result = await dbTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${req.tenantId}:handover:${parsed.data.idempotencyKey}`,
      ]);
      const duplicate = await client.query(
        'SELECT id,ticket_id FROM service_payments WHERE tenant_id=$1 AND idempotency_key=$2',
        [req.tenantId, parsed.data.idempotencyKey]
      );
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].ticket_id !== req.params.id) {
          const error: any = new Error('Idempotency key sudah digunakan untuk tiket lain.');
          error.status = 409;
          throw error;
        }
        return { ticket: await finalTicket(client, req), idempotent: true };
      }
      const ticket = await lockedTicket(client, req);
      if (ticket.handoverAt) {
        const error: any = new Error('Tiket sudah diserahkan.');
        error.status = 409;
        throw error;
      }
      if (!['SELESAI', 'SIAP_DIAMBIL'].includes(ticket.status)) {
        const error: any = new Error(
          `Handover tidak dapat dilakukan pada status ${ticket.status}.`
        );
        error.status = 409;
        throw error;
      }
      if (ticket.qcStatus !== 'PASSED') {
        const error: any = new Error('Tiket harus lulus QC sebelum dapat diserahkan.');
        error.status = 409;
        throw error;
      }
      const tenantSettings = await client.query(
        `SELECT COALESCE((settings #>> '{taxSettings,taxRate}')::numeric, 0) AS tax_rate,
                 COALESCE((settings #>> '{taxSettings,taxEnabled}')::boolean, FALSE) AS tax_enabled,
                 COALESCE((settings #>> '{taxSettings,taxInclusive}')::boolean, FALSE) AS tax_inclusive
         FROM tenants WHERE id=$1`,
        [req.tenantId]
      );
      const taxRate = tenantSettings.rows[0]?.tax_enabled
        ? Math.max(0, Math.min(100, Number(tenantSettings.rows[0]?.tax_rate) || 0))
        : 0;
      const invoice = calculateServiceInvoice(
        ticket.estimatedCost,
        ticket.downPayment,
        taxRate,
        Boolean(tenantSettings.rows[0]?.tax_inclusive)
      );
      const parts = await client.query(
        `SELECT sp.*,p.purchase_cost FROM service_parts sp
         JOIN products p ON p.id=sp.product_id AND p.tenant_id=sp.tenant_id
         WHERE sp.tenant_id=$1 AND sp.ticket_id=$2 AND sp.status='RESERVED' FOR UPDATE OF sp`,
        [req.tenantId, ticket.id]
      );
      for (const part of parts.rows) {
        if (!part.warehouse_id) {
          const error: any = new Error(`Gudang untuk part ${part.name} belum ditentukan.`);
          error.status = 422;
          throw error;
        }
        await requireTicketWarehouse(client, ticket, part.warehouse_id);
        const stock = await client.query(
          'SELECT quantity FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE',
          [part.product_id, part.warehouse_id]
        );
        if (Number(stock.rows[0]?.quantity || 0) < Number(part.quantity)) {
          const error: any = new Error(`Stok ${part.name} tidak mencukupi.`);
          error.status = 409;
          throw error;
        }
        await client.query(
          'UPDATE product_stock SET quantity=quantity-$1 WHERE product_id=$2 AND warehouse_id=$3',
          [part.quantity, part.product_id, part.warehouse_id]
        );
        await client.query(
          `INSERT INTO service_stock_movements (tenant_id,ticket_id,product_id,warehouse_id,quantity,movement_type,reference_no)
           VALUES ($1,$2,$3,$4,$5,'SERVICE_OUT',$6)
           ON CONFLICT (ticket_id,product_id,warehouse_id,movement_type)
           DO UPDATE SET quantity=service_stock_movements.quantity + EXCLUDED.quantity`,
          [
            req.tenantId,
            ticket.id,
            part.product_id,
            part.warehouse_id,
            -Number(part.quantity),
            ticket.ticketNo,
          ]
        );
        const consumed = await client.query(
          "UPDATE service_parts SET status='USED',consumed_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status='RESERVED'",
          [part.id, req.tenantId, ticket.id]
        );
        if (consumed.rowCount !== 1) {
          const error: any = new Error(`Reservasi ${part.name} sudah berubah.`);
          error.status = 409;
          throw error;
        }
      }
      const dueAt =
        parsed.data.paymentMethod === 'TEMPO'
          ? new Date(Date.now() + (parsed.data.tempoDays || 30) * 86400000)
          : null;
      const payment = await client.query(
        `INSERT INTO service_payments (tenant_id,branch_id,ticket_id,idempotency_key,method,subtotal,tax_rate,tax_amount,down_payment_used,amount,reference_no,proof_name,tempo_days,due_at,status,created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [
          req.tenantId,
          ticket.branchId,
          ticket.id,
          parsed.data.idempotencyKey,
          parsed.data.paymentMethod,
          invoice.subtotal,
          taxRate,
          invoice.taxAmount,
          invoice.downPaymentUsed,
          invoice.amountDue,
          parsed.data.referenceNo || null,
          parsed.data.proofName || null,
          parsed.data.tempoDays || 0,
          dueAt,
          parsed.data.paymentMethod === 'TEMPO' ? 'RECEIVABLE' : 'PAID',
          req.authActor?.userId,
        ]
      );
       if (invoice.total > 0) {
       const debitAccountId = await ensureAccount(

          client,
          req.tenantId!,
          parsed.data.paymentMethod === 'TEMPO'
            ? '10300'
            : paymentDebitAccountCode(parsed.data.paymentMethod)
        );
        const depositAccountId = await ensureAccount(client, req.tenantId!, '21000');
        const revenueAccountId = await ensureAccount(client, req.tenantId!, '40100');
        const taxAccountId = await ensureAccount(client, req.tenantId!, '20100');
        const journal = await client.query(
          `INSERT INTO journal_entries (id,tenant_id,branch_id,description,reference_no,source_type,source_id,created_by) VALUES (gen_random_uuid(),$1,$2,$3,$4,'SERVICE_PAYMENT',$5,$6) RETURNING id`,
          [
            req.tenantId,
            ticket.branchId,
            `Pembayaran servis ${ticket.ticketNo}`,
            ticket.ticketNo,
            payment.rows[0].id,
            req.authActor?.userId,
          ]
        );
        const journalLines = [
          [debitAccountId, invoice.amountDue, 0],
          [depositAccountId, invoice.downPaymentUsed, 0],
          [revenueAccountId, 0, invoice.subtotal],
          [taxAccountId, 0, invoice.taxAmount],
        ].filter(([, debit, credit]) => Number(debit) > 0 || Number(credit) > 0);
        for (const [accountId, debit, credit] of journalLines) {
          await client.query(
            `INSERT INTO journal_lines (id,journal_entry_id,account_id,debit,credit)
             VALUES (gen_random_uuid(),$1,$2,$3,$4)`,
            [journal.rows[0].id, accountId, debit, credit]
          );
        }
      }
      if (parsed.data.paymentMethod === 'TEMPO' && invoice.amountDue > 0) {
        await client.query(
          `INSERT INTO service_receivables (tenant_id,branch_id,ticket_id,service_payment_id,amount,due_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.tenantId, ticket.branchId, ticket.id, payment.rows[0].id, invoice.amountDue, dueAt]
        );
      }
      const partsCost = parts.rows.reduce(
        (sum: number, part: any) => sum + Number(part.quantity) * Number(part.purchase_cost || 0),
        0
      );
      if (partsCost > 0) {
        const hppAccountId = await ensureAccount(client, req.tenantId!, '50100');
        const inventoryAccountId = await ensureAccount(client, req.tenantId!, '10500');
        const journal = await client.query(
          `INSERT INTO journal_entries (id,tenant_id,branch_id,description,reference_no,source_type,source_id,created_by) VALUES (gen_random_uuid(),$1,$2,$3,$4,'SERVICE_COGS',$5,$6) RETURNING id`,
          [
            req.tenantId,
            ticket.branchId,
            `HPP part servis ${ticket.ticketNo}`,
            ticket.ticketNo,
            ticket.id,
            req.authActor?.userId,
          ]
        );
        await client.query(
          `INSERT INTO journal_lines (id,journal_entry_id,account_id,debit,credit) VALUES (gen_random_uuid(),$1,$2,$3,0),(gen_random_uuid(),$1,$4,0,$3)`,
          [journal.rows[0].id, hppAccountId, partsCost, inventoryAccountId]
        );
      }
      const warrantyMonths = Number(ticket.warrantyMonths || 0);
      const warrantyEndsAt =
        warrantyMonths > 0 ? new Date(Date.now() + warrantyMonths * 30 * 86400000) : null;
      const consumedParts = parts.rows.map((part: any) => ({
        id: part.id,
        productId: part.product_id,
        warehouseId: part.warehouse_id,
        name: part.name,
        quantity: Number(part.quantity),
        unitPrice: Number(part.unit_price),
        totalPrice: Number(part.quantity) * Number(part.unit_price),
        serialNumber: part.serial_number || undefined,
        status: 'USED',
      }));
      await client.query(
        `UPDATE service_tickets SET payment_method=$1,payment_ref=$2,payment_proof_name=$3,tempo_days=$4,
          handover_at=NOW(),warranty_ends_at=$5,warranty_card_sent=$6,warranty_card_url=$7,invoice_id=$8,
          parts_used=$9::jsonb,updated_at=NOW() WHERE id=$10 AND tenant_id=$11`,
        [
          parsed.data.paymentMethod,
          parsed.data.referenceNo || null,
          parsed.data.proofName || null,
          parsed.data.tempoDays || 0,
          warrantyEndsAt,
          warrantyMonths > 0,
          warrantyMonths > 0 ? `/warranty/${encodeURIComponent(ticket.ticketNo)}` : null,
          payment.rows[0].id,
          JSON.stringify(consumedParts),
          ticket.id,
          req.tenantId,
        ]
      );
      await appendEvent(
        client,
        req,
        ticket,
        'DIAMBIL',
        `Unit diserahkan melalui ${parsed.data.paymentMethod}. Sisa tagihan Rp ${invoice.amountDue.toLocaleString('id-ID')}.`,
        invoice
      );
      return { ticket: await finalTicket(client, req), invoice, idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) {
    sendError(res, error);
  }
}

// Re-export for route registration
export { dataSyncHandler } from './data.controller.js';
