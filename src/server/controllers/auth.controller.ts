import { Request, Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { getPool } from "../../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../../lib/logger.js";
import nodemailer from "nodemailer";
import { passwordPolicyError } from "../lib/passwordPolicy.js";

const JWT_EXPIRES_IN = "24h";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

async function withDb<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); }
}

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

// ---------------------------------------------------------------------------
// Login / Register
// ---------------------------------------------------------------------------

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(422).json({ error: "email and password are required." });
  }

  try {
    const rows = (await withDb(async (c) => {
      const r = await c.query(
        "SELECT id, tenant_id, email, name, role, permissions, password_hash, mfa_enabled FROM users WHERE email = $1 LIMIT 1",
        [String(email).toLowerCase().trim()]
      );
      return r.rows;
    })) as any[];

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.mfa_enabled) {
      return res.status(403).json({ error: "MFA verification is required. Contact administrator." });
    }
    if (user.role !== 'SUPER_ADMIN' && req.hostTenant && user.tenant_id !== req.hostTenant.id) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
        permissions: user.permissions || [],
        mfaEnabled: user.mfa_enabled || false,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[login] Failed");
    res.status(500).json({ error: "Authentication service error." });
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function authProfileHandler(req: Request, res: Response) {
  try {
    const userId = req.authActor?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const rows = (await withDb(async (c) => {
      const r = await c.query("SELECT id, name, email, role, tenant_id, permissions, mfa_enabled FROM users WHERE id = $1 LIMIT 1", [userId]);
      return r.rows;
    })) as any[];
    if (!rows.length) {
      return res.status(404).json({ error: "User profile not found. Contact admin to create a tenant account." });
    }
    const user = rows[0];
    const branchRows = (await withDb(async (c) => {
      const r = await c.query("SELECT branch_id FROM user_branches WHERE user_id = $1", [user.id]);
      return r.rows;
    })) as any[];
    const branchIds = branchRows.map((row: any) => row.branch_id);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id, branchIds, permissions: user.permissions || [], mfaEnabled: user.mfa_enabled || false });
  } catch (err: any) {
    logger.error({ err: err.message }, "[profile] Failed");
    res.status(500).json({ error: "User profile service error." });
  }
}

export async function authPasswordUpdateHandler(req: Request, res: Response) {
  const userId = req.authActor?.userId;
  const { currentPassword, newPassword } = req.body || {};
  if (!userId) return res.status(401).json({ error: "Invalid or expired token." });
  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return res.status(422).json({ error: "Current password and new password (min 8 chars) are required." });
  }

  try {
    const account = await withDb(async (c) => {
      const result = await c.query(`SELECT u.password_hash,t.settings->'securitySettings' AS policy FROM users u LEFT JOIN tenants t ON t.id=u.tenant_id WHERE u.id = $1 LIMIT 1`, [userId]);
      return result.rows[0];
    });
    const policyError = passwordPolicyError(String(newPassword), account?.policy);
    if (policyError) return res.status(422).json({ error: policyError });
    if (!account?.password_hash || !(await bcrypt.compare(String(currentPassword), account.password_hash))) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    const newPasswordHash = await bcrypt.hash(String(newPassword), 10);
    await withDb((c) => c.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newPasswordHash, userId]));
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err: err.message, userId }, "[profile-password] Failed");
    return res.status(500).json({ error: "Failed to update password." });
  }
}

// ---------------------------------------------------------------------------
// Admin: Reset Password (local bcrypt)
// ---------------------------------------------------------------------------

export async function adminResetPasswordHandler(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password || String(password).length < 8) {
    return res.status(422).json({ success: false, message: "email and password (min 8 chars) are required." });
  }
  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    const result = await withDb(async (c) => {
      const r = await c.query(
        "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email",
        [passwordHash, String(email).toLowerCase().trim()]
      );
      return r.rows;
    }) as any[];

    if (!result.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, message: "Password updated.", userId: result[0].id, email: result[0].email });
  } catch (error: any) {
    logger.error({ err: error.message }, "[password-reset] Failed");
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
}

// ---------------------------------------------------------------------------
// Onboarding: Register new tenant with owner
// ---------------------------------------------------------------------------

export async function onboardingRegisterHandler(req: Request, res: Response) {
  const { shopName, subdomain, ownerName, ownerEmail, ownerPassword, themeColor } = req.body || {};
  if (!shopName || !ownerName || !ownerEmail || !ownerPassword) {
    return res.status(422).json({ success: false, message: "shopName, ownerName, ownerEmail, ownerPassword are required." });
  }
  const policyError = passwordPolicyError(String(ownerPassword), { minPasswordLength: 8 });
  if (policyError) {
    return res.status(422).json({ success: false, message: policyError });
  }

  const client = await getPool().connect();
  try {
    const passwordHash = await bcrypt.hash(String(ownerPassword), 10);
    const tenantId = randomUUID();
    const branchId = randomUUID();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO tenants (id, name, subdomain, status, tier, trial_ends_at, settings, branding, created_at)
       VALUES ($1, $2, $3, 'TRIAL', $4, now() + interval '30 days', $5, $6, now())`,
      [tenantId, shopName, subdomain || shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "BASIC",
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
      [randomUUID(), tenantId, branchId]
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
        [randomUUID(), tenantId, code, name, type, balance]
      );
    }
    const userId = randomUUID();
    await client.query(
      `INSERT INTO users (id, tenant_id, email, name, role, permissions, password_hash, mfa_enabled, created_at)
       VALUES ($1, $2, $3, $4, 'OWNER', ARRAY[$5]::text[], $6, false, now())`,
      [userId, tenantId, String(ownerEmail).toLowerCase().trim(), ownerName, "*", passwordHash]
    );
    await client.query(`INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`, [userId, branchId]);
    await client.query(
      `INSERT INTO api_tokens (id, token, token_hash, token_prefix, name, abilities, tenant_id, branch_id, created_at)
       VALUES ($1, NULL, $2, $3, 'Owner Sync Key', $4::jsonb, $5, $6, now())`,
      (() => { const value = `token_${randomUUID()}`; return [randomUUID(), createHash("sha256").update(value).digest("hex"), value.slice(0, 16), '["*"]', tenantId, branchId]; })()
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
    logger.error({ err: error.message }, "[onboarding-register] Failed");
    return res.status(500).json({ success: false, message: "Registration failed." });
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Upgrade Trial Tenant to Paid Plan
// ---------------------------------------------------------------------------

export async function upgradeTrialHandler(req: Request, res: Response) {
  const { tier, billingCycle } = req.body || {};
  const tenantId = req.tenantId;
  
  if (!tenantId || !tier || !billingCycle) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required: tenantId, tier, billingCycle" 
    });
  }

  if (!["BASIC", "PRO", "ENTERPRISE"].includes(tier)) {
    return res.status(400).json({ success: false, message: "Invalid subscription tier." });
  }
  if (!["monthly", "yearly"].includes(billingCycle)) {
    return res.status(400).json({ success: false, message: "Invalid billing cycle. Must be monthly or yearly." });
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tenantResult = await client.query(
      `SELECT id, name, subdomain, status, tier, trial_ends_at, settings->>'limits' as limits
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Tenant tidak ditemukan" });
    }

    const tenant = tenantResult.rows[0];
    
    if (tenant.status !== "TRIAL" && tenant.status !== "EXPIRED") {
      return res.status(400).json({ 
        success: false, 
        message: `Tenant tidak dalam status trial atau expired (current: ${tenant.status})`
      });
    }

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
      return res.status(400).json({ success: false, message: "Invalid subscription tier" });
    }

    const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

    const invoiceId = `upgrade-${randomUUID()}`;
    const dateStr = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDateStr = due.toISOString().split("T")[0];

    await client.query(
      `INSERT INTO saas_invoices (id, tenant_id, date, due_date, amount, tier, status, billing_cycle, auto_renew)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', $7, true)`,
      [invoiceId, tenantId, dateStr, dueDateStr, amount, tier, billingCycle]
    );

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
    return res.status(500).json({ success: false, message: "Operasi autentikasi gagal diproses." });
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Extend Trial Period
// ---------------------------------------------------------------------------

export async function extendTrialHandler(req: Request, res: Response) {
  const { days } = req.body || {};
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({ success: false, message: "Missing required: tenantId" });
  }

  const defaultDays = parseInt(process.env.TRIAL_EXTENSION_DAYS || "7");
  const maxDays = parseInt(process.env.TRIAL_EXTENSION_MAX_DAYS || "14");
  const maxExtensions = parseInt(process.env.TRIAL_MAX_EXTENSIONS || "3");
  const requestedDays = days === undefined ? defaultDays : Number(days);
  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > maxDays) {
    return res.status(422).json({ success: false, message: `days must be an integer between 1 and ${maxDays}.` });
  }
  const extensionDays = requestedDays;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tenantResult = await client.query(
      `SELECT id, name, subdomain, status, trial_ends_at, settings
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Tenant tidak ditemukan" });
    }

    const tenant = tenantResult.rows[0];
    
    if (tenant.status !== "TRIAL") {
      return res.status(400).json({ 
        success: false, 
        message: `Tenant tidak dalam status TRIAL (current: ${tenant.status})` 
      });
    }

    const currentTrialEndsAt = new Date(tenant.trial_ends_at);
    const now = new Date();
    const gracePeriodEnd = new Date(currentTrialEndsAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period

    if (gracePeriodEnd < now) {
      return res.status(400).json({
        success: false,
        message: "Trial sudah expired lebih dari 3 hari, tidak dapat diperpanjang. Silakan upgrade ke paket berbayar."
      });
    }

    const settings = tenant.settings || {};
    const trialExtensionCount = settings.trialExtensionCount || 0;
    if (trialExtensionCount >= maxExtensions) {
      return res.status(400).json({
        success: false,
        message: `Batas maksimal perpanjangan trial (${maxExtensions}x) sudah tercapai. Silakan upgrade ke paket berbayar.`
      });
    }

    const newTrialEndsAt = new Date(currentTrialEndsAt);
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + extensionDays);
    const newSettings = { ...settings, trialExtensionCount: trialExtensionCount + 1 };

    await client.query(
      `UPDATE tenants SET trial_ends_at = $1, settings = $2::jsonb WHERE id = $3`,
      [newTrialEndsAt, JSON.stringify(newSettings), tenantId]
    );

    const ownerEmailResult = await client.query(
      `SELECT email FROM users WHERE tenant_id = $1 AND role = 'OWNER' LIMIT 1`,
      [tenantId]
    );
    const ownerEmail = ownerEmailResult.rows[0]?.email;
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

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Trial berhasil diperpanjang ${extensionDays} hari!`,
      oldTrialEndsAt: tenant.trial_ends_at,
      newTrialEndsAt: newTrialEndsAt.toISOString(),
      extensionDays,
      extensionCount: trialExtensionCount + 1,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    logger.error({ err: error.message, tenantId, days }, "[extend-trial] Failed");
    return res.status(500).json({ success: false, message: "Operasi autentikasi gagal diproses." });
  } finally {
    client.release();
  }
}
