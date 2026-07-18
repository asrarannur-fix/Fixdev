import type { Request, Response } from "express";
import { z } from "zod";
import { dbTransaction, dbQuery } from "../../lib/db.js";
import type { WhatsAppTemplate } from "../../types/index.js";

export const SERVICE_TRANSITIONS: Record<string, string[]> = {
  DITERIMA: ["ANTRIAN", "DIAGNOSA", "DIBATALKAN"],
  ANTRIAN: ["DIAGNOSA", "DIBATALKAN"],
  DIAGNOSA: ["MENUGGU_APPROVAL", "TIDAK_BISA_DIPERBAIKI", "DIBATALKAN"],
  MENUGGU_APPROVAL: ["SEDANG_DIKERJAKAN", "APPROVAL_DITOLAK", "DIBATALKAN"],
  ESTIMATE_PENDING: ["SEDANG_DIKERJAKAN", "APPROVAL_DITOLAK"],
  APPROVAL_DITOLAK: ["MENUGGU_APPROVAL", "DIBATALKAN"],
  MENUGGU_SPAREPART: ["SEDANG_DIKERJAKAN", "DIBATALKAN"],
  SEDANG_DIKERJAKAN: ["QC", "MENUGGU_SPAREPART", "TIDAK_BISA_DIPERBAIKI", "DIKIRIM_KE_VENDOR"],
  DIKIRIM_KE_VENDOR: ["SEDANG_DIKERJAKAN", "QC"],
  TIDAK_BISA_DIPERBAIKI: ["SELESAI", "DIBATALKAN", "KLAIM_GARANSI"],
  REWORK: ["SEDANG_DIKERJAKAN", "QC"],
  QC: ["SELESAI", "REWORK"],
  SELESAI: ["MENUGGU_PEMBAYARAN", "SIAP_DIAMBIL", "DIAMBIL", "KLAIM_GARANSI"],
  KLAIM_GARANSI: ["SELESAI", "DIBATALKAN"],
  MENUGGU_PEMBAYARAN: ["SIAP_DIAMBIL", "DIAMBIL"],
  SIAP_DIAMBIL: ["DIAMBIL"],
};

export function canTransition(from: string, to: string): boolean {
  return from === to || (SERVICE_TRANSITIONS[from] || []).includes(to);
}

export function calculateServiceInvoice(estimatedCost: number, downPayment: number, taxRate = 11) {
  const subtotal = Math.max(0, Number(estimatedCost) || 0);
  const taxAmount = Math.round(subtotal * (Math.max(0, taxRate) / 100));
  const total = subtotal + taxAmount;
  const downPaymentUsed = Math.min(total, Math.max(0, Number(downPayment) || 0));
  return { subtotal, taxAmount, total, downPaymentUsed, amountDue: total - downPaymentUsed };
}

const partOrderSchema = z.object({
  partName: z.string().trim().min(2), quantity: z.number().positive(), reason: z.string().trim().min(3),
  supplierName: z.string().trim().optional(), estimatedCost: z.number().min(0).default(0),
  estimatedArrivalDate: z.string().optional(), costApproved: z.boolean().default(false), note: z.string().optional(),
  idempotencyKey: z.string().trim().min(8),
});
const partOrderUpdateSchema = z.object({
  status: z.enum(["APPROVED", "ORDERED", "SHIPPED", "ARRIVED"]).optional(),
  supplierName: z.string().trim().optional(), estimatedArrivalDate: z.string().optional(), note: z.string().optional(),
});
const partArrivalSchema = z.object({ productId: z.string().uuid(), warehouseId: z.string().uuid(), serialNumber: z.string().optional() });

const additionalCostSchema = z.object({
  description: z.string().trim().min(3),
  amount: z.number().positive(),
  approvalMethod: z.enum(["WHATSAPP", "PHONE", "IN_PERSON"]).default("WHATSAPP"),
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
  parts: z.array(z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0).default(0),
    serialNumber: z.string().optional(),
  })).default([]),
});
const approvalSchema = z.object({ approved: z.boolean(), signatureName: z.string().trim().optional(), signature: z.string().optional() });
const qcSchema = z.object({
  passed: z.boolean(), score: z.number().min(0).max(100), notes: z.string().trim().min(2),
  checklist: z.array(z.object({ criteria: z.string().trim().min(1), passed: z.boolean() })).min(1),
  photos: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  if (data.passed && data.score < 80) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["score"], message: "Skor minimal untuk lulus QC adalah 80." });
  }
  if (data.passed && data.checklist.some((item) => !item.passed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checklist"], message: "Semua pemeriksaan harus lulus sebelum QC diselesaikan." });
  }
});
const handoverSchema = z.object({
  paymentMethod: z.string().min(1),
  referenceNo: z.string().optional(),
  proofName: z.string().optional(),
  tempoDays: z.number().int().min(1).max(365).optional(),
  taxRate: z.number().min(0).max(100).default(11),
  idempotencyKey: z.string().trim().min(8),
});
const partSchema = z.object({
  productId: z.string().uuid(), warehouseId: z.string().uuid(), quantity: z.number().positive(),
  serialNumber: z.string().trim().optional(),
});
const workMetadataSchema = z.object({
  assignedTechId: z.string().uuid().nullable().optional(),
  technicianNotes: z.string().optional(),
  internalDiscussion: z.object({ id: z.string(), text: z.string().trim().min(1), operator: z.string(), timestamp: z.string() }).optional(),
  techPreChecklist: z.array(z.any()).optional(), techPostChecklist: z.array(z.any()).optional(),
  repairStartTime: z.string().nullable().optional(), repairEndTime: z.string().nullable().optional(),
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

async function lockedTicket(client: any, req: Request) {
  const result = await client.query(
    `SELECT ${ticketSelect()} FROM service_tickets
     WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 FOR UPDATE`,
    [req.params.id, req.tenantId, req.branchId || req.headers["x-branch-id"]],
  );
  const ticket = result.rows[0];
  if (!ticket) { const error: any = new Error("Tiket servis tidak ditemukan."); error.status = 404; throw error; }
  return ticket;
}

async function appendEvent(client: any, req: Request, ticket: any, toStatus: string, note: string, metadata: any = {}, templateCategory = "SERVICE_UPDATE") {
  if (!canTransition(ticket.status, toStatus)) {
    const error: any = new Error(`Transisi ${ticket.status} ke ${toStatus} tidak diizinkan.`);
    error.status = 409;
    throw error;
  }
  const event = {
    status: toStatus, note, timestamp: new Date().toISOString(),
    operator: req.authActor?.email || req.authActor?.userId || "System",
  };
  const timeline = [...(ticket.timeline || []), event];
  const inserted = await client.query(
    `INSERT INTO service_status_events (tenant_id,ticket_id,from_status,to_status,note,actor_user_id,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
    [req.tenantId, ticket.id, ticket.status, toStatus, note, req.authActor?.userId, JSON.stringify(metadata)],
  );
  await client.query(
    `UPDATE service_tickets SET status=$1,timeline=$2::jsonb,updated_at=NOW() WHERE id=$3 AND tenant_id=$4`,
    [toStatus, JSON.stringify(timeline), ticket.id, req.tenantId],
  );
  ticket.status = toStatus;
  ticket.timeline = timeline;
  await queueNotification(client, req.tenantId!, ticket, inserted.rows[0].id, note, templateCategory, { toStatus, note, metadata });
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

async function getTenantWaTemplate(client: any, tenantId: string, category: string): Promise<string | null> {
  const result = await client.query(
    `SELECT settings #>> '{waConfig,templates}' AS templates FROM tenants WHERE id = $1`,
    [tenantId],
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

async function queueNotification(client: any, tenantId: string, ticket: any, eventId: string, message: string, templateCategory = "SERVICE_UPDATE", extraContext: any = {}) {
  const tenantSettings = await client.query(`SELECT settings FROM tenants WHERE id=$1`, [tenantId]);
  const waConfig = tenantSettings.rows[0]?.settings?.waConfig;
  if (waConfig?.sendingMethod === "MANUAL") {
    // If sending method is manual, do not queue system notifications
    return;
  }

  const customer = await client.query("SELECT name,phone FROM customers WHERE id=$1 AND tenant_id=$2", [ticket.customerId, tenantId]);
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
    [tenantId, customer.rows[0].name, customer.rows[0].phone, templateCategory, finalMessage, ticket.id, eventId],
  );
}

async function finalTicket(client: any, req: Request) {
  return (await client.query(`SELECT ${ticketSelect()} FROM service_tickets WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId])).rows[0];
}

function sendError(res: Response, error: any) {
  return res.status(error.status || 500).json({ error: error.message || "Workflow servis gagal." });
}

export async function listServiceTickets(req: Request, res: Response) {
  try {
    const branchId = req.branchId || req.headers["x-branch-id"];
    const result = await dbQuery(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE tenant_id=$1 AND branch_id=$2 ORDER BY created_at DESC LIMIT 500`,
      [req.tenantId, branchId],
    );
    res.json({ data: result.rows });
  } catch (error: any) { sendError(res, error); }
}

export async function getServiceTicket(req: Request, res: Response) {
  try {
    const result = await dbQuery(
      `SELECT ${ticketSelect()} FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 LIMIT 1`,
      [req.params.id, req.tenantId, req.branchId || req.headers["x-branch-id"]],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Tiket servis tidak ditemukan." });
    res.json({ data: result.rows[0] });
  } catch (error: any) { sendError(res, error); }
}

export async function transitionServiceTicket(req: Request, res: Response) {
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Status atau catatan tidak valid." });
  try {
    const ticket = await dbTransaction(async client => {
      const current = await lockedTicket(client, req);
      const to = parsed.data.status;
      if (to === "SELESAI" && current.qcStatus !== "PASSED") {
        const error: any = new Error("Tiket harus lulus QC (qcStatus=PASSED) sebelum dapat diselesaikan."); error.status = 409; throw error;
      }
      if (to === "SEDANG_DIKERJAKAN" && !["DIAGNOSA", "REWORK", "MENUGGU_SPAREPART", "APPROVAL_DITOLAK", "DIKIRIM_KE_VENDOR"].includes(current.status)) {
        const error: any = new Error("Pengerjaan hanya dapat dimulai setelah diagnosis/approval atau dari REWORK/MENUGGU_SPAREPART."); error.status = 409; throw error;
      }
      if (to === "MENUGGU_APPROVAL" && !current.techDiagnosis) {
        const error: any = new Error("Diagnosis harus diisi sebelum menunggu persetujuan pelanggan."); error.status = 409; throw error;
      }
      await appendEvent(client, req, current, to, parsed.data.note);
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) { sendError(res, error); }
}

export async function diagnoseServiceTicket(req: Request, res: Response) {
  const parsed = diagnosisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data diagnosis tidak valid.", details: parsed.error.flatten() });
  try {
    const ticket = await dbTransaction(async client => {
      const current = await lockedTicket(client, req);
      if (!["DITERIMA", "ANTRIAN", "DIAGNOSA", "APPROVAL_DITOLAK"].includes(current.status)) {
        const error: any = new Error(`Diagnosis tidak dapat disimpan pada status ${current.status}.`); error.status = 409; throw error;
      }
      await client.query("DELETE FROM service_parts WHERE ticket_id=$1 AND tenant_id=$2 AND status='REQUESTED'", [current.id, req.tenantId]);
      for (const part of parsed.data.parts) {
        await client.query(
          `INSERT INTO service_parts (tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'REQUESTED')`,
          [req.tenantId, current.id, part.productId, part.warehouseId || null, part.name, part.quantity, part.unitPrice, part.serialNumber || null],
        );
      }
      await client.query(
        `UPDATE service_tickets SET tech_diagnosis=$1,estimated_cost=$2,parts_requested=$3::jsonb,customer_approval_status='PENDING',updated_at=NOW()
         WHERE id=$4 AND tenant_id=$5`,
        [parsed.data.diagnosis, parsed.data.estimatedCost, JSON.stringify(parsed.data.parts), current.id, req.tenantId],
      );
      // A rejected estimate may be revised directly into a new approval request;
      // APPROVAL_DITOLAK -> DIAGNOSA is not a legal transition in the state machine.
      if (!["DIAGNOSA", "APPROVAL_DITOLAK"].includes(current.status)) {
        await appendEvent(client, req, current, "DIAGNOSA", "Teknisi memulai dan menyelesaikan pemeriksaan unit.");
      }
      await appendEvent(client, req, current, "MENUGGU_APPROVAL", "Diagnosis selesai dan estimasi menunggu persetujuan pelanggan.", { estimatedCost: parsed.data.estimatedCost });
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) { sendError(res, error); }
}

export async function approveServiceEstimate(req: Request, res: Response) {
  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data persetujuan tidak valid." });
  try {
    const ticket = await dbTransaction(async client => {
      const current = await lockedTicket(client, req);
      if (!["MENUGGU_APPROVAL", "ESTIMATE_PENDING"].includes(current.status)) {
        const error: any = new Error("Tiket tidak sedang menunggu persetujuan."); error.status = 409; throw error;
      }
      const status = parsed.data.approved ? "SEDANG_DIKERJAKAN" : "APPROVAL_DITOLAK";
      await client.query(
        `UPDATE service_tickets SET customer_approval_status=$1,provisional_signature_name=$2,
          provisional_signature=$3,provisional_approved_at=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6`,
        [parsed.data.approved ? "APPROVED" : "REJECTED", parsed.data.signatureName || null,
          parsed.data.signature || null, parsed.data.approved ? new Date() : null, current.id, req.tenantId],
      );
      await appendEvent(client, req, current, status, parsed.data.approved ? "Estimasi disetujui; pengerjaan dimulai." : "Estimasi ditolak pelanggan.");
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) { sendError(res, error); }
}

export async function completeServiceQc(req: Request, res: Response) {
  const parsed = qcSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data QC tidak valid." });
  try {
    const ticket = await dbTransaction(async client => {
      const current = await lockedTicket(client, req);
      if (current.status !== "QC") {
        const error: any = new Error(`Hasil QC hanya dapat dicatat saat tiket berada di tahap QC (status saat ini: ${current.status}).`); error.status = 409; throw error;
      }
      await client.query(
        `UPDATE service_tickets SET qc_score=$1,qc_notes=$2,qc_checklist=$3::jsonb,qc_photos=$4::jsonb,qc_status=$5,updated_at=NOW()
         WHERE id=$6 AND tenant_id=$7`,
        [parsed.data.score, parsed.data.notes, JSON.stringify(parsed.data.checklist), JSON.stringify(parsed.data.photos),
          parsed.data.passed ? "PASSED" : "FAILED", current.id, req.tenantId],
      );
      await appendEvent(client, req, current, parsed.data.passed ? "SELESAI" : "REWORK",
        parsed.data.passed ? `QC lulus dengan skor ${parsed.data.score}.` : `QC gagal; unit kembali ke rework. Skor ${parsed.data.score}.`);
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) { sendError(res, error); }
}

export async function createServicePartOrder(req: Request, res: Response) {
  const parsed = partOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data permintaan spare part tidak valid.", details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async client => {
      const duplicate = await client.query("SELECT * FROM service_part_orders WHERE tenant_id=$1 AND idempotency_key=$2", [req.tenantId, parsed.data.idempotencyKey]);
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].ticket_id !== req.params.id) {
          const error: any = new Error("Idempotency key sudah digunakan untuk tiket lain."); error.status = 409; throw error;
        }
        return { ticket: await finalTicket(client, req), order: duplicate.rows[0], idempotent: true };
      }
      const ticket = await lockedTicket(client, req);
      if (!["DIAGNOSA", "SEDANG_DIKERJAKAN", "REWORK"].includes(ticket.status)) {
        const error: any = new Error(`Permintaan spare part tidak dapat dibuat pada status ${ticket.status}.`); error.status = 409; throw error;
      }
      const order = await client.query(
        `INSERT INTO service_part_orders(tenant_id,ticket_id,idempotency_key,part_name,quantity,reason,supplier_name,estimated_cost,estimated_arrival_date,cost_approved,note,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [req.tenantId, ticket.id, parsed.data.idempotencyKey, parsed.data.partName, parsed.data.quantity,
          parsed.data.reason, parsed.data.supplierName || null, parsed.data.estimatedCost,
          parsed.data.estimatedArrivalDate || null, parsed.data.costApproved, parsed.data.note || null, req.authActor?.userId],
      );
      await client.query("UPDATE service_tickets SET repair_end_time=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2", [ticket.id, req.tenantId]);
      await appendEvent(client, req, ticket, "MENUGGU_SPAREPART", `Pengerjaan ditunda menunggu ${parsed.data.partName} x${parsed.data.quantity}${parsed.data.estimatedArrivalDate ? `, estimasi tiba ${parsed.data.estimatedArrivalDate}` : ""}.`, { partOrderId: order.rows[0].id });
      return { ticket: await finalTicket(client, req), order: order.rows[0], idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}

export async function updateServicePartOrder(req: Request, res: Response) {
  const parsed = partOrderUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Pembaruan permintaan part tidak valid." });
  try {
    const result = await dbTransaction(async client => {
      const ticket = await lockedTicket(client, req);
      const updated = await client.query(
        `UPDATE service_part_orders SET status=COALESCE($1,status),supplier_name=COALESCE($2,supplier_name),
         estimated_arrival_date=COALESCE($3::date,estimated_arrival_date),note=COALESCE($4,note),updated_at=NOW()
         WHERE id=$5 AND tenant_id=$6 AND ticket_id=$7 AND status <> 'CANCELLED' RETURNING *`,
        [parsed.data.status || null, parsed.data.supplierName || null, parsed.data.estimatedArrivalDate || null,
          parsed.data.note || null, req.params.orderId, req.tenantId, ticket.id],
      );
      if (!updated.rows[0]) { const error: any = new Error("Permintaan spare part tidak ditemukan."); error.status = 404; throw error; }
      return { ticket: await finalTicket(client, req), order: updated.rows[0] };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}

export async function receiveServicePartOrder(req: Request, res: Response) {
  const parsed = partArrivalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Produk dan gudang wajib dipilih." });
  try {
    const result = await dbTransaction(async client => {
      const ticket = await lockedTicket(client, req);
      if (ticket.status !== "MENUGGU_SPAREPART") { const error: any = new Error("Tiket tidak sedang menunggu spare part."); error.status = 409; throw error; }
      const orderResult = await client.query("SELECT * FROM service_part_orders WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 FOR UPDATE", [req.params.orderId, req.tenantId, ticket.id]);
      const order = orderResult.rows[0];
      if (!order || order.status === "CANCELLED" || order.status === "RESERVED") { const error: any = new Error("Permintaan part tidak aktif."); error.status = 409; throw error; }
      const product = await client.query(
        `SELECT p.name,p.sell_price,COALESCE(ps.quantity,0)::float stock FROM products p
         LEFT JOIN product_stock ps ON ps.product_id=p.id AND ps.warehouse_id=$2
         WHERE p.id=$1 AND p.tenant_id=$3 LIMIT 1`,
        [parsed.data.productId, parsed.data.warehouseId, req.tenantId],
      );
      if (!product.rows[0] || Number(product.rows[0].stock) < Number(order.quantity)) { const error: any = new Error("Stok part yang tiba belum mencukupi."); error.status = 409; throw error; }
      await client.query(
        `INSERT INTO service_parts(tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,'RESERVED')`,
        [req.tenantId, ticket.id, parsed.data.productId, parsed.data.warehouseId, product.rows[0].name,
          order.quantity, product.rows[0].sell_price, parsed.data.serialNumber || null],
      );
      await client.query("UPDATE service_part_orders SET status='RESERVED',product_id=$1,warehouse_id=$2,updated_at=NOW() WHERE id=$3", [parsed.data.productId, parsed.data.warehouseId, order.id]);
      await appendEvent(client, req, ticket, "SEDANG_DIKERJAKAN", `${order.part_name} telah tiba dan direservasi. Pengerjaan dilanjutkan.`, { partOrderId: order.id });
      return { ticket: await finalTicket(client, req), order: { ...order, status: "RESERVED" } };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}

export async function cancelServicePartOrder(req: Request, res: Response) {
  try {
    const result = await dbTransaction(async client => {
      const ticket = await lockedTicket(client, req);
      const cancelled = await client.query(
        `UPDATE service_part_orders SET status='CANCELLED',updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status NOT IN ('RESERVED','CANCELLED') RETURNING *`,
        [req.params.orderId, req.tenantId, ticket.id],
      );
      if (!cancelled.rows[0]) { const error: any = new Error("Permintaan tidak dapat dibatalkan."); error.status = 409; throw error; }
      return { ticket: await finalTicket(client, req), order: cancelled.rows[0] };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}

export async function addApprovedAdditionalCost(req: Request, res: Response) {
  const parsed = additionalCostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data tambahan biaya tidak valid.", details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async client => {
      const duplicate = await client.query(
        "SELECT * FROM service_cost_adjustments WHERE tenant_id=$1 AND idempotency_key=$2 LIMIT 1",
        [req.tenantId, parsed.data.idempotencyKey],
      );
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].ticket_id !== req.params.id) {
          const error: any = new Error("Idempotency key sudah digunakan untuk tiket lain."); error.status = 409; throw error;
        }
        return { ticket: await finalTicket(client, req), adjustment: duplicate.rows[0], idempotent: true };
      }

      const ticket = await lockedTicket(client, req);
      if (!["SEDANG_DIKERJAKAN", "REWORK"].includes(ticket.status)) {
        const error: any = new Error(`Tambahan biaya tidak dapat dicatat pada status ${ticket.status}.`);
        error.status = 409;
        throw error;
      }
      const cost = calculateAdditionalCost(ticket.estimatedCost, parsed.data.amount);
      const adjustment = await client.query(
        `INSERT INTO service_cost_adjustments
          (tenant_id,ticket_id,idempotency_key,description,amount,previous_cost,new_cost,approval_method,approved_by_name,note,proof_name,recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [req.tenantId, ticket.id, parsed.data.idempotencyKey, parsed.data.description, parsed.data.amount,
          cost.previousCost, cost.newCost, parsed.data.approvalMethod, parsed.data.approvedByName || null,
          parsed.data.note || null, parsed.data.proofName || null, req.authActor?.userId],
      );
      await client.query("UPDATE service_tickets SET estimated_cost=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",
        [cost.newCost, ticket.id, req.tenantId]);
      const methodLabel = parsed.data.approvalMethod === "WHATSAPP" ? "WhatsApp" : parsed.data.approvalMethod === "PHONE" ? "Telepon" : "Langsung di toko";
      await appendEvent(
        client,
        req,
        ticket,
        ticket.status,
        `Tambahan biaya Rp ${parsed.data.amount.toLocaleString("id-ID")} untuk ${parsed.data.description} disetujui via ${methodLabel}. Total baru Rp ${cost.newCost.toLocaleString("id-ID")}.`,
        { ...cost, approvalMethod: parsed.data.approvalMethod },
      );
      await client.query(
        `INSERT INTO audit_logs(id,tenant_id,user_id,action,details)
         VALUES(gen_random_uuid(),$1,$2,'ADD_APPROVED_SERVICE_COST',$3)`,
        [req.tenantId, req.authActor?.userId, `${ticket.ticketNo}: ${parsed.data.description}; ${cost.previousCost} -> ${cost.newCost}`],
      );
      return { ticket: await finalTicket(client, req), adjustment: adjustment.rows[0], idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}

export async function requestServicePart(req: Request, res: Response) {
  const parsed = partSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data spare part tidak valid." });
  try {
    const data = await dbTransaction(async client => {
      const ticket = await lockedTicket(client, req);
      if (!["DIAGNOSA", "MENUGGU_APPROVAL", "SEDANG_DIKERJAKAN", "MENUGGU_SPAREPART", "REWORK"].includes(ticket.status)) {
        const error: any = new Error(`Spare part tidak dapat ditambahkan pada status ${ticket.status}.`); error.status = 409; throw error;
      }
      const product = await client.query(
        `SELECT p.id,p.name,p.sell_price,COALESCE(ps.quantity,0)::float AS stock
         FROM products p LEFT JOIN product_stock ps ON ps.product_id=p.id AND ps.warehouse_id=$2
         WHERE p.id=$1 AND p.tenant_id=$3 LIMIT 1`,
        [parsed.data.productId, parsed.data.warehouseId, req.tenantId],
      );
      if (!product.rows[0]) { const error: any = new Error("Produk tidak ditemukan."); error.status = 404; throw error; }
      if (Number(product.rows[0].stock) < parsed.data.quantity) { const error: any = new Error("Stok spare part tidak mencukupi."); error.status = 409; throw error; }
      await client.query(
        `INSERT INTO service_parts (tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'RESERVED')`,
        [req.tenantId, ticket.id, parsed.data.productId, parsed.data.warehouseId, product.rows[0].name,
          parsed.data.quantity, product.rows[0].sell_price, parsed.data.serialNumber || null],
      );
      const parts = await client.query(
        `SELECT id,product_id AS "productId",warehouse_id AS "warehouseId",name,quantity::float,
          unit_price::float AS "unitPrice",(quantity*unit_price)::float AS "totalPrice",serial_number AS "serialNumber",status
         FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status IN ('REQUESTED','RESERVED') ORDER BY created_at`,
        [req.tenantId, ticket.id],
      );
      await client.query("UPDATE service_tickets SET parts_requested=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",
        [JSON.stringify(parts.rows), ticket.id, req.tenantId]);
      return { ticket: await finalTicket(client, req), availableStock: Number(product.rows[0].stock) };
    });
    res.json({ data });
  } catch (error: any) { sendError(res, error); }
}

export async function cancelServicePart(req: Request, res: Response) {
  try {
    const data = await dbTransaction(async client => {
      const ticket = await lockedTicket(client, req);
      const removed = await client.query(
        `UPDATE service_parts SET status='CANCELLED',updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status IN ('REQUESTED','RESERVED') RETURNING id`,
        [req.params.partId, req.tenantId, ticket.id],
      );
      if (!removed.rows[0]) { const error: any = new Error("Spare part tidak ditemukan atau sudah digunakan."); error.status = 404; throw error; }
      const parts = await client.query(
        `SELECT id,product_id AS "productId",warehouse_id AS "warehouseId",name,quantity::float,
          unit_price::float AS "unitPrice",(quantity*unit_price)::float AS "totalPrice",serial_number AS "serialNumber",status
         FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status IN ('REQUESTED','RESERVED') ORDER BY created_at`,
        [req.tenantId, ticket.id],
      );
      await client.query("UPDATE service_tickets SET parts_requested=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",
        [JSON.stringify(parts.rows), ticket.id, req.tenantId]);
      return { ticket: await finalTicket(client, req) };
    });
    res.json({ data });
  } catch (error: any) { sendError(res, error); }
}

export async function patchServiceWorkMetadata(req: Request, res: Response) {
  const parsed = workMetadataSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Metadata pekerjaan tidak valid." });
  try {
    const ticket = await dbTransaction(async client => {
      const current = await lockedTicket(client, req);
      if (current.status === "DIAMBIL") {
        const error: any = new Error("Metadata pekerjaan tidak dapat diubah setelah unit diambil."); error.status = 409; throw error;
      }
      const discussions = parsed.data.internalDiscussion
        ? [...(current.internalDiscussions || []), parsed.data.internalDiscussion]
        : current.internalDiscussions || [];
      await client.query(
        `UPDATE service_tickets SET assigned_tech_id=COALESCE($1,assigned_tech_id),technician_notes=COALESCE($2,technician_notes),
         internal_discussions=$3::jsonb,tech_pre_checklist=COALESCE($4::jsonb,tech_pre_checklist),
         tech_post_checklist=COALESCE($5::jsonb,tech_post_checklist),repair_start_time=COALESCE($6::timestamp,repair_start_time),
         repair_end_time=COALESCE($7::timestamp,repair_end_time),updated_at=NOW() WHERE id=$8 AND tenant_id=$9`,
        [parsed.data.assignedTechId ?? null, parsed.data.technicianNotes ?? null, JSON.stringify(discussions),
          parsed.data.techPreChecklist ? JSON.stringify(parsed.data.techPreChecklist) : null,
          parsed.data.techPostChecklist ? JSON.stringify(parsed.data.techPostChecklist) : null,
          parsed.data.repairStartTime ?? null, parsed.data.repairEndTime ?? null, current.id, req.tenantId],
      );
      return finalTicket(client, req);
    });
    res.json({ data: ticket });
  } catch (error: any) { sendError(res, error); }
}

export async function handoverServiceTicket(req: Request, res: Response) {
  const parsed = handoverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data pembayaran/handover tidak valid.", details: parsed.error.flatten() });
  const isReferenceRequired = !["CASH", "TEMPO"].includes(parsed.data.paymentMethod);
  if (isReferenceRequired && !parsed.data.referenceNo && !parsed.data.proofName) {
    return res.status(422).json({ error: "Nomor referensi atau bukti pembayaran diperlukan." });
  }
  try {
    const result = await dbTransaction(async client => {
      const duplicate = await client.query("SELECT id,ticket_id FROM service_payments WHERE tenant_id=$1 AND idempotency_key=$2", [req.tenantId, parsed.data.idempotencyKey]);
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].ticket_id !== req.params.id) {
          const error: any = new Error("Idempotency key sudah digunakan untuk tiket lain."); error.status = 409; throw error;
        }
        return { ticket: await finalTicket(client, req), idempotent: true };
      }
      const ticket = await lockedTicket(client, req);
      if (!["SELESAI", "MENUGGU_PEMBAYARAN", "SIAP_DIAMBIL"].includes(ticket.status)) {
        const error: any = new Error(`Handover tidak dapat dilakukan pada status ${ticket.status}.`); error.status = 409; throw error;
      }
      if (ticket.qcStatus !== "PASSED") {
        const error: any = new Error("Tiket harus lulus QC sebelum dapat diserahkan."); error.status = 409; throw error;
      }
      const invoice = calculateServiceInvoice(ticket.estimatedCost, ticket.downPayment, parsed.data.taxRate);
      const parts = await client.query("SELECT * FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2 AND status IN ('REQUESTED','RESERVED') FOR UPDATE", [req.tenantId, ticket.id]);
      for (const part of parts.rows) {
        if (!part.warehouse_id) { const error: any = new Error(`Gudang untuk part ${part.name} belum ditentukan.`); error.status = 422; throw error; }
        const stock = await client.query("SELECT quantity FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE", [part.product_id, part.warehouse_id]);
        if (Number(stock.rows[0]?.quantity || 0) < Number(part.quantity)) {
          const error: any = new Error(`Stok ${part.name} tidak mencukupi.`); error.status = 409; throw error;
        }
        await client.query("UPDATE product_stock SET quantity=quantity-$1 WHERE product_id=$2 AND warehouse_id=$3", [part.quantity, part.product_id, part.warehouse_id]);
        await client.query(
          `INSERT INTO service_stock_movements (tenant_id,ticket_id,product_id,warehouse_id,quantity,movement_type,reference_no)
           VALUES ($1,$2,$3,$4,$5,'SERVICE_OUT',$6)
           ON CONFLICT (ticket_id,product_id,warehouse_id,movement_type)
           DO UPDATE SET quantity=service_stock_movements.quantity + EXCLUDED.quantity`,
          [req.tenantId, ticket.id, part.product_id, part.warehouse_id, -Number(part.quantity), ticket.ticketNo],
        );
        await client.query("UPDATE service_parts SET status='USED',consumed_at=NOW(),updated_at=NOW() WHERE id=$1", [part.id]);
      }
      const dueAt = parsed.data.paymentMethod === "TEMPO"
        ? new Date(Date.now() + (parsed.data.tempoDays || 30) * 86400000) : null;
      const payment = await client.query(
        `INSERT INTO service_payments (tenant_id,branch_id,ticket_id,idempotency_key,method,subtotal,tax_amount,down_payment_used,amount,reference_no,proof_name,tempo_days,due_at,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [req.tenantId, ticket.branchId, ticket.id, parsed.data.idempotencyKey, parsed.data.paymentMethod,
          invoice.subtotal, invoice.taxAmount, invoice.downPaymentUsed, invoice.amountDue, parsed.data.referenceNo || null,
          parsed.data.proofName || null, parsed.data.tempoDays || 0, dueAt,
          parsed.data.paymentMethod === "TEMPO" ? "RECEIVABLE" : "PAID", req.authActor?.userId],
      );
      const debitAccountCode = parsed.data.paymentMethod === "TEMPO" ? "10300" : (["CASH", "DEPOSIT"].includes(parsed.data.paymentMethod) ? "10100" : "10200");
      const debitAccount = await client.query(
        `SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code=$2 LIMIT 1`,
        [req.tenantId, debitAccountCode],
      );
      const revenueAccount = await client.query("SELECT id FROM coa_accounts WHERE tenant_id=$1 AND code='40100' LIMIT 1", [req.tenantId]);
      if (invoice.amountDue > 0 && (!debitAccount.rows[0] || !revenueAccount.rows[0])) {
        const error: any = new Error(`Akun jurnal pembayaran servis belum dikonfigurasi (40100 dan ${parsed.data.paymentMethod === "TEMPO" ? "10300" : (["CASH", "DEPOSIT"].includes(parsed.data.paymentMethod) ? "10100" : "10200")}).`); error.status = 422; throw error;
      }
      if (invoice.amountDue > 0) {
        const journal = await client.query(
          `INSERT INTO journal_entries (id,tenant_id,branch_id,description,reference_no,source_type,source_id,created_by) VALUES (gen_random_uuid(),$1,$2,$3,$4,'SERVICE_PAYMENT',$5,$6) RETURNING id`,
          [req.tenantId, ticket.branchId, `Pembayaran servis ${ticket.ticketNo}`, ticket.ticketNo, payment.rows[0].id, req.authActor?.userId],
        );
        await client.query(
          `INSERT INTO journal_lines (id,journal_entry_id,account_id,debit,credit) VALUES
           (gen_random_uuid(),$1,$2,$4,0),(gen_random_uuid(),$1,$3,0,$4)`,
          [journal.rows[0].id, debitAccount.rows[0].id, revenueAccount.rows[0].id, invoice.amountDue],
        );
      }
      const warrantyEndsAt = new Date(Date.now() + Number(ticket.warrantyMonths || 0) * 30 * 86400000);
      await client.query(
        `UPDATE service_tickets SET payment_method=$1,payment_ref=$2,payment_proof_name=$3,tempo_days=$4,
          handover_at=NOW(),warranty_ends_at=$5,warranty_card_sent=TRUE,warranty_card_url=$6,invoice_id=$7,
          parts_used=parts_requested,updated_at=NOW() WHERE id=$8 AND tenant_id=$9`,
        [parsed.data.paymentMethod, parsed.data.referenceNo || null, parsed.data.proofName || null,
          parsed.data.tempoDays || 0, warrantyEndsAt, `/warranty/${encodeURIComponent(ticket.ticketNo)}`,
          payment.rows[0].id, ticket.id, req.tenantId],
      );
      await appendEvent(client, req, ticket, "DIAMBIL", `Unit diserahkan melalui ${parsed.data.paymentMethod}. Sisa tagihan Rp ${invoice.amountDue.toLocaleString("id-ID")}.`, invoice);
      return { ticket: await finalTicket(client, req), invoice, idempotent: false };
    });
    res.json({ data: result });
  } catch (error: any) { sendError(res, error); }
}
