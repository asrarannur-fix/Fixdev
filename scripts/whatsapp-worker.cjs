#!/usr/bin/env node
"use strict";

require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const endpoint = process.env.WHATSAPP_OUTBOX_ENDPOINT;
const token = process.env.WHATSAPP_OUTBOX_TOKEN;

if (!connectionString) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}
if (!endpoint || !token) {
  console.log(JSON.stringify({ skipped: "manual_or_unconfigured_gateway" }));
  process.exit(0);
}

const pool = new Pool({ connectionString });

async function claimBatch(client) {
  await client.query("BEGIN");
  const result = await client.query(`
    SELECT id, recipient, payload
    FROM billing_notification_outbox
    WHERE channel = 'WHATSAPP'
      AND status IN ('PENDING', 'FAILED')
      AND attempts < 5
      AND next_attempt_at <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 20
  `);
  if (result.rows.length) {
    await client.query(
      `UPDATE billing_notification_outbox
       SET status = 'PROCESSING', attempts = attempts + 1
       WHERE id = ANY($1::uuid[])`,
      [result.rows.map((row) => row.id)],
    );
  }
  await client.query("COMMIT");
  return result.rows;
}

async function send(row) {
  const message = row.message || [row.payload?.title, row.payload?.message].filter(Boolean).join("\n");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipient: row.recipient || row.recipient_phone, message }),
  });
  if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
}

async function claimWhatsAppQueue(client) {
  await client.query("BEGIN");
  const result = await client.query(`
    SELECT id, recipient_phone, message
    FROM whatsapp_queue
    WHERE status IN ('PENDING', 'FAILED')
      AND scheduled_time <= now()
      AND attempts < 5
    ORDER BY scheduled_time, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 20
  `);
  if (result.rows.length) {
    await client.query(
      `UPDATE whatsapp_queue SET status='PROCESSING', attempts=attempts+1, updated_at=now() WHERE id=ANY($1::uuid[])`,
      [result.rows.map((row) => row.id)],
    );
  }
  await client.query("COMMIT");
  return result.rows;
}

async function enqueueScheduledAlerts(client) {
  const settingsResult = await client.query(`SELECT value FROM app_settings WHERE key='superadmin_alert_settings' LIMIT 1`);
  const settings = settingsResult.rows[0]?.value || { overdueEnabled: true, trialDays: 7, queueFailureEnabled: true, dailyReportHour: 8 };
  if (settings.overdueEnabled) {
    await client.query(`INSERT INTO billing_internal_notifications(tenant_id,audience_role,event_type,title,message,resource_type,resource_id)
      SELECT i.tenant_id,'SUPER_ADMIN','INVOICE_OVERDUE','Invoice overdue',concat('Invoice ',i.id,' melewati jatuh tempo.'),'saas_invoice',i.id::text
      FROM saas_invoices i WHERE (i.status='OVERDUE' OR (i.status='UNPAID' AND i.due_date<CURRENT_DATE))
      AND NOT EXISTS (SELECT 1 FROM billing_internal_notifications n WHERE n.event_type='INVOICE_OVERDUE' AND n.resource_id=i.id::text)`);
  }
  const trialDays = Math.min(30, Math.max(1, Number(settings.trialDays) || 7));
  await client.query(`INSERT INTO billing_internal_notifications(tenant_id,audience_role,event_type,title,message,resource_type,resource_id)
    SELECT t.id,'SUPER_ADMIN','TRIAL_EXPIRING','Trial segera berakhir',concat(t.name,' berakhir pada ',t.trial_ends_at::date),'tenant',t.id::text
    FROM tenants t WHERE t.status='TRIAL' AND t.trial_ends_at BETWEEN now() AND now()+($1||' days')::interval
    AND NOT EXISTS (SELECT 1 FROM billing_internal_notifications n WHERE n.event_type='TRIAL_EXPIRING' AND n.resource_id=t.id::text AND n.created_at>CURRENT_DATE)`, [trialDays]);
  if (settings.queueFailureEnabled) {
    const failed = await client.query(`SELECT COUNT(*)::int AS count FROM billing_notification_outbox WHERE status='FAILED'`);
    if (failed.rows[0].count > 0) await client.query(`INSERT INTO billing_internal_notifications(audience_role,event_type,title,message,resource_type,resource_id)
      SELECT 'SUPER_ADMIN','OUTBOX_FAILED','Delivery notifikasi gagal',$1,'notification_outbox',CURRENT_DATE::text
      WHERE NOT EXISTS (SELECT 1 FROM billing_internal_notifications WHERE event_type='OUTBOX_FAILED' AND created_at>CURRENT_DATE)`, [`${failed.rows[0].count} delivery memerlukan perhatian.`]);
  }
  if (new Date().getHours() === Number(settings.dailyReportHour)) {
    await client.query(`INSERT INTO billing_internal_notifications(audience_role,event_type,title,message,resource_type,resource_id)
      SELECT 'SUPER_ADMIN','DAILY_REPORT','Laporan operasional harian',concat('Pending delivery: ',COUNT(*) FILTER (WHERE status='PENDING'),', gagal: ',COUNT(*) FILTER (WHERE status='FAILED')),'operations_report',CURRENT_DATE::text
      FROM billing_notification_outbox WHERE NOT EXISTS (SELECT 1 FROM billing_internal_notifications WHERE event_type='DAILY_REPORT' AND resource_id=CURRENT_DATE::text)`);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await enqueueScheduledAlerts(client);
    const rows = await claimBatch(client);
    const whatsappRows = await claimWhatsAppQueue(client);
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await send(row);
        await client.query(
          `UPDATE billing_notification_outbox
           SET status = 'SENT', sent_at = now(), last_error = NULL
           WHERE id = $1`,
          [row.id],
        );
        sent++;
      } catch (error) {
        await client.query(
          `UPDATE billing_notification_outbox
           SET status = 'FAILED', last_error = $2,
               next_attempt_at = now() + make_interval(mins => LEAST(60, attempts * attempts))
           WHERE id = $1`,
          [row.id, String(error.message || error).slice(0, 500)],
        );
        failed++;
      }
    }
    for (const row of whatsappRows) {
      try {
        await send(row);
        await client.query(`UPDATE whatsapp_queue SET status='SENT', last_error=NULL, updated_at=now() WHERE id=$1`, [row.id]);
        sent++;
      } catch (error) {
        await client.query(
          `UPDATE whatsapp_queue SET status='FAILED', last_error=$2, scheduled_time=now()+make_interval(mins => LEAST(60, attempts * attempts)), updated_at=now() WHERE id=$1`,
          [row.id, String(error.message || error).slice(0, 500)],
        );
        failed++;
      }
    }
    console.log(JSON.stringify({ claimed: rows.length + whatsappRows.length, sent, failed }));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error.message || error);
  await pool.end().catch(() => {});
  process.exit(1);
});
