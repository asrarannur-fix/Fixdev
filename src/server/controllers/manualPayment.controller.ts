import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

const PROOF_BUCKET = process.env.BILLING_PROOF_BUCKET || "billing-payment-proofs";
const MANUAL_CONFIG_KEY = "manual_payment_config";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const MAX_QRIS_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_QRIS_TYPES = new Set(["image/jpeg", "image/png"]);

interface ManualPaymentConfig {
  bankTransferEnabled: boolean;
  manualQrisEnabled: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  instructions: string;
  qrisObjectPath: string;
  qrisOriginalName: string;
}

const DEFAULT_MANUAL_CONFIG: ManualPaymentConfig = {
  bankTransferEnabled: false,
  manualQrisEnabled: false,
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  instructions: "",
  qrisObjectPath: "",
  qrisOriginalName: "",
};

function storageAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "pdf";
}

async function readManualConfig(): Promise<ManualPaymentConfig> {
  const result = await dbQuery(`SELECT value FROM app_settings WHERE key=$1 LIMIT 1`, [MANUAL_CONFIG_KEY]);
  return { ...DEFAULT_MANUAL_CONFIG, ...(result.rows[0]?.value || {}) };
}

export async function getManualPaymentConfig(req: Request, res: Response) {
  try {
    const config = await readManualConfig();
    let qrisImageUrl = "";
    if (config.manualQrisEnabled && config.qrisObjectPath) {
      const signed = await storageAdmin().storage.from(PROOF_BUCKET).createSignedUrl(config.qrisObjectPath, 600);
      if (!signed.error) qrisImageUrl = signed.data.signedUrl;
    }
    const isSuperAdmin = req.authActor?.role === "SUPER_ADMIN";
    res.json({
      bankTransferEnabled: config.bankTransferEnabled,
      manualQrisEnabled: config.manualQrisEnabled,
      bankName: config.bankName,
      accountNumber: config.accountNumber,
      accountHolder: config.accountHolder,
      instructions: config.instructions,
      qrisImageUrl,
      qrisOriginalName: isSuperAdmin ? config.qrisOriginalName : undefined,
      qrisConfigured: Boolean(config.qrisObjectPath),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not load manual payment config");
    res.status(500).json({ error: "Konfigurasi pembayaran manual gagal dimuat." });
  }
}

export async function createManualQrisUpload(req: Request, res: Response) {
  const { fileName, contentType, sizeBytes } = req.body || {};
  if (!fileName || !ALLOWED_QRIS_TYPES.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_QRIS_BYTES) {
    return res.status(422).json({ error: "QRIS harus JPG atau PNG maksimal 2 MB." });
  }
  const objectPath = `platform/manual-payment/qris-${randomUUID()}.${extensionFor(contentType)}`;
  try {
    const { data, error } = await storageAdmin().storage.from(PROOF_BUCKET).createSignedUploadUrl(objectPath);
    if (error) throw error;
    res.json({ objectPath, signedUploadUrl: data.signedUrl, token: data.token, expiresIn: 120 });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not create QRIS upload URL");
    res.status(503).json({ error: "Penyimpanan gambar QRIS belum tersedia." });
  }
}

export async function updateManualPaymentConfig(req: Request, res: Response) {
  const body = req.body || {};
  const config: ManualPaymentConfig = {
    bankTransferEnabled: Boolean(body.bankTransferEnabled),
    manualQrisEnabled: Boolean(body.manualQrisEnabled),
    bankName: String(body.bankName || "").trim().slice(0, 100),
    accountNumber: String(body.accountNumber || "").replace(/[^0-9]/g, "").slice(0, 40),
    accountHolder: String(body.accountHolder || "").trim().slice(0, 120),
    instructions: String(body.instructions || "").trim().slice(0, 2000),
    qrisObjectPath: String(body.qrisObjectPath || "").trim(),
    qrisOriginalName: String(body.qrisOriginalName || "").trim().slice(0, 255),
  };
  if (config.bankTransferEnabled && (!config.bankName || !config.accountNumber || !config.accountHolder)) {
    return res.status(422).json({ error: "Bank, nomor rekening, dan nama pemilik wajib diisi." });
  }
  if (config.manualQrisEnabled && !config.qrisObjectPath.startsWith("platform/manual-payment/")) {
    return res.status(422).json({ error: "Upload gambar QRIS terlebih dahulu." });
  }
  try {
    await dbQuery(`INSERT INTO app_settings(key,value,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$2::jsonb,updated_at=now()`, [MANUAL_CONFIG_KEY, JSON.stringify(config)]);
    res.json({ success: true, config: { ...config, qrisObjectPath: undefined } });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not save manual payment config");
    res.status(500).json({ error: "Konfigurasi pembayaran manual gagal disimpan." });
  }
}

async function audit(client: any, req: Request, action: string, resourceId: string, metadata: Record<string, unknown> = {}) {
  await client.query(
    `INSERT INTO billing_audit_events
       (actor_user_id, actor_role, effective_tenant_id, action, resource_type, resource_id, outcome, metadata)
     VALUES ($1, $2, $3, $4, 'manual_payment', $5, 'SUCCESS', $6::jsonb)`,
    [req.authActor?.userId, req.authActor?.role, req.tenantId || null, action, resourceId, JSON.stringify(metadata)],
  );
}

async function notify(client: any, eventKey: string, tenantId: string, audienceRole: string | null, title: string, message: string, requestId: string) {
  await client.query(
    `INSERT INTO billing_internal_notifications
       (tenant_id, audience_role, event_type, title, message, resource_type, resource_id)
     VALUES ($1, $2, $3, $4, $5, 'manual_payment', $6)`,
    [tenantId, audienceRole, eventKey.split(":")[0], title, message, requestId],
  );
  await client.query(
    `INSERT INTO billing_notification_outbox
       (event_key, tenant_id, channel, recipient, payload)
     VALUES ($1, $2, 'INTERNAL', $3, $4::jsonb)
     ON CONFLICT (event_key, channel, recipient) DO NOTHING`,
    [eventKey, tenantId, audienceRole, JSON.stringify({ title, message, requestId })],
  );

  const contact = await client.query(
    `SELECT COALESCE(
       settings #>> '{notificationSettings,whatsappNumber}',
       settings #>> '{waConfig,phoneNumber}'
     ) AS phone
     FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const phone = contact.rows[0]?.phone?.replace(/[^0-9+]/g, "");
  if (phone) {
    await client.query(
      `INSERT INTO billing_notification_outbox
         (event_key, tenant_id, channel, recipient, payload)
       VALUES ($1, $2, 'WHATSAPP', $3, $4::jsonb)
       ON CONFLICT (event_key, channel, recipient) DO NOTHING`,
      [eventKey, tenantId, phone, JSON.stringify({ title, message, requestId })],
    );
  }
}

export async function createManualProofUpload(req: Request, res: Response) {
  const { invoiceId } = req.params;
  const { fileName, contentType, sizeBytes } = req.body || {};
  if (!fileName || !ALLOWED_PROOF_TYPES.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_PROOF_BYTES) {
    return res.status(422).json({ error: "Bukti harus JPG, PNG, atau PDF dengan ukuran maksimal 5 MB." });
  }

  const invoice = await dbQuery(`SELECT id, tenant_id, status FROM saas_invoices WHERE id = $1 AND tenant_id = $2`, [invoiceId, req.tenantId]);
  if (!invoice.rows[0]) return res.status(404).json({ error: "Invoice tidak ditemukan." });
  if (invoice.rows[0].status === "PAID") return res.status(409).json({ error: "Invoice sudah lunas." });

  const uploadId = randomUUID();
  const objectPath = `tenant/${req.tenantId}/invoice/${invoiceId}/${uploadId}.${extensionFor(contentType)}`;
  try {
    const { data, error } = await storageAdmin().storage.from(PROOF_BUCKET).createSignedUploadUrl(objectPath);
    if (error) throw error;
    return res.json({ uploadId, objectPath, signedUploadUrl: data.signedUrl, token: data.token, expiresIn: 120, fileName, contentType, sizeBytes });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not create billing proof upload URL");
    return res.status(503).json({ error: "Penyimpanan bukti pembayaran belum tersedia." });
  }
}

export async function submitManualPayment(req: Request, res: Response) {
  const { invoiceId } = req.params;
  const { method, paidAt, payerName, referenceNumber, notes, objectPath, originalName, contentType, sizeBytes, supersedesId } = req.body || {};
  if (!["BANK_TRANSFER", "MANUAL_QRIS"].includes(method) || !paidAt || !payerName?.trim() || !referenceNumber?.trim()) {
    return res.status(422).json({ error: "Metode, tanggal bayar, nama pembayar, dan referensi wajib diisi." });
  }
  if (!ALLOWED_PROOF_TYPES.has(contentType) || sizeBytes < 1 || sizeBytes > MAX_PROOF_BYTES) {
    return res.status(422).json({ error: "Metadata bukti pembayaran tidak valid." });
  }
  const expectedPrefix = `tenant/${req.tenantId}/invoice/${invoiceId}/`;
  if (typeof objectPath !== "string" || !objectPath.startsWith(expectedPrefix)) {
    return res.status(422).json({ error: "Lokasi bukti pembayaran tidak valid." });
  }

  try {
    const result = await dbTransaction(async (client) => {
      const locked = await client.query(`SELECT id, tenant_id, amount, status FROM saas_invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, [invoiceId, req.tenantId]);
      const invoice = locked.rows[0];
      if (!invoice) return { code: 404, error: "Invoice tidak ditemukan." };
      if (invoice.status === "PAID") return { code: 409, error: "Invoice sudah lunas." };

      const inserted = await client.query(
        `INSERT INTO manual_payment_requests
          (invoice_id, tenant_id, method, amount, paid_at, payer_name, reference_number, notes,
           proof_object_path, proof_original_name, proof_content_type, proof_size_bytes,
           submitted_by, recorded_by, supersedes_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [invoiceId, req.tenantId, method, invoice.amount, paidAt, payerName.trim(), referenceNumber.trim(), notes || null,
          objectPath, originalName, contentType, sizeBytes, req.authActor?.userId,
          req.authActor?.role === "SUPER_ADMIN" ? req.authActor.userId : null, supersedesId || null],
      );
      await client.query(`UPDATE saas_invoices SET status = 'PENDING_VERIFICATION', version = version + 1 WHERE id = $1`, [invoiceId]);
      await audit(client, req, "MANUAL_PAYMENT_SUBMITTED", inserted.rows[0].id, { method, invoiceId });
      await notify(client, `manual_submitted:${inserted.rows[0].id}`, req.tenantId!, "SUPER_ADMIN", "Pembayaran menunggu verifikasi", `Bukti pembayaran invoice ${invoiceId} telah dikirim.`, inserted.rows[0].id);
      return { request: inserted.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    return res.status(201).json({ success: true, ...(result as any) });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Invoice ini sudah memiliki pengajuan yang sedang ditinjau." });
    logger.error({ err: err.message }, "Manual payment submission failed");
    return res.status(500).json({ error: "Gagal mengirim pembayaran manual." });
  }
}

export async function listManualPayments(req: Request, res: Response) {
  try {
    const params: unknown[] = [];
    const clauses: string[] = [];
  if (req.authActor?.role !== "SUPER_ADMIN") {
    params.push(req.tenantId);
    clauses.push(`m.tenant_id = $${params.length}`);
  } else if (req.query.tenantId) {
    params.push(req.query.tenantId);
    clauses.push(`m.tenant_id = $${params.length}`);
  }
  if (req.query.status) {
    params.push(req.query.status);
    clauses.push(`m.status = $${params.length}`);
  }
    const result = await dbQuery(
      `SELECT m.*, i.tier, i.billing_cycle, t.name AS tenant_name
       FROM manual_payment_requests m
       JOIN saas_invoices i ON i.id = m.invoice_id
       JOIN tenants t ON t.id = m.tenant_id
       ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY m.submitted_at DESC LIMIT 100`, params,
    );
    res.json({ requests: result.rows });
  } catch (err: any) {
    if (err?.code === "42P01") {
      return res.status(503).json({
        error: "Schema pembayaran manual belum diterapkan.",
        migrationRequired: ["005_billing.sql", "006_secure_manual_payments.sql"],
      });
    }
    logger.error({ err: err.message }, "Could not list manual payments");
    res.status(500).json({ error: "Antrean pembayaran manual gagal dimuat." });
  }
}

export async function getManualProofUrl(req: Request, res: Response) {
  const params: unknown[] = [req.params.id];
  let scope = "";
  if (req.authActor?.role !== "SUPER_ADMIN") {
    params.push(req.tenantId);
    scope = ` AND tenant_id = $2`;
  }
  const result = await dbQuery(`SELECT proof_object_path FROM manual_payment_requests WHERE id = $1${scope}`, params);
  if (!result.rows[0]) return res.status(404).json({ error: "Bukti pembayaran tidak ditemukan." });
  const { data, error } = await storageAdmin().storage.from(PROOF_BUCKET).createSignedUrl(result.rows[0].proof_object_path, 120);
  if (error) return res.status(503).json({ error: "Bukti pembayaran tidak dapat dibuka." });
  res.json({ signedUrl: data.signedUrl, expiresIn: 120 });
}

async function reviewManualPayment(req: Request, res: Response, decision: "APPROVED" | "REJECTED") {
  const expectedVersion = Number(req.body?.expectedVersion);
  const reason = String(req.body?.reason || "").trim();
  if (!Number.isInteger(expectedVersion)) return res.status(422).json({ error: "expectedVersion wajib diisi." });
  if (decision === "REJECTED" && !reason) return res.status(422).json({ error: "Alasan penolakan wajib diisi." });

  const result = await dbTransaction(async (client) => {
    const locked = await client.query(
      `SELECT m.*, i.tier, i.billing_cycle, i.status AS invoice_status, i.plan_snapshot
       FROM manual_payment_requests m JOIN saas_invoices i ON i.id = m.invoice_id
       WHERE m.id = $1 FOR UPDATE OF m, i`, [req.params.id],
    );
    const payment = locked.rows[0];
    if (!payment) return { code: 404, error: "Pengajuan tidak ditemukan." };
    if (payment.status !== "SUBMITTED" || payment.version !== expectedVersion) return { code: 409, error: "Pengajuan sudah berubah. Muat ulang data." };

    if (decision === "REJECTED") {
      await client.query(`UPDATE manual_payment_requests SET status='REJECTED', rejection_reason=$2, reviewed_by=$3, reviewed_at=now(), version=version+1 WHERE id=$1`, [payment.id, reason, req.authActor?.userId]);
      await client.query(`UPDATE saas_invoices SET status = CASE WHEN due_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'UNPAID' END, version=version+1 WHERE id=$1 AND status='PENDING_VERIFICATION'`, [payment.invoice_id]);
    } else {
      if (payment.invoice_status === "PAID") return { code: 409, error: "Invoice sudah diselesaikan oleh transaksi lain." };
      const periodEnd = new Date();
      if (payment.billing_cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);
      await client.query(`UPDATE manual_payment_requests SET status='APPROVED', reviewed_by=$2, reviewed_at=now(), version=version+1 WHERE id=$1`, [payment.id, req.authActor?.userId]);
      await client.query(`INSERT INTO billing_transactions (invoice_id,tenant_id,channel,method,amount,status,provider_transaction_id) VALUES ($1,$2,'MANUAL',$3,$4,'SETTLEMENT',$5)`, [payment.invoice_id, payment.tenant_id, payment.method, payment.amount, payment.id]);
      await client.query(`UPDATE saas_invoices SET status='PAID', paid_at=now(), period_start=now(), period_end=$2, version=version+1 WHERE id=$1`, [payment.invoice_id, periodEnd]);
      await client.query(`UPDATE tenants SET status='ACTIVE', tier=$2, trial_ends_at=$3, settings=COALESCE(settings,'{}'::jsonb) || jsonb_build_object('limits', COALESCE($4::jsonb,'{}'::jsonb)) WHERE id=$1`, [payment.tenant_id, payment.tier, periodEnd, JSON.stringify(payment.plan_snapshot?.limits || {})]);
    }
    await audit(client, req, `MANUAL_PAYMENT_${decision}`, payment.id, { invoiceId: payment.invoice_id, reason: decision === "REJECTED" ? reason : undefined });
    await notify(client, `manual_${decision.toLowerCase()}:${payment.id}`, payment.tenant_id, null, decision === "APPROVED" ? "Pembayaran disetujui" : "Pembayaran ditolak", decision === "APPROVED" ? `Invoice ${payment.invoice_id} telah lunas.` : `Pengajuan invoice ${payment.invoice_id} ditolak: ${reason}`, payment.id);
    return { requestId: payment.id, invoiceId: payment.invoice_id, status: decision };
  });
  if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
  res.json({ success: true, ...result });
}

export const approveManualPayment = (req: Request, res: Response) => reviewManualPayment(req, res, "APPROVED");
export const rejectManualPayment = (req: Request, res: Response) => reviewManualPayment(req, res, "REJECTED");
