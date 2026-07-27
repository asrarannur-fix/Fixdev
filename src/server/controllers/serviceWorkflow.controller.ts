import type { Request, Response } from 'express';
import { z } from 'zod';
import { dbTransaction, dbQuery } from '../../lib/db.js';
import { ensureAccount, paymentDebitAccountCode } from '../lib/coa.js';
import type { WhatsAppTemplate } from '../../types/index.js';
import {
  SERVICE_TRANSITIONS as DOMAIN_SERVICE_TRANSITIONS,
  canServiceTransition,
} from '../../domain/serviceWorkflow.js';

export const SERVICE_TRANSITIONS: Record<string, string[]> = DOMAIN_SERVICE_TRANSITIONS;

// Rate limiting: track last transition time per ticket
const ticketTransitionTimes: Map<string, number> = new Map();
const TRANSITION_COOLDOWN_MS = 5000; // 5 seconds cooldown per ticket

function checkTransitionCooldown(ticketId: string): { ok: boolean; remainingMs?: number } {
  const lastTime = ticketTransitionTimes.get(ticketId);
  if (!lastTime) return { ok: true };
  const elapsed = Date.now() - lastTime;
  if (elapsed < TRANSITION_COOLDOWN_MS) {
    return { ok: false, remainingMs: TRANSITION_COOLDOWN_MS - elapsed };
  }
  return { ok: true };
}

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

const partOrderSchema = z.object({
  partName: z.string().trim().min(2),
  quantity: z.number().positive(),
  reason: z.string().trim().min(3),
  supplierName: z.string().trim().optional(),
  estimatedCost: z.number().min(0).default(0),
  estimatedArrivalDate: z.string().optional(),
  costApproved: z.boolean().default(false),
  note: z.string().optional(),
  idempotencyKey: z.string().trim().min(8),
});
const partOrderUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'ORDERED', 'SHIPPED', 'ARRIVED']).optional(),
  supplierName: z.string().trim().optional(),
  estimatedArrivalDate: z.string().optional(),
  note: z.string().optional(),
});
const partArrivalSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  serialNumber: z.string().optional(),
});

const additionalCostSchema = z.object({
  description: z.string().trim().min(3),
  amount: z.number().positive(),
  approvalMethod: z.enum(['WHATSAPP', 'PHONE', 'IN_PERSON']).default('WHATSAPP'),
  approvedByName: z.string().trim().optional(),
  note: z.string().trim().optional(),
  proofName: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8),
});

export function calculateAdditionalCost(previousCost: number, amount: number) {
  const previous = Math.max(0, Number(previousCost) || 0);
  const additional = Math.max(0, Number(amount) || 0);
  return { previousCost: previous, additionalCost: additional, newCost: previous + additional };
}

const transitionSchema = z.object({ status: z.string().min(1), note: z.string().trim().min(3) });
const diagnosisSchema = z.object({
  diagnosis: z.string().trim().min(3),
  estimatedCost: z.number().min(0),
  parts: z
    .array(
      z.object({
        productId: z.string().uuid(),
        warehouseId: z.string().uuid().optional().nullable(),
        name: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().min(0).default(0),
        serialNumber: z.string().optional(),
      })
    )
    .default([]),
});
const approvalSchema = z.object({
  approved: z.boolean(),
  signatureName: z.string().trim().optional(),
  signature: z.string().optional(),
});
const qcSchema = z
  .object({
    passed: z.boolean(),
    score: z.number().min(0).max(100),
    notes: z.string().trim().min(2),
    checklist: z
      .array(z.object({ criteria: z.string().trim().min(1), passed: z.boolean() }))
      .min(1),
    photos: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.passed && data.score < 80) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: 'Skor minimal untuk lulus QC adalah 80.',
      });
    }
    if (data.passed && data.checklist.some((item) => !item.passed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checklist'],
        message: 'Semua pemeriksaan harus lulus sebelum QC diselesaikan.',
      });
    }
  });
const handoverSchema = z
  .object({
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'TEMPO']),
    referenceNo: z.string().trim().max(200).optional(),
    proofName: z.string().trim().max(255).optional(),
    tempoDays: z.number().int().min(1).max(365).optional(),
    checklist: z.object({
      accessoriesReturned: z.literal(true),
      customerChecked: z.literal(true),
      invoiceReady: z.literal(true),
      warrantyReady: z.literal(true),
    }),
    idempotencyKey: z.string().trim().min(8),
  })
  .superRefine((value, ctx) => {
    if (value.paymentMethod === 'TEMPO' && !value.tempoDays) {
      ctx.addIssue({ code: 'custom', path: ['tempoDays'], message: 'Termin tempo wajib diisi.' });
    }
    if (value.paymentMethod !== 'TEMPO' && value.tempoDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['tempoDays'],
        message: 'Termin hanya berlaku untuk pembayaran tempo.',
      });
    }
    if (
      !['CASH', 'TEMPO'].includes(value.paymentMethod) &&
      !value.referenceNo &&
      !value.proofName
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['referenceNo'],
        message: 'Referensi atau bukti pembayaran wajib diisi.',
      });
    }
  });
const receivableSettlementSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET']),
  referenceNo: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8),
});
const partSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int().positive(),
  serialNumber: z.string().trim().optional(),
});
const workMetadataSchema = z.object({
  assignedTechId: z.string().uuid().nullable().optional(),
  technicianNotes: z.string().optional(),
  internalDiscussion: z
    .object({
      id: z.string(),
      text: z.string().trim().min(1),
      operator: z.string(),
      timestamp: z.string(),
    })
    .optional(),
  techPreChecklist: z.array(z.any()).max(100).optional(),
  techPostChecklist: z.array(z.any()).max(100).optional(),
  repairStartTime: z.string().datetime().nullable().optional(),
  repairEndTime: z.string().datetime().nullable().optional(),
  storageLocationId: z.string().uuid().nullable().optional(),
});

function ticketSelect() {
  return `id, tenant_id AS "tenantId", branch_id AS "branchId", ticket_no AS "ticketNo",
    customer_id AS "customerId", device_name AS "deviceName", device_serial AS "deviceSerial",
    device_brand_model AS "deviceBrandModel", customer_complaints AS "customerComplaints",
    tech_diagnosis AS "techDiagnosis", estimated_cost::float AS "estimatedCost",
    customer_approval_status AS "customerApprovalStatus", assigned_tech_id AS "assignedTechId",
    parts_requested AS "partsRequested", parts_used AS "partsUsed", initial_checklist AS "initialChecklist",
    initial_photos AS "initialPhotos", accessories_left AS "accessoriesLeft", custom_accessories AS "customAccessories",
    physical_condition AS "physicalCondition", estimated_completion_date AS "estimatedCompletionDate",
    captured_conditions AS "capturedConditions", dynamic_fields AS "dynamicFields", storage_location_id AS "storageLocationId",
    internal_discussions AS "internalDiscussions", tech_pre_checklist AS "techPreChecklist",
    tech_post_checklist AS "techPostChecklist", technician_notes AS "technicianNotes",
    repair_start_time AS "repairStartTime", repair_end_time AS "repairEndTime",
    qc_score::float AS "qcScore",
    qc_checklist AS "qcChecklist", qc_photos AS "qcPhotos", qc_notes AS "qcNotes", qc_status AS "qcStatus",
    status, timeline, warranty_months AS "warrantyMonths", warranty_ends_at AS "warrantyEndsAt",
    down_payment::float AS "downPayment", payment_method AS "paymentMethod", payment_ref AS "paymentRef",
    payment_proof_name AS "paymentProofName", tempo_days AS "tempoDays", handover_at AS "handoverAt",
    invoice_id AS "invoiceId", public_tracking_token AS "publicTrackingToken", created_at AS "createdAt"`;
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
    status: toStatus,
    note,
    timestamp: new Date().toISOString(),
    operator: req.authActor?.email || req.authActor?.userId || 'System',
  };
  const timeline = [...(ticket.timeline || []), event];
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
  await client.query(
    `UPDATE service_tickets SET status=$1,timeline=$2::jsonb,updated_at=NOW() WHERE id=$3 AND tenant_id=$4`,
    [toStatus, JSON.stringify(timeline), ticket.id, req.tenantId]
  );
  ticket.status = toStatus;
  ticket.timeline = timeline;
  await queueNotification(
    client,
    req.tenantId!,
    ticket,
    inserted.rows[0].id,
    note,
    templateCategory,
    { toStatus, note, metadata }
  );
  return ticket;
}

function renderWaTemplate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (key in ctx && ctx[key] !== undefined && ctx[key] !== null) {
      return String(ctx[key]);
    }
    return `{${key}}`;
  });
}

async function getTenantWaTemplate(
  client: any,
  tenantId: string,
  category: string
): Promise<string | null> {
  const result = await client.query(
    `SELECT settings #>> '{waConfig,templates}' AS templates FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const raw = result.rows[0]?.templates;
  if (!raw) return null;
  let templates: WhatsAppTemplate[];
  try {
    templates = JSON.parse(raw);
  } catch {
    return null;
  }
  const match = templates.find((t) => t.category === category && t.content);
  return match ? match.content : null;
}

async function queueNotification(
  client: any,
  tenantId: string,
  ticket: any,
  eventId: string,
  message: string,
  templateCategory = 'SERVICE_UPDATE',
  extraContext: any = {}
) {
  const tenantSettings = await client.query(`SELECT settings FROM tenants WHERE id=$1`, [tenantId]);
  const waConfig = tenantSettings.rows[0]?.settings?.waConfig;
  if (waConfig?.sendingMethod === 'MANUAL') {
    // If sending method is manual, do not queue system notifications
    return;
  }

  const customer = await client.query(
    'SELECT name,phone FROM customers WHERE id=$1 AND tenant_id=$2',
    [ticket.customerId, tenantId]
  );
  if (!customer.rows[0]?.phone) return;

  let finalMessage = message;
  const template = await getTenantWaTemplate(client, tenantId, templateCategory);
  if (template) {
    const ctx: Record<string, any> = {
      customer_name: customer.rows[0].name,
      ticket_no: ticket.ticketNo,
      ticket_status: extraContext.toStatus || ticket.status,
      device_name: ticket.deviceName,
      status_note: message,
      ...extraContext.metadata,
    };
    finalMessage = renderWaTemplate(template, ctx);
  }

  await client.query(
    `INSERT INTO whatsapp_queue (tenant_id,recipient_name,recipient_phone,type,message,status,ticket_id,event_id,scheduled_time)
     VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,NOW())`,
    [
      tenantId,
      customer.rows[0].name,
      customer.rows[0].phone,
      templateCategory,
      finalMessage,
      ticket.id,
      eventId,
    ]
  );
}

async function finalTicket(client: any, req: Request) {
  return (
    await client.query(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.tenantId]
    )
  ).rows[0];
}

function sendError(res: Response, error: any) {
  const isAppError = !!error.status;
  return res.status(error.status || 500).json({
    error: isAppError ? error.message || 'Workflow servis gagal.' : 'Workflow servis gagal.',
  });
}

export async function listServiceTickets(req: Request, res: Response) {
  try {
    const branchId = req.branchId || req.headers['x-branch-id'];
    const result = await dbQuery(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE tenant_id=$1 AND branch_id=$2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500`,
      [req.tenantId, branchId]
    );
    res.json({ data: result.rows });
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
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Status atau catatan tidak valid.' });
  const ticketId = req.params.id;
  const cooldown = checkTransitionCooldown(ticketId);
  if (!cooldown.ok) {
    return res.status(429).json({
      error: `Tunggu ${Math.ceil(cooldown.remainingMs / 1000)} detik sebelum ubah status lagi.`,
    });
  }
  try {
    const ticket = await dbTransaction(async (client) => {
      ticketTransitionTimes.set(ticketId, Date.now());
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
    res.json({ data: ticket });
  } catch (error: any) {
    sendError(res, error);
  }
}

export async function diagnoseServiceTicket(req: Request, res: Response) {
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
          'SELECT id FROM products WHERE id=$1 AND tenant_id=$2 LIMIT 1',
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
            part.name,
            part.quantity,
            part.unitPrice,
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
      const status = parsed.data.approved ? 'SEDANG_DIKERJAKAN' : 'APPROVAL_DITOLAK';
      await client.query(
        `UPDATE service_tickets SET customer_approval_status=$1,provisional_signature_name=$2,
          provisional_signature=$3,provisional_approved_at=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6`,
        [
          parsed.data.approved ? 'APPROVED' : 'REJECTED',
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
        status,
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
      if (parsed.data.passed) {
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
        `UPDATE service_tickets SET qc_score=$1,qc_notes=$2,qc_checklist=$3::jsonb,qc_photos=$4::jsonb,qc_status=$5,updated_at=NOW()
         WHERE id=$6 AND tenant_id=$7`,
        [
          parsed.data.score,
          parsed.data.notes,
          JSON.stringify(parsed.data.checklist),
          JSON.stringify(parsed.data.photos),
          parsed.data.passed ? 'PASSED' : 'FAILED',
          current.id,
          req.tenantId,
        ]
      );
      await appendEvent(
        client,
        req,
        current,
        parsed.data.passed ? 'SELESAI' : 'REWORK',
        parsed.data.passed
          ? `QC lulus dengan skor ${parsed.data.score}.`
          : `QC gagal; unit kembali ke rework. Skor ${parsed.data.score}.`
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
      const duplicate = await client.query(
        'SELECT * FROM service_part_orders WHERE tenant_id=$1 AND idempotency_key=$2',
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
          order: duplicate.rows[0],
          idempotent: true,
        };
      }
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
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
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
      await client.query(
        'UPDATE service_tickets SET repair_end_time=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2',
        [ticket.id, req.tenantId]
      );
      await appendEvent(
        client,
        req,
        ticket,
        'MENUGGU_SPAREPART',
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
      if (ticket.status !== 'MENUGGU_SPAREPART') {
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
      const product = await client.query(
        `SELECT p.name,p.sell_price,COALESCE(ps.quantity,0)::float stock FROM products p
         LEFT JOIN product_stock ps ON ps.product_id=p.id AND ps.warehouse_id=$2
         WHERE p.id=$1 AND p.tenant_id=$3 LIMIT 1`,
        [parsed.data.productId, parsed.data.warehouseId, req.tenantId]
      );
      if (!product.rows[0] || Number(product.rows[0].stock) < Number(order.quantity)) {
        const error: any = new Error('Stok part yang tiba belum mencukupi.');
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
        "UPDATE service_part_orders SET status='RESERVED',product_id=$1,warehouse_id=$2,updated_at=NOW() WHERE id=$3",
        [parsed.data.productId, parsed.data.warehouseId, order.id]
      );
      await appendEvent(
        client,
        req,
        ticket,
        'SEDANG_DIKERJAKAN',
        `${order.part_name} telah tiba dan direservasi. Pengerjaan dilanjutkan.`,
        { partOrderId: order.id }
      );
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
          'DIAGNOSA',
          'MENUGGU_APPROVAL',
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
      const product = await client.query(
        `SELECT p.id,p.name,p.sell_price,p.purchase_cost,COALESCE(ps.quantity,0)::float AS stock
           FROM products p LEFT JOIN product_stock ps ON ps.product_id=p.id AND ps.warehouse_id=$2
          WHERE p.id=$1 AND p.tenant_id=$3 LIMIT 1`,
        [parsed.data.productId, parsed.data.warehouseId, req.tenantId]
      );
      if (!product.rows[0]) {
        const error: any = new Error('Produk tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${parsed.data.productId}:${parsed.data.warehouseId}`,
      ]);
      const reserved = await client.query(
        `SELECT COALESCE(SUM(quantity),0)::float AS quantity
           FROM service_parts
          WHERE tenant_id=$1 AND product_id=$2 AND warehouse_id=$3 AND status='RESERVED'`,
        [req.tenantId, parsed.data.productId, parsed.data.warehouseId]
      );
      const availableStock = Number(product.rows[0].stock) - Number(reserved.rows[0].quantity);
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
        availableStock: Number(product.rows[0].stock),
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
      const cancelledPart = await client.query(
        `SELECT id, (quantity * unit_price)::float AS cost
         FROM service_parts WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status IN ('REQUESTED','RESERVED') LIMIT 1`,
        [req.params.partId, req.tenantId, ticket.id]
      );
      const removed = await client.query(
        `UPDATE service_parts SET status='CANCELLED',updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status IN ('REQUESTED','RESERVED') RETURNING id`,
        [req.params.partId, req.tenantId, ticket.id]
      );
      if (!removed.rows[0]) {
        const error: any = new Error('Spare part tidak ditemukan atau sudah digunakan.');
        error.status = 404;
        throw error;
      }
      // Roll back the cancelled part cost from the ticket's estimated_cost.
      const cancelledCost = Number(cancelledPart.rows[0]?.cost) || 0;
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
      if (current.status === 'DIAMBIL') {
        const error: any = new Error('Metadata pekerjaan tidak dapat diubah setelah unit diambil.');
        error.status = 409;
        throw error;
      }
      if (parsed.data.assignedTechId) {
        const technician = await client.query(
          `SELECT u.id FROM users u JOIN user_branches ub ON ub.user_id=u.id
           WHERE u.id=$1 AND u.tenant_id=$2 AND u.role='TEKNISI' AND ub.branch_id=$3 LIMIT 1`,
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
              operator: req.authActor?.email || req.authActor?.userId,
              timestamp: new Date().toISOString(),
            },
          ]
        : current.internalDiscussions || [];
      await client.query(
        `UPDATE service_tickets SET assigned_tech_id=COALESCE($1,assigned_tech_id),technician_notes=COALESCE($2,technician_notes),
         internal_discussions=$3::jsonb,tech_pre_checklist=COALESCE($4::jsonb,tech_pre_checklist),
         tech_post_checklist=COALESCE($5::jsonb,tech_post_checklist),repair_start_time=COALESCE($6::timestamp,repair_start_time),
         repair_end_time=COALESCE($7::timestamp,repair_end_time),storage_location_id=COALESCE($8,storage_location_id),
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
        ]
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
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
         WHERE sr.id=$1 AND sr.tenant_id=$2 AND sr.branch_id=$3 FOR UPDATE`,
        [req.params.receivableId, req.tenantId, req.branchId || req.headers['x-branch-id']]
      );
      if (!receivable.rows[0]) {
        const error: any = new Error('Piutang servis tidak ditemukan.');
        error.status = 404;
        throw error;
      }
      const item = receivable.rows[0];
      const duplicate = await client.query(
        'SELECT id FROM service_receivable_payments WHERE tenant_id=$1 AND idempotency_key=$2',
        [req.tenantId, parsed.data.idempotencyKey]
      );
      if (duplicate.rows[0]) return { receivable: item, idempotent: true };
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
      if (!['SELESAI', 'MENUGGU_PEMBAYARAN', 'SIAP_DIAMBIL'].includes(ticket.status)) {
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
        await client.query(
          "UPDATE service_parts SET status='USED',consumed_at=NOW(),updated_at=NOW() WHERE id=$1",
          [part.id]
        );
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
