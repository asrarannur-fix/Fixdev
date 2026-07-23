import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Request, Response } from "express";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

const uploadRoot = path.resolve(process.env.FILE_UPLOAD_DIR || "uploads");

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

function localUploadPath(objectPath: string) {
  const resolved = path.resolve(uploadRoot, objectPath);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) throw new Error("Invalid upload path.");
  return resolved;
}

async function ensureUploadTarget(objectPath: string) {
  await fs.mkdir(path.dirname(localUploadPath(objectPath)), { recursive: true });
}

function matchesImageSignature(buffer: Buffer, contentType: string) {
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (contentType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return false;
}

function matchesPdfSignature(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
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
      const image = await fs.readFile(localUploadPath(config.qrisObjectPath));
      qrisImageUrl = `data:${config.qrisObjectPath.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${image.toString("base64")}`;
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
      qrisObjectPath: isSuperAdmin ? config.qrisObjectPath : undefined,
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
    await ensureUploadTarget(objectPath);
    await dbTransaction(async (client) => platformAudit(client, req, "MANUAL_PAYMENT_QRIS_UPLOAD_CREATED", "manual_payment_qris", objectPath, null, { objectPath, fileName }));
    res.json({ objectPath, signedUploadUrl: `/api/billing/manual-payment-config/qris-upload/${path.basename(objectPath)}`, expiresIn: 60 });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not create QRIS upload URL");
    res.status(503).json({ error: "Penyimpanan gambar QRIS belum tersedia." });
  }
}

export async function uploadManualQris(req: Request, res: Response) {
  const fileName = path.basename(req.params.fileName || "");
  if (!/^qris-[0-9a-f-]+\.(jpg|png)$/.test(fileName) || !Buffer.isBuffer(req.body) || req.body.length < 1 || req.body.length > MAX_QRIS_BYTES) {
    return res.status(422).json({ error: "File QRIS tidak valid." });
  }
  const contentType = String(req.headers["content-type"] || "").split(";")[0];
  if (!ALLOWED_QRIS_TYPES.has(contentType) || !matchesImageSignature(req.body, contentType)) return res.status(422).json({ error: "Isi file QRIS tidak sesuai format JPG/PNG." });
  try {
    const objectPath = `platform/manual-payment/${fileName}`;
    await ensureUploadTarget(objectPath);
    await fs.writeFile(localUploadPath(objectPath), req.body);
    return res.status(204).end();
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not upload QRIS file");
    return res.status(503).json({ error: "Penyimpanan gambar QRIS belum tersedia." });
  }
}

export async function updateManualPaymentConfig(req: Request, res: Response) {
  const body = req.body || {};
  if (typeof body.bankTransferEnabled !== "boolean" || typeof body.manualQrisEnabled !== "boolean") return res.status(422).json({ error: "Flag metode pembayaran harus boolean." });
  const config: ManualPaymentConfig = {
    bankTransferEnabled: body.bankTransferEnabled,
    manualQrisEnabled: body.manualQrisEnabled,
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
  if (config.manualQrisEnabled && !/^platform\/manual-payment\/qris-[0-9a-f-]+\.(jpg|png)$/.test(config.qrisObjectPath)) {
    return res.status(422).json({ error: "Upload gambar QRIS terlebih dahulu." });
  }
  try {
    if (config.qrisObjectPath) {
      const stat = await fs.stat(localUploadPath(config.qrisObjectPath));
      if (!stat.isFile()) return res.status(422).json({ error: "File QRIS tidak tersedia." });
    }
    await dbTransaction(async (client) => {
      const before = await client.query(`SELECT value FROM app_settings WHERE key=$1`, [MANUAL_CONFIG_KEY]);
      await client.query(`INSERT INTO app_settings(key,value,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$2::jsonb,updated_at=now()`, [MANUAL_CONFIG_KEY, JSON.stringify(config)]);
      await platformAudit(client, req, "MANUAL_PAYMENT_CONFIG_UPDATED", "manual_payment_config", MANUAL_CONFIG_KEY, before.rows[0]?.value || null, config);
    });
    res.json({ success: true, config: { ...config, qrisObjectPath: undefined } });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not save manual payment config");
    res.status(500).json({ error: "Konfigurasi pembayaran manual gagal disimpan." });
  }
}

async function platformAudit(client: any, req: Request, action: string, resourceType: string, resourceId: string, beforeState: unknown, afterState: unknown) {
  if (req.authActor?.role !== "SUPER_ADMIN") return;
  await client.query(`INSERT INTO superadmin_audit_events(actor_user_id,actor_role,effective_tenant_id,action,resource_type,resource_id,outcome,client_ip,before_state,after_state,metadata) VALUES($1,$2,NULL,$3,$4,$5,'SUCCESS',$6,$7::jsonb,$8::jsonb,'{}'::jsonb)`, [req.authActor.userId, req.authActor.role, action, resourceType, resourceId, req.ip, JSON.stringify(beforeState ?? null), JSON.stringify(afterState ?? null)]);
}

async function audit(client: any, req: Request, action: string, resourceId: string, tenantId: string, metadata: Record<string, unknown> = {}) {
  await client.query(
    `INSERT INTO billing_audit_events
       (actor_user_id, actor_role, effective_tenant_id, action, resource_type, resource_id, outcome, metadata)
     VALUES ($1, $2, $3, $4, 'manual_payment', $5, 'SUCCESS', $6::jsonb)`,
    [req.authActor?.userId, req.authActor?.role, tenantId, action, resourceId, JSON.stringify(metadata)],
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

  const invoice = await dbQuery(`SELECT id, tenant_id, amount, status FROM saas_invoices WHERE id = $1 AND tenant_id = $2`, [invoiceId, req.tenantId]);
  if (!invoice.rows[0]) return res.status(404).json({ error: "Invoice tidak ditemukan." });
  if (invoice.rows[0].status === "PAID") return res.status(409).json({ error: "Invoice sudah lunas." });

  const uploadId = randomUUID();
  const objectPath = `tenant/${req.tenantId}/invoice/${invoiceId}/${uploadId}.${extensionFor(contentType)}`;

  try {
    await ensureUploadTarget(objectPath);

    if (req.body && (req.body as any).fileBuffer !== undefined) {
      const fileBuffer = (req.body as any).fileBuffer;
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length < 1 || fileBuffer.length > MAX_PROOF_BYTES || fileBuffer.length !== sizeBytes) {
        return res.status(422).json({ error: "Isi bukti pembayaran tidak valid." });
      }
      if ((contentType === "application/pdf" && !matchesPdfSignature(fileBuffer)) || (contentType !== "application/pdf" && !matchesImageSignature(fileBuffer, contentType))) {
        return res.status(422).json({ error: "Isi bukti pembayaran tidak sesuai format." });
      }
      await fs.writeFile(localUploadPath(objectPath), fileBuffer);
    }

    return res.json({ uploadId, objectPath, signedUploadUrl: `/api/billing/invoices/${invoiceId}/manual-payments/uploads/${uploadId}.${extensionFor(contentType)}`, fileName, contentType, sizeBytes });
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not save billing proof file locally");
    return res.status(503).json({ error: "Penyimpanan bukti pembayaran belum tersedia." });
  }
}

export async function uploadManualProof(req: Request, res: Response) {
  const { invoiceId, fileName } = req.params;
  const contentType = String(req.headers["content-type"] || "").split(";")[0];
  if (!/^[0-9a-f-]+\.(jpg|png|pdf)$/.test(fileName || "") || !ALLOWED_PROOF_TYPES.has(contentType) || !Buffer.isBuffer(req.body) || req.body.length < 1 || req.body.length > MAX_PROOF_BYTES) {
    return res.status(422).json({ error: "Bukti pembayaran tidak valid." });
  }
  if ((contentType === "application/pdf" && !matchesPdfSignature(req.body)) || (contentType !== "application/pdf" && !matchesImageSignature(req.body, contentType))) {
    return res.status(422).json({ error: "Isi bukti pembayaran tidak sesuai format." });
  }
  const invoice = await dbQuery(`SELECT id FROM saas_invoices WHERE id=$1 AND tenant_id=$2`, [invoiceId, req.tenantId]);
  if (!invoice.rows[0]) return res.status(404).json({ error: "Invoice tidak ditemukan." });
  try {
    const objectPath = `tenant/${req.tenantId}/invoice/${invoiceId}/${fileName}`;
    await ensureUploadTarget(objectPath);
    await fs.writeFile(localUploadPath(objectPath), req.body);
    return res.status(204).end();
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not upload billing proof");
    return res.status(503).json({ error: "Penyimpanan bukti pembayaran belum tersedia." });
  }
}

export async function submitManualPayment(req: Request, res: Response) {
  const { invoiceId } = req.params;
  const { method, paidAt, payerName, referenceNumber, notes, objectPath, originalName, contentType, sizeBytes, supersedesId } = req.body || {};
  const paidAtTime = new Date(paidAt).getTime();
  if (!["BANK_TRANSFER", "MANUAL_QRIS"].includes(method) || !Number.isFinite(paidAtTime) || paidAtTime > Date.now() + 5 * 60_000 || !payerName?.trim() || payerName.trim().length > 120 || !referenceNumber?.trim() || referenceNumber.trim().length > 120 || String(notes || "").length > 2000 || String(originalName || "").length > 255) {
    return res.status(422).json({ error: "Data pembayaran manual tidak valid." });
  }
  if (!ALLOWED_PROOF_TYPES.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_PROOF_BYTES) {
    return res.status(422).json({ error: "Metadata bukti pembayaran tidak valid." });
  }
  const manualConfig = await readManualConfig();
  if ((method === "BANK_TRANSFER" && !manualConfig.bankTransferEnabled) || (method === "MANUAL_QRIS" && !manualConfig.manualQrisEnabled)) {
    return res.status(409).json({ error: "Metode pembayaran manual sedang tidak tersedia." });
  }
  const expectedPrefix = `tenant/${req.tenantId}/invoice/${invoiceId}/`;
  if (typeof objectPath !== "string" || !objectPath.startsWith(expectedPrefix)) {
    return res.status(422).json({ error: "Lokasi bukti pembayaran tidak valid." });
  }

  const objectName = objectPath.slice(expectedPrefix.length);
  if (!new RegExp(`^[0-9a-f-]+\\.${extensionFor(contentType)}$`).test(objectName)) {
    return res.status(422).json({ error: "Lokasi bukti pembayaran tidak valid." });
  }

  try {
    const proofPath = localUploadPath(objectPath);
    const proofStat = await fs.stat(proofPath);
    if (proofStat.size !== sizeBytes || proofStat.size < 1 || proofStat.size > MAX_PROOF_BYTES) {
      return res.status(422).json({ error: "Ukuran bukti pembayaran tidak sesuai." });
    }
    const proofBuffer = await fs.readFile(proofPath);
    if (contentType !== "application/pdf" && !matchesImageSignature(proofBuffer, contentType)) {
      return res.status(422).json({ error: "Isi bukti pembayaran tidak sesuai format." });
    }
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
      await audit(client, req, "MANUAL_PAYMENT_SUBMITTED", inserted.rows[0].id, invoice.tenant_id, { method, invoiceId });
      return { request: inserted.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    const request = (result as any).request;
    try {
      await dbTransaction((client) => notify(client, `manual_submitted:${request.id}`, req.tenantId!, "SUPER_ADMIN", "Pembayaran menunggu verifikasi", `Bukti pembayaran invoice ${invoiceId} telah dikirim.`, request.id));
    } catch (err: any) {
      logger.error({ err: err.message, requestId: request.id }, "Manual payment notification failed");
    }
    return res.status(201).json({ success: true, ...(result as any) });
  } catch (err: any) {
    if (err.code === "ENOENT") return res.status(422).json({ error: "Bukti pembayaran belum diunggah." });
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
      logger.error({ err: err.message }, "Manual payment schema missing — migration required");
      return res.status(503).json({
        error: "Fitur pembayaran manual belum tersedia.",
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

  res.json({ fileUrl: `/api/billing/manual-payments/${req.params.id}/proof`, expiresIn: 60 });
}

export async function streamManualProof(req: Request, res: Response) {
  const params: unknown[] = [req.params.id];
  let scope = "";
  if (req.authActor?.role !== "SUPER_ADMIN") {
    params.push(req.tenantId);
    scope = ` AND tenant_id=$2`;
  }
  const result = await dbQuery(`SELECT proof_object_path,proof_content_type,proof_original_name FROM manual_payment_requests WHERE id=$1${scope}`, params);
  const proof = result.rows[0];
  if (!proof) return res.status(404).json({ error: "Bukti pembayaran tidak ditemukan." });
  try {
    res.type(proof.proof_content_type);
    res.setHeader("Content-Disposition", `inline; filename="${String(proof.proof_original_name || "proof").replace(/["\\]/g, "")}"`);
    return res.sendFile(localUploadPath(proof.proof_object_path));
  } catch (err: any) {
    logger.error({ err: err.message }, "Could not stream billing proof");
    return res.status(404).json({ error: "Bukti pembayaran tidak tersedia." });
  }
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
    if (payment.invoice_status !== "PENDING_VERIFICATION") return { code: 409, error: "Status invoice tidak lagi menunggu verifikasi." };

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
    await audit(client, req, `MANUAL_PAYMENT_${decision}`, payment.id, payment.tenant_id, { invoiceId: payment.invoice_id, reason: decision === "REJECTED" ? reason : undefined });
    await platformAudit(client, req, `MANUAL_PAYMENT_${decision}`, "manual_payment", payment.id, { status: payment.status, invoiceStatus: payment.invoice_status }, { status: decision });
    await notify(client, `manual_${decision.toLowerCase()}:${payment.id}`, payment.tenant_id, null, decision === "APPROVED" ? "Pembayaran disetujui" : "Pembayaran ditolak", decision === "APPROVED" ? `Invoice ${payment.invoice_id} telah lunas.` : `Pengajuan invoice ${payment.invoice_id} ditolak: ${reason}`, payment.id);
    return { requestId: payment.id, invoiceId: payment.invoice_id, status: decision };
  });
  if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
  res.json({ success: true, ...result });
}

export const approveManualPayment = (req: Request, res: Response) => reviewManualPayment(req, res, "APPROVED");
export const rejectManualPayment = (req: Request, res: Response) => reviewManualPayment(req, res, "REJECTED");
