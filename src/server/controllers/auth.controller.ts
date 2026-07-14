import { Request, Response } from "express";
import { getPool } from "../../lib/db.js";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger.js";
import nodemailer from "nodemailer";

async function withDb<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); }
}

const getAdminSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * Create email transporter with nodemailer
 */
function getEmailTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || "noreply@fixdev.my.id";

  if (!host || !port || !user || !pass) {
    logger.warn("[email] Email not configured, using dry-run mode");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send email notification
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getEmailTransporter();
  
  if (!transporter) {
    // Dry-run mode when email not configured
    logger.info({ to, subject }, "[email] Dry-run - Email would be sent");
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@fixdev.my.id",
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, "[email] Email sent successfully");
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, to, subject }, "[email] Failed to send email");
    return false;
  }
}

export async function authProfileHandler(req: Request, res: Response) {
  try {
    const rows = (await withDb(async (c) => {
      const r = await c.query("SELECT id, name, email, role, tenant_id, permissions, mfa_enabled FROM users WHERE auth_id = $1 LIMIT 1", [(req as any).supabaseUser.id]);
      return r.rows;
    })) as any[];
    if (!rows.length) return res.status(404).json({ error: "User profile not found. Contact admin to create a tenant account." });
    const user = rows[0];
    const branchRows = (await withDb(async (c) => {
      const r = await c.query("SELECT branch_id FROM user_branches WHERE user_id = $1", [user.id]);
      return r.rows;
    })) as any[];
    const branchIds = branchRows.map((row: any) => row.branch_id);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id, branchIds, permissions: user.permissions || [], mfaEnabled: user.mfa_enabled || false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminResetPasswordHandler(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 8) {
    return res.status(422).json({ success: false, message: "email and password (min 8 chars) are required." });
  }
  try {
    const admin = getAdminSupabase();
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const authUsers = (listed.users || []) as Array<{ id: string; email?: string | null }>;
    const user = authUsers.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found in Supabase Auth." });
    }
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: String(password) });
    if (error) throw error;
    return res.json({ success: true, message: "Password updated.", userId: user.id, email: user.email });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to reset password." });
  }
}

export async function onboardingRegisterHandler(req: Request, res: Response) {
  const { shopName, subdomain, ownerName, ownerEmail, ownerPassword, themeColor, tier } = req.body || {};
  if (!shopName || !ownerName || !ownerEmail || !ownerPassword) {
    return res.status(422).json({ success: false, message: "shopName, ownerName, ownerEmail, ownerPassword are required." });
  }
  if (String(ownerPassword).length < 6) {
    return res.status(422).json({ success: false, message: "Password must be at least 6 characters." });
  }
  const admin = getAdminSupabase();
  const client = await getPool().connect();
  try {
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: String(ownerEmail).toLowerCase().trim(),
      password: String(ownerPassword),
      email_confirm: true,
    });
    if (authErr) throw new Error(`Auth creation failed: ${authErr.message}`);
    const authId = authData.user.id;
    const tenantId = (await import("crypto")).randomUUID();
    const branchId = (await import("crypto")).randomUUID();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO tenants (id, name, subdomain, status, tier, trial_ends_at, settings, branding, created_at)
       VALUES ($1, $2, $3, 'TRIAL', $4, now() + interval '30 days', $5, $6, now())`,
      [tenantId, shopName, subdomain || shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), tier || "BASIC",
       JSON.stringify({ baseCurrency: "IDR", taxSettings: { taxRate: 11, taxEnabled: true, taxInclusive: false }, authSettings: { requireMfa: false, passwordPolicy: "medium" } }),
       JSON.stringify({ primaryColor: themeColor || "#4f46e5", accentColor: "#6366f1", portalHelpTitle: `Pusat Bantuan ${shopName}` })]
    );
    await client.query(
      `INSERT INTO branches (id, tenant_id, name, address, phone, is_active, created_at)
       VALUES ($1, $2, $3, $4, '0812345678', true, now())`,
      [branchId, tenantId, `Cabang Utama ${shopName}`, `Alamat Utama ${shopName}`]
    );
    await client.query(
      `INSERT INTO warehouses (id, tenant_id, branch_id, name, location, created_at)
       VALUES ($1, $2, $3, 'Gudang Utama', 'Lt. 1', now())`,
      [(await import("crypto")).randomUUID(), tenantId, branchId]
    );
    const coaDefaults = [
      ["10100", "Kas Utama", "ASSET", 0], ["10200", "Bank Utama", "ASSET", 0],
      ["10300", "Piutang Pelanggan", "ASSET", 0], ["10500", "Persediaan Barang", "ASSET", 0],
      ["40100", "Pendapatan Jasa Servis", "REVENUE", 0], ["40200", "Pendapatan Penjualan Sparepart", "REVENUE", 0],
      ["50100", "HPP Sparepart", "EXPENSE", 0], ["60100", "Beban Gaji Staf", "EXPENSE", 0],
    ];
    for (const [code, name, type, balance] of coaDefaults) {
      await client.query(
        `INSERT INTO coa_accounts (id, tenant_id, code, name, type, balance) VALUES ($1,$2,$3,$4,$5,$6)`,
        [(await import("crypto")).randomUUID(), tenantId, code, name, type, balance]
      );
    }
    const userId = (await import("crypto")).randomUUID();
    await client.query(
      `INSERT INTO users (id, tenant_id, email, name, role, permissions, mfa_enabled, auth_id, created_at)
       VALUES ($1, $2, $3, $4, 'OWNER', ARRAY[$5]::text[], false, $6, now())`,
      [userId, tenantId, String(ownerEmail).toLowerCase().trim(), ownerName, "*", authId]
    );
    await client.query(`INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`, [userId, branchId]);
    await client.query(
      `INSERT INTO api_tokens (id, token, name, abilities, tenant_id, branch_id, created_at)
       VALUES ($1, $2, 'Owner Sync Key', $3::jsonb, $4, $5, now())`,
      [(await import("crypto")).randomUUID(), `token_${(await import("crypto")).randomUUID()}`, '["*"]', tenantId, branchId]
    );
    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      message: `Tenant "${shopName}" registered successfully.`,
      tenant: { id: tenantId, name: shopName, status: "TRIAL" },
      owner: { id: userId, email: ownerEmail, name: ownerName, role: "OWNER" },
      branch: { id: branchId, name: `Cabang Utama ${shopName}` },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

/**
 * Upgrade Trial Tenant to Paid Plan
 * Auto-converts TRIAL → ACTIVE status after payment
 */
export async function upgradeTrialHandler(req: Request, res: Response) {
  const { tenantId, tier, billingCycle } = req.body || {};
  
  if (!tenantId || !tier || !billingCycle) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required: tenantId, tier, billingCycle" 
    });
  }

  const client = await getPool().connect();
  try {
    // 1. Validate tenant exists and is in TRIAL status
    const tenantResult = await client.query(
      `SELECT id, name, subdomain, status, tier, trial_ends_at, limits 
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Tenant tidak ditemukan" 
      });
    }

    const tenant = tenantResult.rows[0];
    
    if (tenant.status !== "TRIAL") {
      return res.status(400).json({ 
        success: false, 
        message: `Tenant tidak dalam status TRIAL (current: ${tenant.status})` 
      });
    }

    // 2. Check if trial hasn't expired
    const trialEndsAt = new Date(tenant.trial_ends_at);
    const now = new Date();
    if (trialEndsAt < now) {
      return res.status(400).json({ 
        success: false, 
        message: "Trial period sudah expired. Silakan bayar tagihan lama terlebih dahulu." 
      });
    }

    // 3. Get plan configuration
    const plansResult = await client.query(
      `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
      ["billing_plans"]
    );
    
    const plans = plansResult.rows.length > 0 
      ? plansResult.rows[0].value 
      : [
          { tier: "BASIC", priceMonthly: 99000, priceYearly: 990000 },
          { tier: "PRO", priceMonthly: 250000, priceYearly: 2400000 },
          { tier: "ENTERPRISE", priceMonthly: 1500000, priceYearly: 15000000 },
        ];
    
    const plan = plans.find((p: any) => p.tier === tier);
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid subscription tier" 
      });
    }

    const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

    // 4. Generate invoice ID and QRIS data
    const invoiceId = "upgrade-inv-" + Date.now().toString(36);
    const dateStr = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDateStr = due.toISOString().split("T")[0];

    // 5. Create invoice in database
    await client.query(
      `INSERT INTO saas_invoices (id, tenant_id, date, due_date, amount, tier, status, billing_cycle, auto_renew)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', $7, true)
       RETURNING id, status`,
      [invoiceId, tenantId, dateStr, dueDateStr, amount, tier, billingCycle]
    );

    // 6. Send email notification to owner
    const ownerEmailResult = await client.query(
      `SELECT email, name FROM users WHERE tenant_id = $1 AND role = 'OWNER' LIMIT 1`,
      [tenantId]
    );
    
    const ownerEmail = ownerEmailResult.rows[0]?.email;
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `[URGENT] Upgrade Trial ke ${tier} - Pembayaran Dibutuhkan`,
        `<p>Halo ${tenant.name},</p>
         <p>Trial Anda akan berakhir pada ${new Date(tenant.trial_ends_at).toLocaleDateString('id-ID')}.</p>
         <p>Silakan segera upgrade ke paket ${tier} untuk menghindari gangguan layanan.</p>
         <p>Total tagihan: Rp ${amount.toLocaleString()}</p>
         <p><strong>SEGERA BAYAR</strong> agar layanan tidak terputus!</p>`
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Invoice upgrade ke ${tier} berhasil dibuat!`,
      invoiceId,
      amount,
      trialEndsAt: tenant.trial_ends_at,
      ownerEmail,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    logger.error({ err: error.message, tenantId, tier }, "[upgrade-trial] Failed");
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    client.release();
  }
}

/**
 * Extend Trial Period for Tenant
 * Extends trial by 7 days (configurable via environment)
 */
export async function extendTrialHandler(req: Request, res: Response) {
  const { tenantId, days } = req.body || {};
  
  if (!tenantId) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required: tenantId" 
    });
  }

  // Default to 7 days, max 14 days
  const defaultDays = parseInt(process.env.TRIAL_EXTENSION_DAYS || "7");
  const maxDays = parseInt(process.env.TRIAL_EXTENSION_MAX_DAYS || "14");
  const extensionDays = Math.min(days || defaultDays, maxDays);

  const client = await getPool().connect();
  try {
    // 1. Validate tenant exists and is in TRIAL status
    const tenantResult = await client.query(
      `SELECT id, name, subdomain, status, trial_ends_at, email 
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Tenant tidak ditemukan" 
      });
    }

    const tenant = tenantResult.rows[0];
    
    if (tenant.status !== "TRIAL") {
      return res.status(400).json({ 
        success: false, 
        message: `Tenant tidak dalam status TRIAL (current: ${tenant.status})` 
      });
    }

    // 2. Extend trial period
    const currentTrialEndsAt = new Date(tenant.trial_ends_at);
    const newTrialEndsAt = new Date(currentTrialEndsAt);
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + extensionDays);

    await client.query(
      `UPDATE tenants SET trial_ends_at = $1 WHERE id = $2`,
      [newTrialEndsAt, tenantId]
    );

    // 3. Log the extension in audit_logs table
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, details, category, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, "system", "TRIAL_EXTENSION", 
       `Trial diperpanjang ${extensionDays} hari. Batas baru: ${newTrialEndsAt.toISOString()}`,
       "BILLING", "LOW"]
    );

    await client.query("COMMIT");

    // 4. Send email notification
    const ownerEmail = tenant.email;
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `[KONFIRMASI] Trial Berhasil Diperpanjang`,
        `<p>Halo ${tenant.name},</p>
         <p>Trial Anda telah diperpanjang sebesar <strong>${extensionDays} hari</strong>.</p>
         <p><strong>Batas akhir trial baru:</strong> ${newTrialEndsAt.toLocaleDateString('id-ID')}</p>
         <p>Anda sekarang memiliki waktu tambahan untuk mengevaluasi layanan kami.</p>`
      );
    }

    // 5. Send Telegram alert
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ <b>TRIAL DIPERPANJANG</b>\nTenant: ${tenant.name} (${tenant.subdomain})\nExtension: ${extensionDays} hari\nBatas Baru: ${newTrialEndsAt.toLocaleDateString('id-ID')}`,
            parse_mode: "HTML",
          }),
        });
      } catch (telegramErr: any) {
        logger.error({ err: telegramErr.message }, "[extend-trial] Telegram alert failed");
      }
    }

    return res.json({
      success: true,
      message: `Trial berhasil diperpanjang ${extensionDays} hari!`,
      oldTrialEndsAt: tenant.trial_ends_at,
      newTrialEndsAt: newTrialEndsAt.toISOString(),
      extensionDays,
    });

  } catch (error: any) {
    await client.query("ROLLBACK");
    logger.error({ err: error.message, tenantId, days }, "[extend-trial] Failed");
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    client.release();
  }
}

