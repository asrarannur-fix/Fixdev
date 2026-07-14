import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import nodemailer from "nodemailer";

dotenv.config();

const { Pool } = pg;

// Supabase admin client (for sending notifications if needed)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Database pool connection
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: parseInt(process.env.SUPABASE_DB_POOL_MAX || "10"),
});

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
    console.warn("[email] Email not configured, using dry-run mode");
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
    console.log(`[email] Dry-run - Email would be sent to ${to}: ${subject}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@fixdev.my.id",
      to,
      subject,
      html,
    });
    console.log(`[email] Email sent successfully to ${to}`);
    return true;
  } catch (err: any) {
    console.error(`[email] Failed to send email to ${to}:`, err.message);
    return false;
  }
}

/**
 * Send Telegram alert
 */
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log(`[telegram] Dry-run - Telegram alert would be sent: ${message}`);
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (data.ok) {
      console.log("[telegram] Telegram alert sent successfully");
      return true;
    } else {
      console.error("[telegram] Failed to send Telegram alert:", data.description);
      return false;
    }
  } catch (err: any) {
    console.error("[telegram] Error sending Telegram alert:", err.message);
    return false;
  }
}

/**
 * Send expiration email to tenant
 */
async function sendExpirationEmail(to: string, tenantName: string, expiredAt: string): Promise<boolean> {
  const subject = `[URGENT] Trial Anda Sudah Expired - Layanan Akan Dibekukan!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">⚠️ PERHATIAN: Trial Anda Sudah Expired!</h2>
      <p>Halo ${tenantName},</p>
      <p>Trial akun Anda telah berakhir pada <strong>${new Date(expiredAt).toLocaleDateString('id-ID')}</strong>.</p>
      <p>Layanan Anda akan segera dibekukan. Untuk mengaktifkan kembali, silakan upgrade ke paket berbayar.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Paket Layanan yang Tersedia:</h3>
        <ul>
          <li><strong>BASIC</strong> - Rp 99.000/bulan</li>
          <li><strong>PRO</strong> - Rp 250.000/bulan</li>
          <li><strong>ENTERPRISE</strong> - Rp 1.500.000/bulan</li>
        </ul>
      </div>
      <p>Jika Anda ingin memperpanjang trial atau memiliki pertanyaan, silakan hubungi tim support kami.</p>
      <hr>
      <p style="font-size: 12px; color: #666;">Ini adalah pesan otomatis dari SaaS FixDev. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return await sendEmail(to, subject, html);
}

/**
 * Send warning email to tenant (before expiry)
 */
async function sendWarningEmail(to: string, tenantName: string, daysLeft: number): Promise<boolean> {
  const subject = `[PERINGATAN] Trial Akan Berakhir dalam ${daysLeft} Hari!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f39c12;">⏰ Trial Anda Akan Berakhir dalam ${daysLeft} Hari!</h2>
      <p>Halo ${tenantName},</p>
      <p>Peringatan: Trial akun Anda akan berakhir dalam <strong>${daysLeft} hari</strong>.</p>
      <p>Segera upgrade ke paket berbayar untuk menghindari gangguan layanan.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Paket Layanan yang Tersedia:</h3>
        <ul>
          <li><strong>BASIC</strong> - Rp 99.000/bulan</li>
          <li><strong>PRO</strong> - Rp 250.000/bulan</li>
          <li><strong>ENTERPRISE</strong> - Rp 1.500.000/bulan</li>
        </ul>
      </div>
      <p>Untuk upgrade, silakan login ke dashboard dan klik menu "Upgrade Trial".</p>
      <hr>
      <p style="font-size: 12px; color: #666;">Ini adalah pesan otomatis dari SaaS FixDev. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return await sendEmail(to, subject, html);
}

/**
 * Send trial extension reminder email
 */
async function sendExtensionReminderEmail(to: string, tenantName: string, newExpiryDate: string): Promise<boolean> {
  const subject = `[KONFIRMASI] Trial Diperpanjang - Batas Baru: ${new Date(newExpiryDate).toLocaleDateString('id-ID')}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">✅ Trial Berhasil Diperpanjang!</h2>
      <p>Halo ${tenantName},</p>
      <p>Permintaan perpanjangan trial telah diproses.</p>
      <p><strong>Batas akhir trial baru:</strong> ${new Date(newExpiryDate).toLocaleDateString('id-ID')}</p>
      <p>Anda sekarang memiliki waktu tambahan untuk mengevaluasi layanan kami.</p>
      <hr>
      <p style="font-size: 12px; color: #666;">Ini adalah pesan otomatis dari SaaS FixDev. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return await sendEmail(to, subject, html);
}

async function checkTrialExpiry() {
  console.log("=== CHECK TRIAL EXPIRY ===");
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  const results = {
    checked: 0,
    expired: 0,
    warned: 0,
    errors: 0,
  };

  try {
    // 1. Find all tenants with trial status that are expired
    const expiredQuery = `
      SELECT t.id, t.name, t.subdomain, t.email, t.trial_ends_at
      FROM tenants t
      WHERE t.status = 'TRIAL'
        AND t.trial_ends_at <= NOW()
    `;
    
    const expiredResult = await pool.query(expiredQuery);
    results.checked = expiredResult.rows.length;
    console.log(`Found ${expiredResult.rows.length} expired trial tenants`);

    for (const tenant of expiredResult.rows) {
      try {
        // Update status to EXPIRED
        await pool.query(
          `UPDATE tenants SET status = 'EXPIRED' WHERE id = $1`,
          [tenant.id]
        );
        results.expired++;

        console.log(`[EXPIRED] Tenant: ${tenant.name} (${tenant.subdomain})`);
        console.log(`       Expired at: ${tenant.trial_ends_at}`);

        // Send email notification
        await sendExpirationEmail(tenant.email, tenant.name, tenant.trial_ends_at);

        // Send Telegram alert
        await sendTelegramAlert(
          `⚠️ <b>TRIAL EXPIRED</b>\nTenant: ${tenant.name} (${tenant.subdomain})\nExpired at: ${tenant.trial_ends_at}\nStatus: EXPIRED`
        );
      } catch (err) {
        console.error(`[ERROR] Failed to expire tenant ${tenant.id}:`, err.message);
        results.errors++;
      }
    }

    console.log("");

    // 2. Find tenants about to expire (within 7 days) - warning them
    const warningQuery = `
      SELECT t.id, t.name, t.subdomain, t.email, t.trial_ends_at
      FROM tenants t
      WHERE t.status = 'TRIAL'
        AND t.trial_ends_at > NOW()
        AND t.trial_ends_at <= NOW() + INTERVAL '7 days'
    `;

    const warningResult = await pool.query(warningQuery);
    console.log(`Found ${warningResult.rows.length} tenants about to expire (within 7 days)`);

    for (const tenant of warningResult.rows) {
      try {
        const daysLeft = Math.ceil(
          (new Date(tenant.trial_ends_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );

        console.log(`[WARNING] Tenant: ${tenant.name} (${tenant.subdomain})`);
        console.log(`          Days left: ${daysLeft}`);

        // Send warning email
        await sendWarningEmail(tenant.email, tenant.name, daysLeft);

        // Send Telegram alert if threshold reached
        const alertThreshold = parseInt(process.env.EXPIRED_TENANT_ALERT_THRESHOLD || "10");
        if (daysLeft <= alertThreshold) {
          await sendTelegramAlert(
            `⏰ <b>TRIAL AKAN EXPIRED</b>\nTenant: ${tenant.name} (${tenant.subdomain})\nDays Left: ${daysLeft}\nExpired At: ${tenant.trial_ends_at}`
          );
        }
        results.warned++;
      } catch (err) {
        console.error(`[ERROR] Failed to warn tenant ${tenant.id}:`, err.message);
        results.errors++;
      }
    }

    console.log("");
    console.log("=== SUMMARY ===");
    console.log(`Checked: ${results.checked}`);
    console.log(`Expired: ${results.expired}`);
    console.log(`Warned: ${results.warned}`);
    console.log(`Errors: ${results.errors}`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

checkTrialExpiry();
