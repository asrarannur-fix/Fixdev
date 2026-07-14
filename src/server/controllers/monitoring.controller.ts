import type { Request, Response } from "express";
import { dbQuery } from "../../lib/db.js";

export async function platformHealthHandler(req: Request, res: Response) {
  const checkedAt = new Date().toISOString();
  const authOk = req.authActor?.role === "SUPER_ADMIN";
  const startedAt = Date.now();

  try {
    const [result, billing, outbox, backups, incidents] = await Promise.all([
      dbQuery(
        `SELECT
          (SELECT COUNT(*)::int FROM tenants) AS tenant_count,
          (SELECT COUNT(*)::int FROM users) AS user_count`,
      ),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE status IN ('UNPAID','OVERDUE','PENDING_VERIFICATION'))::int AS open_invoices,
        COUNT(*) FILTER (WHERE status='OVERDUE' OR (status='UNPAID' AND due_date<CURRENT_DATE))::int AS overdue
        FROM saas_invoices`).catch(() => ({ rows: [{ open_invoices: 0, overdue: 0 }] } as any)),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE status='FAILED')::int AS failed,
        COUNT(*) FILTER (WHERE status IN ('PENDING','PROCESSING'))::int AS pending,
        MAX(sent_at) AS last_sent_at FROM billing_notification_outbox`)
        .catch(() => ({ rows: [{ failed: 0, pending: 0, last_sent_at: null }] } as any)),
      dbQuery(`SELECT status,created_at,completed_at FROM backup_jobs ORDER BY created_at DESC LIMIT 1`)
        .catch(() => ({ rows: [] } as any)),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE status='OPEN')::int AS open,
        COUNT(*) FILTER (WHERE status='OPEN' AND severity='CRITICAL')::int AS critical FROM platform_incidents`)
        .catch(() => ({ rows: [{ open: 0, critical: 0 }] } as any)),
    ]);
    const elapsedMs = Date.now() - startedAt;
    const counts = result.rows[0] || {};
    const outboxStatus = Number(outbox.rows[0]?.failed || 0) > 0 ? "degraded" : "ok";
    const incidentStatus = Number(incidents.rows[0]?.critical || 0) > 0 ? "degraded" : "ok";
    const overallStatus = authOk && outboxStatus === "ok" && incidentStatus === "ok" ? "ok" : "degraded";

    return res.json({
      status: overallStatus,
      checkedAt,
      components: {
        api: { status: "ok", latencyMs: elapsedMs },
        auth: { status: authOk ? "ok" : "degraded" },
        database: {
          status: "ok",
          latencyMs: elapsedMs,
          tenantCount: counts.tenant_count || 0,
          userCount: counts.user_count || 0,
        },
        billing: { status: "ok", openInvoices: Number(billing.rows[0]?.open_invoices || 0), overdue: Number(billing.rows[0]?.overdue || 0) },
        notificationOutbox: { status: outboxStatus, failed: Number(outbox.rows[0]?.failed || 0), pending: Number(outbox.rows[0]?.pending || 0), lastSentAt: outbox.rows[0]?.last_sent_at || null },
        backup: backups.rows[0] ? { status: backups.rows[0].status === "FAILED" ? "degraded" : "ok", lastJobAt: backups.rows[0].completed_at || backups.rows[0].created_at } : { status: "unknown", message: "Belum ada riwayat snapshot terukur." },
        incidents: { status: incidentStatus, open: Number(incidents.rows[0]?.open || 0), critical: Number(incidents.rows[0]?.critical || 0) },
      },
    });
  } catch {
    return res.status(503).json({
      status: "down",
      checkedAt,
      components: {
        api: { status: "ok" },
        auth: { status: authOk ? "ok" : "degraded" },
        database: { status: "down" },
      },
    });
  }
}
