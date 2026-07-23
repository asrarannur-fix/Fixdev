/**
 * Billing Controller — fully DB-backed.
 *
 * Changes from previous version:
 * - saasInvoices[]      → table: saas_invoices
 * - gatewayConfig       → table: app_settings (key: midtrans_config)
 * - billing-plans.json  → table: app_settings (key: billing_plans)
 *
 * Required migration (add to postgresql-schema.sql or run manually):
 *
 *   CREATE TABLE IF NOT EXISTS saas_invoices (
 *     id TEXT PRIMARY KEY,
 *     tenant_id TEXT NOT NULL,
 *     date DATE NOT NULL,
 *     due_date DATE NOT NULL,
 *     amount NUMERIC NOT NULL,
 *     tier TEXT NOT NULL,
 *     status TEXT NOT NULL DEFAULT 'UNPAID',
 *     qris_data TEXT,
 *     billing_cycle TEXT NOT NULL DEFAULT 'monthly',
 *     auto_renew BOOLEAN NOT NULL DEFAULT true,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   CREATE TABLE IF NOT EXISTS app_settings (
 *     key TEXT PRIMARY KEY,
 *     value JSONB NOT NULL,
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 */

import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

async function recordBillingAdminAudit(client: any, req: any, action: string, resourceType: string, resourceId: string | null, tenantId: string | null, beforeState: unknown, afterState: unknown, metadata: Record<string, unknown> = {}) {
  if (req.authActor?.role !== "SUPER_ADMIN") return;
  await client.query(`INSERT INTO superadmin_audit_events(actor_user_id,actor_role,effective_tenant_id,impersonation_session_id,action,resource_type,resource_id,outcome,client_ip,before_state,after_state,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,'SUCCESS',$8,$9::jsonb,$10::jsonb,$11::jsonb)`, [req.authActor.userId, req.authActor.role, tenantId, req.impersonationSession?.id || null, action, resourceType, resourceId, req.ip, JSON.stringify(beforeState ?? null), JSON.stringify(afterState ?? null), JSON.stringify(metadata)]);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaaSInvoiceServer {
  id: string;
  tenantId: string;
  date: string;
  dueDate: string;
  amount: number;
  tier: "BASIC" | "PRO" | "ENTERPRISE";
  status: "PAID" | "UNPAID" | "OVERDUE";
  qrisData: string;
  billingCycle: "monthly" | "yearly";
  autoRenew: boolean;
}

export interface MidtransConfig {
  merchantId: string;
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  isEnabled: boolean;
}

const DEFAULT_MIDTRANS: MidtransConfig = {
  merchantId: process.env.MIDTRANS_MERCHANT_ID || "",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  isEnabled: Boolean(process.env.MIDTRANS_SERVER_KEY),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await dbQuery(
      `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
      [key],
    );
    if (result.rows.length > 0) return result.rows[0].value as T;
  } catch (err: any) {
    logger.warn({ err: err.message, key }, "[billing] getSettingJson failed, using fallback");
  }
  return fallback;
}

async function upsertSettingJson(key: string, value: unknown): Promise<void> {
  await dbQuery(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

export function generateQrisPayload(merchantName: string, amount: number, invoiceId: string): string {
  const cleanMerchant = merchantName.slice(0, 15).replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
  return [
    "000201",
    "010212",
    `26570014ID.CO.QRIS.WWW01189360000200123456780209${invoiceId.slice(0, 9)}0303UME52040000`,
    "5303360",
    `54${amount.toString().length.toString().padStart(2, "0")}${amount}`,
    "5802ID",
    `59${cleanMerchant.length.toString().padStart(2, "0")}${cleanMerchant}`,
    "6007MAKASSAR",
    "610590123",
    `62250717${invoiceId.slice(0, 9)}`,
  ].join("");
}

export function buildMidtransSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return createHash("sha512").update(orderId + statusCode + grossAmount + serverKey).digest("hex");
}

function mapMidtransInvoiceStatus(transactionStatus: string, fraudStatus?: string): "PAID" | "UNPAID" | "OVERDUE" | null {
  if (transactionStatus === "settlement") return "PAID";
  if (transactionStatus === "capture") return fraudStatus === "accept" ? "PAID" : "UNPAID";
  if (["pending", "authorize"].includes(transactionStatus)) return "UNPAID";
  if (["deny", "cancel", "expire", "failure"].includes(transactionStatus)) return "OVERDUE";
  return null;
}

const DEFAULT_PLANS = [
  {
    tier: "BASIC",
    name: "Basic Growth Plan",
    priceMonthly: 99000,
    priceYearly: 990000,
    features: ["POS Kasir Utama", "Daftar Servis Dasar", "1 Gudang / Cabang", "Maks 3 Staff User", "Penyimpanan 500MB"],
    limits: { users: 3, branches: 1, storageMb: 500, features: ["POS", "SERVICE"] },
  },
  {
    tier: "PRO",
    name: "SaaS Professional ERP",
    priceMonthly: 250000,
    priceYearly: 2400000,
    features: ["Semua Fitur Basic", "Double-Entry Accounting & Ledger", "WhatsApp Broadcast", "Multi-Branch & Cabang (Maks 5)", "Maks 15 Staff User", "Penyimpanan 2GB"],
    limits: { users: 15, branches: 5, storageMb: 2048, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM"] },
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise Multi-Tenant ERP",
    priceMonthly: 1500000,
    priceYearly: 15000000,
    features: ["Semua Fitur Pro", "Integrasi Marketplace Sync", "Workflow Builder (Automasi)", "Proteksi Keamanan & Fraud Detector", "Hingga 20 Cabang", "Hingga 100 Staff User", "Penyimpanan 10GB", "Custom Domain & White-Label"],
    limits: { users: 100, branches: 20, storageMb: 10240, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM", "MARKETPLACE", "RENTAL", "SECURITY"] },
  },
];

// ---------------------------------------------------------------------------
// Gateway config handlers
// ---------------------------------------------------------------------------

function mergeWithEnv(db: MidtransConfig): MidtransConfig {
  return {
    merchantId: db.merchantId || process.env.MIDTRANS_MERCHANT_ID || "",
    serverKey: db.serverKey || process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: db.clientKey || process.env.MIDTRANS_CLIENT_KEY || "",
    isProduction:
      typeof db.isProduction === "boolean"
        ? db.isProduction
        : process.env.MIDTRANS_IS_PRODUCTION === "true",
    isEnabled:
      typeof db.isEnabled === "boolean"
        ? db.isEnabled
        : Boolean(process.env.MIDTRANS_SERVER_KEY),
  };
}

export const getGatewayConfig = async (req: any, res: any) => {
  const db = await getSettingJson<MidtransConfig>("midtrans_config", DEFAULT_MIDTRANS);
  const cfg = mergeWithEnv(db);
  const maskedServerKey = cfg.serverKey
    ? cfg.serverKey.slice(0, 7) + "****************" + cfg.serverKey.slice(-4)
    : "";
  res.json({
    merchantId: cfg.merchantId,
    serverKeyMasked: maskedServerKey,
    clientKey: cfg.clientKey,
    isProduction: cfg.isProduction,
    isEnabled: cfg.isEnabled,
  });
};

export const updateGatewayConfig = async (req: any, res: any) => {
  const { merchantId, serverKey, clientKey, isProduction, isEnabled } = req.body;
  if ((merchantId !== undefined && typeof merchantId !== "string") || (serverKey !== undefined && typeof serverKey !== "string") || (clientKey !== undefined && typeof clientKey !== "string") || (isProduction !== undefined && typeof isProduction !== "boolean") || (isEnabled !== undefined && typeof isEnabled !== "boolean")) return res.status(422).json({ error: "Konfigurasi gateway tidak valid." });
  const current = await getSettingJson<MidtransConfig>("midtrans_config", DEFAULT_MIDTRANS);
  const mergedCurrent = mergeWithEnv(current);

  const updated: MidtransConfig = {
    merchantId: merchantId !== undefined ? merchantId : current.merchantId,
    serverKey: typeof serverKey === "string" && serverKey && !serverKey.includes("*****") ? serverKey : current.serverKey,
    clientKey: clientKey !== undefined ? clientKey : current.clientKey,
    isProduction: isProduction !== undefined ? isProduction : current.isProduction,
    isEnabled: isEnabled !== undefined ? isEnabled : current.isEnabled,
  };
  const runtimeUpdated = mergeWithEnv(updated);

  try {
    await dbTransaction(async (client) => {
      await client.query(`INSERT INTO app_settings(key,value,updated_at) VALUES('midtrans_config',$1::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$1::jsonb,updated_at=now()`, [JSON.stringify(updated)]);
      await recordBillingAdminAudit(client, req, "BILLING_GATEWAY_CONFIG_UPDATED", "billing_gateway_config", "midtrans_config", null,
        { merchantId: mergedCurrent.merchantId, clientKey: mergedCurrent.clientKey, isProduction: mergedCurrent.isProduction, isEnabled: mergedCurrent.isEnabled, serverKeyConfigured: Boolean(mergedCurrent.serverKey) },
        { merchantId: updated.merchantId, clientKey: updated.clientKey, isProduction: updated.isProduction, isEnabled: updated.isEnabled, serverKeyConfigured: Boolean(updated.serverKey) });
    });
    logger.info("[billing] Midtrans config updated");
    res.json({
      success: true,
      message: "Konfigurasi Payment Gateway Midtrans berhasil diperbarui!",
      config: {
        merchantId: runtimeUpdated.merchantId,
        serverKeyMasked: runtimeUpdated.serverKey ? runtimeUpdated.serverKey.slice(0, 7) + "****************" + runtimeUpdated.serverKey.slice(-4) : "",
        clientKey: runtimeUpdated.clientKey,
        isProduction: runtimeUpdated.isProduction,
        isEnabled: runtimeUpdated.isEnabled,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] updateGatewayConfig failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

// ---------------------------------------------------------------------------
// Billing plans handlers
// ---------------------------------------------------------------------------

export const getBillingPlans = async (req: any, res: any) => {
  const plans = await getSettingJson<any[]>("billing_plans", DEFAULT_PLANS);
  res.json(Array.isArray(plans) && plans.length > 0 ? plans : DEFAULT_PLANS);
};

export const getPublicBillingPlans = async (_req: any, res: any) => {
  const storedPlans = await getSettingJson<any[]>("billing_plans", DEFAULT_PLANS);
  const plans = Array.isArray(storedPlans) && storedPlans.length > 0 ? storedPlans : DEFAULT_PLANS;
  res.json(plans.map(({ tier, name, priceMonthly, priceYearly, features }) => ({
    tier,
    name,
    priceMonthly,
    priceYearly,
    features: Array.isArray(features) ? features : [],
  })));
};

export const updateBillingPlans = async (req: any, res: any) => {
  const updatedPlans = req.body;
  if (!Array.isArray(updatedPlans) || updatedPlans.length === 0) {
    return res.status(400).json({ error: "Data plans harus berupa array non-kosong." });
  }
  const tiers = new Set<string>();
  for (const plan of updatedPlans) {
    if (!plan || !["BASIC", "PRO", "ENTERPRISE"].includes(plan.tier) || tiers.has(plan.tier) || typeof plan.name !== "string" || !plan.name.trim() || plan.name.length > 100 || !Number.isFinite(plan.priceMonthly) || plan.priceMonthly <= 0 || !Number.isFinite(plan.priceYearly) || plan.priceYearly <= 0 || !Array.isArray(plan.features) || plan.features.length > 100 || plan.features.some((feature: unknown) => typeof feature !== "string" || feature.length > 200) || !plan.limits || !Number.isInteger(plan.limits.users) || plan.limits.users < 1 || !Number.isInteger(plan.limits.branches) || plan.limits.branches < 1 || !Number.isInteger(plan.limits.storageMb) || plan.limits.storageMb < 1 || !Array.isArray(plan.limits.features) || plan.limits.features.length > 100 || plan.limits.features.some((feature: unknown) => typeof feature !== "string" || feature.length > 100)) {
      return res.status(422).json({ error: "Konfigurasi paket billing tidak valid." });
    }
    tiers.add(plan.tier);
  }
  if (!["BASIC", "PRO", "ENTERPRISE"].every((tier) => tiers.has(tier))) return res.status(422).json({ error: "Semua tier billing wajib tersedia." });
  try {
    await dbTransaction(async (client) => {
      const before = await client.query(`SELECT value FROM app_settings WHERE key='billing_plans'`);
      await client.query(`INSERT INTO app_settings(key,value,updated_at) VALUES('billing_plans',$1::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$1::jsonb,updated_at=now()`, [JSON.stringify(updatedPlans)]);
      await recordBillingAdminAudit(client, req, "BILLING_PLANS_UPDATED", "billing_plans", "billing_plans", null, before.rows[0]?.value || null, updatedPlans);
    });
    res.json({ success: true, message: "Paket langganan SaaS berhasil diperbarui!", plans: updatedPlans });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] updateBillingPlans failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

// ---------------------------------------------------------------------------
// Invoice handlers
// ---------------------------------------------------------------------------

export const getSubscription = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(400).json({ error: "tenantId parameter is required" });

  try {
    const result = await dbQuery(
      `SELECT id, tenant_id as "tenantId", date, due_date as "dueDate", amount, tier, status,
              qris_data as "qrisData", billing_cycle as "billingCycle", auto_renew as "autoRenew"
       FROM saas_invoices WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    res.json({ tenantId, invoices: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const createInvoice = async (req: any, res: any) => {
  const { tier, billingCycle, paymentChannel = "MANUAL" } = req.body;
  const tenantId = req.tenantId;
  if (!tenantId || !tier || !["monthly", "yearly"].includes(billingCycle) || !["MANUAL", "MIDTRANS"].includes(paymentChannel)) {
    return res.status(400).json({ error: "Missing or invalid tenant, tier, or billingCycle" });
  }

  const idempotencyKey = String(req.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey || idempotencyKey.length > 200) return res.status(422).json({ error: "Idempotency-Key wajib diisi." });
  const requestHash = createHash("sha256").update(JSON.stringify({ tenantId, tier, billingCycle, paymentChannel })).digest("hex");
  try {
    const existing = await dbQuery(`SELECT request_hash,status,response FROM billing_invoice_requests WHERE tenant_id=$1 AND idempotency_key=$2`, [tenantId, idempotencyKey]);
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) return res.status(409).json({ error: "Idempotency-Key telah digunakan untuk request berbeda." });
      if (existing.rows[0].status === "COMPLETED" && existing.rows[0].response) return res.json(existing.rows[0].response);
      if (existing.rows[0].status === "PROCESSING") return res.status(409).json({ error: "Pembuatan invoice dengan key ini sedang diproses." });
      await dbQuery(`DELETE FROM billing_invoice_requests WHERE tenant_id=$1 AND idempotency_key=$2 AND status='FAILED'`, [tenantId, idempotencyKey]);
    }
    await dbQuery(`INSERT INTO billing_invoice_requests(tenant_id,idempotency_key,request_hash,created_by) VALUES($1,$2,$3,$4)`, [tenantId, idempotencyKey, requestHash, req.authActor?.userId]);
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Pembuatan invoice sedang diproses." });
    logger.error({ err: err.message }, "Could not reserve invoice idempotency key");
    return res.status(500).json({ error: "Pembuatan invoice gagal dimulai." });
  }

  const failInvoiceRequest = async () => {
    await dbQuery(`UPDATE billing_invoice_requests SET status='FAILED',updated_at=now() WHERE tenant_id=$1 AND idempotency_key=$2`, [tenantId, idempotencyKey]).catch(() => undefined);
  };
  const storedPlans = await getSettingJson<any[]>("billing_plans", DEFAULT_PLANS);
  const plans = Array.isArray(storedPlans) && storedPlans.length > 0 ? storedPlans : DEFAULT_PLANS;
  const planConfig = plans.find((p: any) => p.tier === tier);
  if (!planConfig) {
    await failInvoiceRequest();
    return res.status(400).json({ error: "Invalid subscription tier: " + tier });
  }

  const amount = billingCycle === "yearly" ? planConfig.priceYearly : planConfig.priceMonthly;
  const invoiceId = `saas-inv-${randomUUID()}`;
  const dateStr = new Date().toISOString().split("T")[0];
  const due = new Date();
  due.setDate(due.getDate() + 3);
  const dueDateStr = due.toISOString().split("T")[0];

  let qrisData = "";
  let isRealMidtrans = false;
  if (paymentChannel === "MANUAL") {
    const manualConfig = await getSettingJson<any>("manual_payment_config", { bankTransferEnabled: false, manualQrisEnabled: false });
    if (!manualConfig.bankTransferEnabled && !manualConfig.manualQrisEnabled) {
      await failInvoiceRequest();
      return res.status(409).json({ error: "Pembayaran manual belum dikonfigurasi." });
    }
  }

  const dbCfg = await getSettingJson<MidtransConfig>("midtrans_config", DEFAULT_MIDTRANS);
  const cfg = mergeWithEnv(dbCfg);
  if (paymentChannel === "MIDTRANS" && cfg.isEnabled && cfg.serverKey) {
    try {
      const midtransUrl = cfg.isProduction
        ? "https://api.midtrans.com/v2/charge"
        : "https://api.sandbox.midtrans.com/v2/charge";
      const authHeader = "Basic " + Buffer.from(cfg.serverKey + ":").toString("base64");

      const response = await fetch(midtransUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: { order_id: invoiceId, gross_amount: amount },
          qris: { acquirer: "gopay" },
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.qr_string) {
          qrisData = data.qr_string;
          isRealMidtrans = true;
          logger.info({ invoiceId }, "[billing] Real QRIS created via Midtrans");
        }
      } else {
        logger.warn({ status: response.status }, "[billing] Midtrans charge failed");
        await failInvoiceRequest();
        return res.status(502).json({ error: "Midtrans gagal membuat transaksi. Pilih pembayaran manual atau coba kembali." });
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, "[billing] Midtrans charge exception");
      await failInvoiceRequest();
      return res.status(502).json({ error: "Midtrans tidak tersedia. Pilih pembayaran manual atau coba kembali." });
    }
  } else if (paymentChannel === "MIDTRANS") {
    await failInvoiceRequest();
    return res.status(409).json({ error: "Midtrans belum diaktifkan. Pilih pembayaran manual." });
  }

  // Manual invoices deliberately have no generated/fake gateway QR payload.
  if (paymentChannel !== "MIDTRANS") {
    qrisData = "";
  }

  try {
    const responseBody = {
      success: true,
      invoice: { id: invoiceId, tenantId, date: dateStr, dueDate: dueDateStr, amount, tier, status: "UNPAID", qrisData, billingCycle, autoRenew: true },
      isRealGateway: isRealMidtrans,
      paymentChannel,
      message: isRealMidtrans
        ? "Invoice Midtrans dibuat. Status akan diperbarui melalui webhook terverifikasi."
        : "Invoice dibuat. Unggah bukti transfer bank atau QRIS manual untuk verifikasi.",
    };
    await dbTransaction(async (client) => {
      await client.query(
        `INSERT INTO saas_invoices
           (id, tenant_id, date, due_date, amount, tier, status, qris_data, billing_cycle, auto_renew, plan_snapshot, gateway_provider, gateway_order_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', $7, $8, true, $9::jsonb, $10, $11)`,
        [invoiceId, tenantId, dateStr, dueDateStr, amount, tier, qrisData, billingCycle, JSON.stringify(planConfig), isRealMidtrans ? "MIDTRANS" : null, isRealMidtrans ? invoiceId : null],
      );
      await client.query(`UPDATE billing_invoice_requests SET status='COMPLETED',invoice_id=$3,response=$4::jsonb,updated_at=now() WHERE tenant_id=$1 AND idempotency_key=$2`, [tenantId, idempotencyKey, invoiceId, JSON.stringify(responseBody)]);
    });
    res.json(responseBody);
  } catch (err: any) {
    await failInvoiceRequest();
    logger.error({ err: err.message }, "[billing] createInvoice DB insert failed");
    res.status(500).json({ error: "Invoice gagal dibuat." });
  }
};

export const payInvoice = async (req: any, res: any) => {
  const { invoiceId } = req.body;
  const tenantId = req.tenantId;
  if (!invoiceId || !tenantId) return res.status(400).json({ error: "invoiceId is required" });

  try {
    const result = await dbQuery(
      `UPDATE saas_invoices SET status = 'PAID' WHERE id = $1 AND tenant_id = $2 AND status != 'PAID'
       RETURNING id, tenant_id as "tenantId", date, due_date as "dueDate", amount, tier, status, billing_cycle as "billingCycle"`,
      [invoiceId, tenantId],
    );

    if (result.rowCount === 0) {
      // Check if already paid
      const check = await dbQuery(`SELECT status FROM saas_invoices WHERE id = $1 AND tenant_id = $2`, [invoiceId, tenantId]);
      if (check.rows[0]?.status === "PAID") {
        return res.json({ success: true, message: "Invoice is already paid." });
      }
      return res.status(404).json({ error: "Invoice not found or unauthorized" });
    }

    const invoice = result.rows[0];
    const now = new Date();
    if (invoice.billingCycle === "yearly") now.setFullYear(now.getFullYear() + 1);
    else now.setMonth(now.getMonth() + 1);

    res.json({ success: true, message: "Pembayaran QRIS berhasil dikonfirmasi!", invoice, subscriptionEndsAt: now.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const handleMidtransWebhook = async (req: any, res: any) => {
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = req.body || {};
  if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
    return res.status(400).json({ error: "Missing required Midtrans notification fields" });
  }

  const dbCfg = await getSettingJson<MidtransConfig>("midtrans_config", DEFAULT_MIDTRANS);
  const cfg = mergeWithEnv(dbCfg);
  if (!cfg.serverKey) return res.status(503).json({ error: "Midtrans server key is not configured" });

  const expectedSignature = buildMidtransSignature(String(order_id), String(status_code), String(gross_amount), cfg.serverKey);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(String(signature_key), "utf8");
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    logger.warn({ orderId: order_id }, "[billing] Invalid Midtrans webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const nextStatus = mapMidtransInvoiceStatus(String(transaction_status), fraud_status ? String(fraud_status) : undefined);
  if (!nextStatus) return res.status(400).json({ error: "Unsupported Midtrans transaction_status" });

  try {
    const eventKey = String(req.body.transaction_id || `${order_id}:${transaction_status}:${status_code}`);
    const payloadHash = createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
    const invoice = await dbTransaction(async (client) => {
      const priorEvent = await client.query(`SELECT payload_hash,processing_status,result FROM billing_gateway_events WHERE provider='MIDTRANS' AND event_key=$1 FOR UPDATE`, [eventKey]);
      if (priorEvent.rows[0]) {
        if (priorEvent.rows[0].payload_hash !== payloadHash) return { webhookConflict: true };
        if (priorEvent.rows[0].processing_status === "COMPLETED") return { webhookReplay: priorEvent.rows[0].result };
      } else {
        await client.query(`INSERT INTO billing_gateway_events(provider,event_key,order_id,payload_hash,transaction_status) VALUES('MIDTRANS',$1,$2,$3,$4)`, [eventKey, order_id, payloadHash, transaction_status]);
      }
      const current = await client.query(
        `SELECT id, tenant_id, tier, status, amount, billing_cycle, plan_snapshot FROM saas_invoices WHERE id = $1 AND gateway_provider='MIDTRANS' AND gateway_order_id=$1 FOR UPDATE`,
        [order_id],
      );
      if (current.rowCount === 0) return null;

      const row = current.rows[0];
      if (Number(row.amount) !== Number(gross_amount)) {
        throw new Error("Midtrans amount does not match invoice amount");
      }
      if (row.status === "PENDING_VERIFICATION") {
        const result = { invoiceId: row.id, status: row.status };
        await client.query(`UPDATE billing_gateway_events SET processing_status='REJECTED',result=$2::jsonb,processed_at=now() WHERE provider='MIDTRANS' AND event_key=$1`, [eventKey, JSON.stringify(result)]);
        return result;
      }
      if (row.status === "PAID") {
        const result = { invoiceId: row.id, status: row.status };
        await client.query(`UPDATE billing_gateway_events SET processing_status='COMPLETED',result=$2::jsonb,processed_at=now() WHERE provider='MIDTRANS' AND event_key=$1`, [eventKey, JSON.stringify(result)]);
        return result;
      }

      const updated = await client.query(
        `UPDATE saas_invoices SET status = $2, paid_at = CASE WHEN $2 = 'PAID' THEN now() ELSE paid_at END, version = version + 1 WHERE id = $1
         RETURNING id, tenant_id, tier, status`,
        [order_id, nextStatus],
      );

      if (nextStatus === "PAID") {
        const periodEnd = new Date();
        if (row.billing_cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);
        await client.query(
          `INSERT INTO billing_transactions
             (invoice_id, tenant_id, channel, method, provider_transaction_id, amount, status, provider_payload)
           VALUES ($1,$2,'MIDTRANS','QRIS',$3,$4,'SETTLEMENT',$5::jsonb)
           ON CONFLICT (channel, provider_transaction_id) DO NOTHING`,
          [row.id, row.tenant_id, String(req.body.transaction_id || order_id), row.amount,
            JSON.stringify({ transaction_status, fraud_status, status_code })],
        );
        await client.query(`UPDATE saas_invoices SET period_start=COALESCE(period_start,now()),period_end=COALESCE(period_end,$2) WHERE id=$1`, [row.id, periodEnd]);
        await client.query(
          `UPDATE tenants SET status = 'ACTIVE', tier = $2, trial_ends_at = $3,
             settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('limits', COALESCE($4::jsonb, '{}'::jsonb))
           WHERE id = $1`,
          [row.tenant_id, row.tier, periodEnd, JSON.stringify(row.plan_snapshot?.limits || {})],
        );
      }

      const result = { invoiceId: updated.rows[0].id, status: updated.rows[0].status };
      await client.query(`UPDATE billing_gateway_events SET processing_status='COMPLETED',result=$2::jsonb,processed_at=now() WHERE provider='MIDTRANS' AND event_key=$1`, [eventKey, JSON.stringify(result)]);
      return result;
    });

    if ((invoice as any)?.webhookConflict) return res.status(409).json({ error: "Webhook event key digunakan dengan payload berbeda." });
    if ((invoice as any)?.webhookReplay) return res.json({ success: true, ...(invoice as any).webhookReplay });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ success: true, ...(invoice as any) });
  } catch (err: any) {
    logger.error({ err: err.message, orderId: order_id }, "[billing] Midtrans webhook failed");
    res.status(500).json({ error: "Webhook pembayaran sedang diproses ulang." });
  }
};

export const toggleRenew = async (req: any, res: any) => {
  const { invoiceId, autoRenew } = req.body;
  if (!invoiceId || typeof autoRenew !== "boolean") return res.status(422).json({ error: "invoiceId dan autoRenew boolean wajib diisi." });
  try {
    const result = await dbQuery(
      `UPDATE saas_invoices SET auto_renew = $2, version = version + 1
       WHERE id = $1 AND tenant_id = $3
       RETURNING id, auto_renew as "autoRenew"`,
      [invoiceId, autoRenew, req.tenantId],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Invoice not found" });
    res.json({ success: true, invoice: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const simulateTrialExpiryCron = async (_req: any, res: any) => {
  const logs: string[] = [];

  try {
    const expired = await dbQuery(
      `UPDATE tenants
       SET status = 'EXPIRED'
       WHERE status = 'TRIAL'
         AND trial_ends_at < now()
       RETURNING id, name, trial_ends_at`,
    );

    for (const row of expired.rows) {
      logs.push(`Tenant [${row.id}] ${row.name}: TRIAL expired (berakhir ${row.trial_ends_at}) → EXPIRED.`);
      logger.info({ tenantId: row.id, trialEndsAt: row.trial_ends_at }, "[trial-expiry] Tenant expired");
    }

    res.json({
      success: true,
      processedAt: new Date().toISOString(),
      expired: expired.rowCount || 0,
      logs: logs.length > 0 ? logs : ["Tidak ada tenant TRIAL yang perlu di-expire hari ini."],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] simulateTrialExpiryCron failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const simulateRecurringCron = async (req: any, res: any) => {
  const logs: string[] = [];

  try {
    const expiring = await dbQuery(
      `SELECT i.* FROM saas_invoices i WHERE i.status='PAID' AND i.auto_renew=true AND i.period_end<=now() AND NOT EXISTS (SELECT 1 FROM saas_invoices r WHERE r.renewed_from_invoice_id=i.id AND r.status IN ('UNPAID','PENDING_VERIFICATION','PAID'))`,
    );

    for (const invoice of expiring.rows) {
      logs.push(`Tenant [${invoice.tenant_id}]: Langganan ${invoice.tier} kedaluwarsa. Memicu auto-renewal.`);
      const nextDate = new Date().toISOString().split("T")[0];
      const nextId = `saas-inv-auto-${invoice.id}-${nextDate}`;
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 3);

      const inserted = await dbQuery(
        `INSERT INTO saas_invoices
           (id, tenant_id, date, due_date, amount, tier, status, qris_data, billing_cycle, auto_renew, plan_snapshot, renewed_from_invoice_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', NULL, $7, true, $8::jsonb, $9)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [nextId, invoice.tenant_id, nextDate, nextDue.toISOString().split("T")[0], invoice.amount, invoice.tier, invoice.billing_cycle, JSON.stringify(invoice.plan_snapshot || {}), invoice.id],
      );
      if (inserted.rowCount) logs.push(`Renewal invoice ${nextId} dibuat dengan status BELUM LUNAS.`);
      else logs.push(`Renewal invoice ${nextId} sudah pernah dibuat; dilewati.`);
    }

    res.json({
      success: true,
      processedAt: new Date().toISOString(),
      logs: logs.length > 0 ? logs : ["Tidak ada langganan yang perlu diperbarui hari ini."],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] simulateRecurringCron failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

async function getTenantOwner(tenantId: string) {
  const rows = await dbQuery(
    `SELECT email, name, COALESCE(t.settings #>> '{notificationSettings,whatsappNumber}', t.settings #>> '{waConfig,phoneNumber}') AS phone FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE u.tenant_id = $1 AND u.role = 'OWNER' LIMIT 1`,
    [tenantId],
  );
  return rows.rows[0] || null;
}

async function queueNotification(params: {
  tenantId: string;
  invoiceId?: string;
  type: "due_reminder" | "overdue_alert" | "payment_confirmed" | "auto_renew_failed" | "manual_payment_instruction";
  channel: "email" | "whatsapp" | "telegram";
  recipient: string;
  payload: Record<string, any>;
  eventKey: string;
}) {
  await dbQuery(
    `INSERT INTO billing_notifications (tenant_id, invoice_id, type, channel, recipient, payload, status, event_key)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     ON CONFLICT (event_key, channel, recipient) WHERE event_key IS NOT NULL DO NOTHING`,
    [params.tenantId, params.invoiceId || null, params.type, params.channel, params.recipient, JSON.stringify(params.payload), params.eventKey],
  );
}

export const notifyDueReminders = async (req: any, res: any) => {
  try {
    const rows = await dbQuery(
      `SELECT i.*, t.name as tenant_name
       FROM saas_invoices i
       JOIN tenants t ON t.id = i.tenant_id
       WHERE i.status = 'UNPAID'
       AND i.due_date <= CURRENT_DATE + INTERVAL '3 days'
       AND i.due_date >= CURRENT_DATE`,
    );

    let sent = 0;
    for (const inv of rows.rows) {
      const owner = await getTenantOwner(inv.tenant_id);
      if (!owner) continue;

      const payload = {
        invoiceId: inv.id,
        tenantName: inv.tenant_name,
        dueDate: inv.due_date,
        amount: inv.amount,
        tier: inv.tier,
        message: `Pengingat: Invoice ${inv.id} untuk paket ${inv.tier} sebesar Rp ${Number(inv.amount).toLocaleString()} akan jatuh tempo pada ${inv.due_date}.`,
      };

      await queueNotification({
        tenantId: inv.tenant_id,
        invoiceId: inv.id,
        type: "due_reminder",
        channel: "email",
       recipient: owner.email,
       payload,
       eventKey: `payment_confirmed:${inv.id}`,
     });

      sent++;
    }

    res.json({ success: true, sent, message: `${sent} pengingat jatuh tempo dibuat.` });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] notifyDueReminders failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const notifyOverdueAlerts = async (req: any, res: any) => {
  try {
    const rows = await dbQuery(
      `SELECT i.*, t.name as tenant_name
       FROM saas_invoices i
       JOIN tenants t ON t.id = i.tenant_id
       WHERE i.status = 'UNPAID'
       AND i.due_date < CURRENT_DATE`,
    );

    let sent = 0;
    for (const inv of rows.rows) {
      const owner = await getTenantOwner(inv.tenant_id);
      if (!owner) continue;

      const payload = {
        invoiceId: inv.id,
        tenantName: inv.tenant_name,
        dueDate: inv.due_date,
        amount: inv.amount,
        tier: inv.tier,
        daysOverdue: Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)),
        message: `Peringatan: Invoice ${inv.id} untuk paket ${inv.tier} sebesar Rp ${Number(inv.amount).toLocaleString()} sudah lewat jatuh tempo (${inv.due_date}). Segera lakukan pembayaran.`,
      };

      await queueNotification({
        tenantId: inv.tenant_id,
        invoiceId: inv.id,
        type: "overdue_alert",
        channel: owner.phone ? "whatsapp" : "email",
        recipient: owner.phone || owner.email,
        payload,
        eventKey: `overdue_alert:${inv.id}:${inv.due_date}`,
      });

      sent++;
    }

    res.json({ success: true, sent, message: `${sent} peringatan keterlambatan dibuat.` });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] notifyOverdueAlerts failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};

export const sendPaymentConfirmation = async (req: any, res: any) => {
  const tenantId = req.tenantId;
  const { invoiceId } = req.body;
  if (!invoiceId || !tenantId) {
    return res.status(400).json({ error: "invoiceId is required" });
  }

  try {
    const invoiceRows = await dbQuery(
      `SELECT i.*, t.name as tenant_name FROM saas_invoices i
       JOIN tenants t ON t.id = i.tenant_id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [invoiceId, tenantId],
    );
    if (invoiceRows.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoiceRows.rows[0];
    if (inv.status !== "PAID") return res.status(409).json({ error: "Invoice belum lunas." });
    const owner = await getTenantOwner(tenantId);
    if (!owner) {
      return res.json({ success: true, message: "Payment confirmed. No owner email found for notification." });
    }

    const payload = {
      invoiceId: inv.id,
      tenantName: inv.tenant_name,
      amount: inv.amount,
      tier: inv.tier,
      status: inv.status,
      message: `Pembayaran untuk invoice ${inv.id} (paket ${inv.tier}) sebesar Rp ${Number(inv.amount).toLocaleString()} telah dikonfirmasi. Terima kasih!`,
    };

    await queueNotification({
      tenantId,
      invoiceId: inv.id,
      type: "payment_confirmed",
      channel: "email",
      recipient: owner.email,
         payload,
         eventKey: `due_reminder:${inv.id}:${inv.due_date}`,
       });

    res.json({ success: true, message: "Notifikasi pembayaran berhasil dikirim." });
  } catch (err: any) {
    logger.error({ err: err.message }, "[billing] sendPaymentConfirmation failed");
    res.status(500).json({ error: "Operasi billing gagal diproses." });
  }
};
