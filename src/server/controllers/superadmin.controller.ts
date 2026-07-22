import { createHash, randomBytes, randomUUID } from "crypto";
import type { Request, Response } from "express";
import { dbQuery, dbTransaction } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";
import nodemailer from "nodemailer";
import { z } from "zod";
import { redactTenantSettingsSecrets } from "./bootstrap.controller.js";

async function sendInvitationEmail(email: string, ownerName: string, tenantName: string, token: string, expiresAt: string) {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return false;
  const port = Number(process.env.EMAIL_PORT || 587);
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/?invite=${encodeURIComponent(token)}`;
  await transporter.sendMail({ from: process.env.EMAIL_FROM || user, to: email, subject: `Undangan Owner ${tenantName}`, html: `<p>Halo ${ownerName},</p><p>Anda diundang sebagai owner <strong>${tenantName}</strong>.</p><p><a href="${inviteUrl}">Terima undangan dan buat password</a></p><p>Berlaku sampai ${expiresAt}.</p>` });
  return true;
}

const tenantConfigSchema = z.object({
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(150).optional(),
  subdomain: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]).optional(),
  tier: z.enum(["BASIC", "PRO", "ENTERPRISE"]).optional(),
  branding: z.object({ customDomain: z.string().trim().toLowerCase().max(253).optional() }).strict().optional(),
  storageSettings: z.object({ mode: z.string().trim().min(1).max(50), bucketName: z.string().trim().max(255) }).strict().optional(),
}).strict();

const allowedSorts: Record<string, string> = {
  name: "t.name",
  createdAt: "t.created_at",
  status: "t.status",
  tier: "t.tier",
  lastActivity: "t.last_activity_at",
};

function pageArgs(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function clientIp(req: Request) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "");
}

async function adminAudit(
  client: any,
  req: Request,
  action: string,
  resourceType: string,
  resourceId: string | null,
  tenantId: string | null,
  beforeState: unknown,
  afterState: unknown,
  metadata: Record<string, unknown> = {},
) {
  await client.query(
    `INSERT INTO superadmin_audit_events
      (actor_user_id, actor_role, effective_tenant_id, impersonation_session_id, action, resource_type, resource_id,
       outcome, client_ip, before_state, after_state, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'SUCCESS',$8,$9::jsonb,$10::jsonb,$11::jsonb)`,
    [req.authActor?.userId, req.authActor?.role, tenantId, req.impersonationSession?.id || null, action, resourceType,
      resourceId, clientIp(req), JSON.stringify(beforeState ?? null),
      JSON.stringify(afterState ?? null), JSON.stringify(metadata)],
  );
}

export async function getOverview(req: Request, res: Response) {
  try {
    const [billing, tenants, trials, manual, incidents, notifications] = await Promise.all([
      dbQuery(`SELECT
        COALESCE(SUM(amount) FILTER (WHERE status='PAID' AND COALESCE(period_end, now() + interval '1 month') > now()
          AND COALESCE(period_start, paid_at, created_at) <= now()
          AND billing_cycle='monthly'),0)::numeric AS mrr_monthly,
        COALESCE(SUM(amount / 12) FILTER (WHERE status='PAID' AND COALESCE(period_end, now() + interval '1 year') > now()
          AND billing_cycle='yearly'),0)::numeric AS mrr_yearly,
        COALESCE(SUM(amount) FILTER (WHERE status='PAID' AND paid_at >= date_trunc('month', now())),0)::numeric AS received_month,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('UNPAID','OVERDUE','PENDING_VERIFICATION')),0)::numeric AS outstanding,
        COUNT(*) FILTER (WHERE status='OVERDUE' OR (status='UNPAID' AND due_date < CURRENT_DATE))::int AS overdue_count
        FROM saas_invoices`),
      dbQuery(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE status='TRIAL')::int AS trial,
        COUNT(*) FILTER (WHERE status='SUSPENDED')::int AS suspended
        FROM tenants`),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE status='TRIAL' AND trial_ends_at BETWEEN now() AND now()+interval '7 days')::int AS warning,
        COUNT(*) FILTER (WHERE status='TRIAL' AND trial_ends_at < now())::int AS expired
        FROM tenants`),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE status='SUBMITTED')::int AS pending FROM manual_payment_requests`)
        .catch(() => ({ rows: [{ pending: 0 }] } as any)),
      dbQuery(`SELECT id, component, severity, title, details, opened_at AS "openedAt"
        FROM platform_incidents WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 10`)
        .catch(() => ({ rows: [] } as any)),
      dbQuery(`SELECT COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread
        FROM billing_internal_notifications WHERE audience_role='SUPER_ADMIN'`)
        .catch(() => ({ rows: [{ unread: 0 }] } as any)),
    ]);

    const b = billing.rows[0] || {};
    const t = tenants.rows[0] || {};
    const trial = trials.rows[0] || {};
    const mrr = Number(b.mrr_monthly || 0) + Number(b.mrr_yearly || 0);
    const actions = [
      Number(manual.rows[0]?.pending) > 0 && { id: "manual-payments", severity: "critical", count: Number(manual.rows[0].pending), label: "Pembayaran manual menunggu verifikasi", targetTab: "saas-billing", targetFilter: "manual-pending" },
      Number(b.overdue_count) > 0 && { id: "overdue", severity: "critical", count: Number(b.overdue_count), label: "Invoice melewati jatuh tempo", targetTab: "saas-billing", targetFilter: "overdue" },
      Number(trial.warning) > 0 && { id: "trial-warning", severity: "warning", count: Number(trial.warning), label: "Trial berakhir dalam 7 hari", targetTab: "saas-tenants", targetFilter: "trial-warning" },
      ...incidents.rows.map((incident: any) => ({ id: incident.id, severity: incident.severity === "CRITICAL" ? "critical" : "warning", count: 1, label: incident.title, targetTab: "saas-operations", targetFilter: "incidents" })),
    ].filter(Boolean);

    res.json({
      metrics: {
        mrr, arr: mrr * 12, receivedThisMonth: Number(b.received_month || 0),
        outstanding: Number(b.outstanding || 0), overdueInvoices: Number(b.overdue_count || 0),
        totalTenants: Number(t.total || 0), activeTenants: Number(t.active || 0),
        trialTenants: Number(t.trial || 0), suspendedTenants: Number(t.suspended || 0),
        pendingManualPayments: Number(manual.rows[0]?.pending || 0), trialExpiring: Number(trial.warning || 0),
        unreadNotifications: Number(notifications.rows[0]?.unread || 0),
      },
      actions,
      generatedAt: new Date().toISOString(),
      source: "database",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Super Admin overview failed");
    res.status(500).json({ error: "Ringkasan Super Admin gagal dimuat." });
  }
}

export async function collectStorageUsage(req: Request, res: Response) {
  try {
    const uploadDir = process.env.FILE_UPLOAD_DIR || "./uploads";
    const fs = await import("fs");
    const path = await import("path");
    const tenants = await dbQuery(`SELECT id FROM tenants ORDER BY id`);
    let measured = 0;
    for (const tenant of tenants.rows) {
      let total = 0;
      const tenantDir = path.join(uploadDir, `tenant-${tenant.id}`);
      if (fs.existsSync(tenantDir)) {
        const files = fs.readdirSync(tenantDir, { recursive: true, withFileTypes: true });
        for (const file of files) {
          if (file.isFile()) {
            const stats = fs.statSync(path.join(tenantDir, file.name));
            total += stats.size;
          }
        }
      }
      await dbTransaction(async (client) => {
        await client.query(`UPDATE tenants SET storage_used_bytes=$2,storage_measured_at=now() WHERE id=$1`, [tenant.id, total]);
        await client.query(`INSERT INTO superadmin_audit_events
          (actor_user_id,actor_role,effective_tenant_id,action,resource_type,resource_id,outcome,client_ip,after_state)
          VALUES ($1,$2,$3,'STORAGE_USAGE_COLLECTED','tenant',$3,'SUCCESS',$4,$5::jsonb)`,
          [req.authActor?.userId, req.authActor?.role, tenant.id, clientIp(req), JSON.stringify({ storageUsedBytes: total })],
        );
      });
      measured++;
    }
    res.json({ success: true, measured, measuredAt: new Date().toISOString(), source: "local-storage" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Storage usage collection failed");
    res.status(500).json({ error: "Pengukuran storage gagal." });
  }
}

export async function listTenants(req: Request, res: Response) {
  const { page, pageSize, offset } = pageArgs(req);
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (req.query.search) {
    params.push(`%${String(req.query.search).trim()}%`);
    clauses.push(`(t.name ILIKE $${params.length} OR t.subdomain ILIKE $${params.length} OR COALESCE(t.branding->>'customDomain','') ILIKE $${params.length})`);
  }
  if (req.query.status) { params.push(req.query.status); clauses.push(`t.status=$${params.length}`); }
  if (req.query.tier) { params.push(req.query.tier); clauses.push(`t.tier=$${params.length}`); }
  if (req.query.attention === "trial-warning") clauses.push(`t.status='TRIAL' AND t.trial_ends_at BETWEEN now() AND now()+interval '7 days'`);
  if (req.query.attention === "storage") clauses.push(`t.storage_used_bytes IS NOT NULL AND t.storage_used_bytes >= COALESCE((t.settings#>>'{limits,storageMb}')::numeric,1024)*1048576*0.8`);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sort = allowedSorts[String(req.query.sort || "createdAt")] || allowedSorts.createdAt;
  const direction = String(req.query.direction).toLowerCase() === "asc" ? "ASC" : "DESC";
  try {
    const count = await dbQuery(`SELECT COUNT(*)::int AS count FROM tenants t ${where}`, params as any[]);
    params.push(pageSize, offset);
    const result = await dbQuery(
      `SELECT t.id,t.name,t.subdomain,t.status,t.tier,t.trial_ends_at AS "trialEndsAt",
        t.created_at AS "createdAt",t.last_activity_at AS "lastActivityAt",t.version,
        t.status_reason AS "statusReason",t.scheduled_reactivation_at AS "scheduledReactivationAt",
        t.storage_used_bytes AS "storageUsedBytes",t.storage_measured_at AS "storageMeasuredAt",
        t.settings,t.branding,
        (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id=t.id) AS "userCount",
        (SELECT COUNT(*)::int FROM branches b WHERE b.tenant_id=t.id) AS "branchCount",
        (SELECT COUNT(*)::int FROM pos_transactions p WHERE p.tenant_id=t.id) AS "transactionCount",
        (SELECT COUNT(*)::int FROM service_tickets s WHERE s.tenant_id=t.id) AS "serviceCount",
        (SELECT COUNT(*)::int FROM saas_invoices i WHERE i.tenant_id=t.id AND (i.status='OVERDUE' OR (i.status='UNPAID' AND i.due_date<CURRENT_DATE))) AS "overdueCount"
       FROM tenants t ${where} ORDER BY ${sort} ${direction} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params as any[],
    );
    const items = result.rows.map((row: any) => {
      const sanitizedSettings = redactTenantSettingsSecrets({ settings: row.settings }).settings;
      const limitMb = Number(sanitizedSettings?.limits?.storageMb || sanitizedSettings?.storageMb || 1024);
      const estimatedMb = Math.round(15.4 + row.transactionCount * 0.4 + row.serviceCount * 2.5 + row.userCount * 1.2 + row.branchCount * 5);
      const actualMb = row.storageUsedBytes == null ? null : Math.round(Number(row.storageUsedBytes) / 1048576);
      return { ...row, settings: sanitizedSettings, branding: row.branding, usage: { usedMb: actualMb ?? estimatedMb, limitMb, percent: Math.min(100, Number((((actualMb ?? estimatedMb) / Math.max(limitMb, 1)) * 100).toFixed(1))), source: actualMb == null ? "estimated" : "actual", measuredAt: row.storageMeasuredAt } };
    });
    res.json({ items, page, pageSize, total: Number(count.rows[0]?.count || 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateTenantConfig(req: Request, res: Response) {
  const parsed = tenantConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Konfigurasi tenant tidak valid." });

  try {
    const result = await dbTransaction(async (client) => {
      const locked = await client.query(`SELECT id,name,subdomain,status,tier,settings,branding,version FROM tenants WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const current = locked.rows[0];
      if (!current) return { code: 404, error: "Tenant tidak ditemukan." };
      if (current.version !== parsed.data.expectedVersion) return { code: 409, error: "Data tenant telah berubah. Muat ulang halaman." };

      const nextSettings = parsed.data.storageSettings
        ? { ...(current.settings || {}), storageSettings: parsed.data.storageSettings }
        : current.settings;
      const nextBranding = parsed.data.branding
        ? { ...(current.branding || {}), ...parsed.data.branding }
        : current.branding;
      const updated = await client.query(
        `UPDATE tenants SET name=COALESCE($2,name),subdomain=COALESCE($3,subdomain),status=COALESCE($4,status),tier=COALESCE($5,tier),settings=$6::jsonb,branding=$7::jsonb,version=version+1 WHERE id=$1 AND version=$8 RETURNING id,name,subdomain,status,tier,settings,branding,version`,
        [current.id, parsed.data.name ?? null, parsed.data.subdomain ?? null, parsed.data.status ?? null, parsed.data.tier ?? null, JSON.stringify(nextSettings), JSON.stringify(nextBranding), parsed.data.expectedVersion],
      );
      await adminAudit(client, req, "TENANT_CONFIG_UPDATED", "tenant", current.id, current.id,
        { name: current.name, subdomain: current.subdomain, status: current.status, tier: current.tier, branding: current.branding, storageSettings: current.settings?.storageSettings, version: current.version },
        { ...updated.rows[0], settings: undefined, storageSettings: updated.rows[0].settings?.storageSettings },
        { fields: Object.keys(parsed.data).filter((field) => field !== "expectedVersion") });
      return { tenant: redactTenantSettingsSecrets(updated.rows[0]) };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId: req.params.id }, "Tenant config update failed");
    if (err.code === "23505") return res.status(409).json({ error: "Subdomain sudah digunakan." });
    return res.status(500).json({ error: "Konfigurasi tenant gagal diperbarui." });
  }
}

export async function changeTenantStatus(req: Request, res: Response) {
  const { status, category, reason, internalNote, scheduledReactivationAt, notifyOwner = true, expectedVersion } = req.body || {};
  if (!["ACTIVE", "SUSPENDED"].includes(status) || !category?.trim() || !reason?.trim() || !Number.isInteger(expectedVersion)) {
    return res.status(422).json({ error: "Status, kategori, alasan, dan versi data wajib diisi." });
  }
  try {
    const result = await dbTransaction(async (client) => {
      const locked = await client.query(`SELECT * FROM tenants WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const tenant = locked.rows[0];
      if (!tenant) return { code: 404, error: "Tenant tidak ditemukan." };
      if (tenant.version !== expectedVersion) return { code: 409, error: "Data tenant telah berubah. Muat ulang halaman." };
      const updated = await client.query(
        `UPDATE tenants SET status=$2,status_category=$3,status_reason=$4,scheduled_reactivation_at=$5,
          version=version+1 WHERE id=$1 RETURNING id,name,status,status_category,status_reason,version,scheduled_reactivation_at,storage_used_bytes,storage_measured_at`,
        [tenant.id, status, category.trim(), reason.trim(), scheduledReactivationAt || null],
      );
      await client.query(`INSERT INTO tenant_status_history
        (tenant_id,previous_status,next_status,category,reason,internal_note,scheduled_reactivation_at,notify_owner,actor_user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tenant.id, tenant.status, status, category.trim(), reason.trim(), internalNote || null, scheduledReactivationAt || null, Boolean(notifyOwner), req.authActor?.userId]);
      await adminAudit(client, req, status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_REACTIVATED", "tenant", tenant.id, tenant.id, tenant, updated.rows[0], { category, notifyOwner });
      return { tenant: updated.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err: err.message }, "Tenant status change failed");
    res.status(500).json({ error: "Status tenant gagal diperbarui." });
  }
}

export async function startConsoleSession(req: Request, res: Response) {
  const mode = req.body?.mode === "EDIT" ? "EDIT" : "READ_ONLY";
  const durationMinutes = Math.min(120, Math.max(5, Number(req.body?.durationMinutes) || 60));
  try {
    const row = await dbQuery(
      `INSERT INTO superadmin_console_sessions(actor_user_id,mode,expires_at,client_ip,user_agent)
       VALUES ($1,$2,now()+($3||' minutes')::interval,$4,$5)
       RETURNING id,mode,started_at AS "startedAt",expires_at AS "expiresAt"`,
      [req.authActor?.userId, mode, durationMinutes, clientIp(req), String(req.headers["user-agent"] || "").slice(0, 500)],
    );
    res.status(201).json({ success: true, session: row.rows[0] });
  } catch (err: any) {
    logger.error({ err: err.message }, "Super Admin console session creation failed");
    res.status(500).json({ error: "Sesi konsol gagal dibuat." });
  }
}

export async function endConsoleSession(req: Request, res: Response) {
  try {
    const row = await dbQuery(
      `UPDATE superadmin_console_sessions SET ended_at=now()
       WHERE id=$1 AND actor_user_id=$2 AND ended_at IS NULL RETURNING id`,
      [req.params.id, req.authActor?.userId],
    );
    if (!row.rows[0]) return res.status(404).json({ error: "Sesi konsol aktif tidak ditemukan." });
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Super Admin console session end failed");
    res.status(500).json({ error: "Sesi konsol gagal diakhiri." });
  }
}

export async function startImpersonation(req: Request, res: Response) {
  const { reason, ticketId, accessMode = "READ_ONLY", durationMinutes = 30 } = req.body || {};
  if (!reason?.trim() || !["READ_ONLY", "FULL"].includes(accessMode) || durationMinutes < 5 || durationMinutes > 120) {
    return res.status(422).json({ error: "Alasan, mode akses, dan durasi 5-120 menit wajib valid." });
  }
  if (accessMode === "FULL") {
    const rolePermissions = req.authActor?.superadminRole
      ? await dbQuery(`SELECT permission FROM superadmin_role_permissions WHERE role=$1`, [req.authActor.superadminRole]).catch(() => ({ rows: [] } as any))
      : { rows: [] };
    const permissions = [...(req.authActor?.permissions || []), ...rolePermissions.rows.map((row: any) => row.permission)];
    if (!permissions.includes("*") && !permissions.includes("impersonation:full")) {
      return res.status(403).json({ error: "Izin impersonasi akses penuh diperlukan." });
    }
  }
  try {
    const result = await dbTransaction(async (client) => {
      const tenant = await client.query(`SELECT id,name FROM tenants WHERE id=$1`, [req.params.id]);
      if (!tenant.rows[0]) return { code: 404, error: "Tenant tidak ditemukan." };
      const session = await client.query(`INSERT INTO impersonation_sessions
        (actor_user_id,tenant_id,reason,ticket_id,access_mode,expires_at,client_ip)
        VALUES ($1,$2,$3,$4,$5,now()+($6||' minutes')::interval,$7)
        RETURNING id,tenant_id AS "tenantId",reason,ticket_id AS "ticketId",access_mode AS "accessMode",
          started_at AS "startedAt",expires_at AS "expiresAt"`,
        [req.authActor?.userId, req.params.id, reason.trim(), ticketId || null, accessMode, durationMinutes, clientIp(req)]);
      await adminAudit(client, req, "IMPERSONATION_STARTED", "impersonation_session", session.rows[0].id, req.params.id, null, session.rows[0], { ticketId });
      return { session: { ...session.rows[0], tenantName: tenant.rows[0].name } };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: "Sesi impersonasi gagal dibuat." });
  }
}

export async function endImpersonation(req: Request, res: Response) {
  try {
    const result = await dbTransaction(async (client) => {
      const ended = await client.query(`UPDATE impersonation_sessions SET ended_at=now(),end_reason=$3
        WHERE id=$1 AND actor_user_id=$2 AND ended_at IS NULL RETURNING *`,
        [req.params.id, req.authActor?.userId, String(req.body?.reason || "USER_EXIT")]);
      if (!ended.rows[0]) return { code: 404, error: "Sesi aktif tidak ditemukan." };
      await adminAudit(client, req, "IMPERSONATION_ENDED", "impersonation_session", req.params.id, ended.rows[0].tenant_id, null, ended.rows[0]);
      return { sessionId: req.params.id };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err: err.message }, "Super Admin impersonation end failed");
    res.status(500).json({ error: "Sesi impersonasi gagal diakhiri." }); }
}

export async function listAudit(req: Request, res: Response) {
  const { page, pageSize, offset } = pageArgs(req);
  const params: unknown[] = [];
  const clauses: string[] = [];
  const filters: Array<[string, string]> = [["tenantId", "effective_tenant_id"], ["actorId", "actor_user_id"], ["outcome", "outcome"], ["action", "action"]];
  for (const [query, column] of filters) if (req.query[query]) { params.push(req.query[query]); clauses.push(`${column}=$${params.length}`); }
  if (req.query.from) { params.push(req.query.from); clauses.push(`created_at >= $${params.length}`); }
  if (req.query.to) { params.push(req.query.to); clauses.push(`created_at <= $${params.length}`); }
  if (req.query.search) { params.push(`%${req.query.search}%`); clauses.push(`(action ILIKE $${params.length} OR resource_id ILIKE $${params.length} OR metadata::text ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    const count = await dbQuery(`SELECT COUNT(*)::int AS count FROM superadmin_audit_events ${where}`, params as any[]);
    params.push(pageSize, offset);
    const rows = await dbQuery(`SELECT a.*,u.name AS actor_name,t.name AS tenant_name
      FROM superadmin_audit_events a LEFT JOIN users u ON u.id=a.actor_user_id LEFT JOIN tenants t ON t.id=a.effective_tenant_id
      ${where} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params as any[]);
    res.json({ items: rows.rows, page, pageSize, total: Number(count.rows[0]?.count || 0) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function createBackupJob(req: Request, res: Response) {
  const { mode = "SNAPSHOT", fileName, sizeBytes, checksumSha256, summary = {}, schemaVersion = 1 } = req.body || {};
  if (!["SNAPSHOT", "RESTORE_DRY_RUN", "RESTORE"].includes(mode)) return res.status(422).json({ error: "Mode backup tidak valid." });
  if (mode === "RESTORE") return res.status(501).json({ error: "Eksekusi restore database belum tersedia. Jalankan dry-run lalu gunakan prosedur restore terkelola." });
  if (mode === "RESTORE_DRY_RUN" && (!summary || typeof summary !== "object" || !Number.isInteger(schemaVersion))) return res.status(422).json({ error: "Metadata snapshot tidak valid untuk dry-run." });
  try {
    const status = mode === "RESTORE_DRY_RUN" ? "VALIDATED" : "COMPLETED";
    const row = await dbQuery(`INSERT INTO backup_jobs
      (job_type,status,schema_version,file_name,size_bytes,checksum_sha256,summary,validation_result,created_by,completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,now()) RETURNING *`,
      [mode, status, schemaVersion, fileName || null, sizeBytes || null, checksumSha256 || null,
        JSON.stringify(summary), JSON.stringify({ valid: true, dryRun: mode === "RESTORE_DRY_RUN" }), req.authActor?.userId]);
    res.status(201).json({ success: true, job: row.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listBackupJobs(_req: Request, res: Response) {
  try { const result = await dbQuery(`SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT 50`); res.json({ jobs: result.rows }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listNotifications(req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT * FROM billing_internal_notifications
      WHERE audience_role='SUPER_ADMIN' OR audience_role IS NULL ORDER BY created_at DESC LIMIT 100`);
    res.json({ notifications: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function markNotificationRead(req: Request, res: Response) {
  try { await dbQuery(`UPDATE billing_internal_notifications SET read_at=now() WHERE id=$1`, [req.params.id]); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listOutbox(_req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT id,event_key,tenant_id AS "tenantId",channel,recipient,status,attempts,next_attempt_at AS "nextAttemptAt",sent_at AS "sentAt",last_error AS "lastError",created_at AS "createdAt" FROM billing_notification_outbox ORDER BY created_at DESC LIMIT 100`);
    res.json({ items: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function retryNotification(req: Request, res: Response) {
  try {
    const result = await dbTransaction(async (client) => {
      const row = await client.query(`UPDATE billing_notification_outbox SET status='PENDING',attempts=0,next_attempt_at=now(),last_error=NULL WHERE id=$1 AND status='FAILED' RETURNING id,tenant_id`, [req.params.id]);
      if (!row.rows[0]) return { code: 404, error: "Antrean gagal tidak ditemukan." };
      await adminAudit(client, req, "NOTIFICATION_RETRY_REQUESTED", "notification_outbox", req.params.id, row.rows[0].tenant_id, null, { status: "PENDING" });
      return { id: req.params.id };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listIncidents(_req: Request, res: Response) {
  try {
    const incidents = await dbQuery(`SELECT i.*,u.name AS acknowledged_by_name,r.name AS resolved_by_name FROM platform_incidents i LEFT JOIN users u ON u.id=i.acknowledged_by LEFT JOIN users r ON r.id=i.resolved_by ORDER BY i.opened_at DESC LIMIT 100`);
    const events = await dbQuery(`SELECT e.*,u.name AS actor_name FROM platform_incident_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.incident_id=ANY($1::uuid[]) ORDER BY e.created_at`, [incidents.rows.map((row: any) => row.id)]).catch(() => ({ rows: [] } as any));
    res.json({ incidents: incidents.rows.map((incident: any) => ({ ...incident, timeline: events.rows.filter((event: any) => event.incident_id === incident.id) })) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function createIncident(req: Request, res: Response) {
  const { component, severity, title, details } = req.body || {};
  if (!String(component || "").trim() || !["INFO", "WARNING", "CRITICAL"].includes(severity) || !String(title || "").trim()) return res.status(422).json({ error: "Komponen, severity, dan judul wajib valid." });
  try {
    const result = await dbTransaction(async (client) => {
      const row = await client.query(`INSERT INTO platform_incidents(component,severity,status,title,details) VALUES ($1,$2,'OPEN',$3,$4) RETURNING *`, [component.trim(), severity, title.trim(), details || null]);
      await client.query(`INSERT INTO platform_incident_events(incident_id,event_type,note,actor_user_id) VALUES ($1,'CREATED',$2,$3)`, [row.rows[0].id, details || null, req.authActor?.userId]);
      await adminAudit(client, req, "INCIDENT_CREATED", "platform_incident", row.rows[0].id, null, null, row.rows[0]);
      return { incident: row.rows[0] };
    });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function updateIncident(req: Request, res: Response) {
  const action = String(req.body?.action || "");
  const note = String(req.body?.note || "").trim() || null;
  if (!["ACKNOWLEDGE", "RESOLVE", "REOPEN", "NOTE"].includes(action)) return res.status(422).json({ error: "Aksi insiden tidak valid." });
  try {
    const result = await dbTransaction(async (client) => {
      const before = await client.query(`SELECT * FROM platform_incidents WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!before.rows[0]) return { code: 404, error: "Insiden tidak ditemukan." };
      let eventType = "NOTE";
      if (action === "ACKNOWLEDGE") { await client.query(`UPDATE platform_incidents SET acknowledged_at=now(),acknowledged_by=$2,version=version+1 WHERE id=$1`, [req.params.id, req.authActor?.userId]); eventType = "ACKNOWLEDGED"; }
      if (action === "RESOLVE") { await client.query(`UPDATE platform_incidents SET status='RESOLVED',resolved_at=now(),resolved_by=$2,version=version+1 WHERE id=$1`, [req.params.id, req.authActor?.userId]); eventType = "RESOLVED"; }
      if (action === "REOPEN") { await client.query(`UPDATE platform_incidents SET status='OPEN',resolved_at=NULL,resolved_by=NULL,version=version+1 WHERE id=$1`, [req.params.id]); eventType = "REOPENED"; }
      await client.query(`INSERT INTO platform_incident_events(incident_id,event_type,note,actor_user_id) VALUES ($1,$2,$3,$4)`, [req.params.id, eventType, note, req.authActor?.userId]);
      const after = await client.query(`SELECT * FROM platform_incidents WHERE id=$1`, [req.params.id]);
      await adminAudit(client, req, `INCIDENT_${eventType}`, "platform_incident", req.params.id, null, before.rows[0], after.rows[0], { note });
      return { incident: after.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function getAlertSettings(_req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT value FROM app_settings WHERE key='superadmin_alert_settings' LIMIT 1`);
    res.json({ settings: result.rows[0]?.value || { overdueEnabled: true, trialDays: 7, queueFailureEnabled: true, dailyReportHour: 8 } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function updateAlertSettings(req: Request, res: Response) {
  const settings = req.body || {};
  if (!Number.isInteger(settings.trialDays) || settings.trialDays < 1 || settings.trialDays > 30 || !Number.isInteger(settings.dailyReportHour) || settings.dailyReportHour < 0 || settings.dailyReportHour > 23) return res.status(422).json({ error: "Pengaturan alert tidak valid." });
  try {
    await dbQuery(`INSERT INTO app_settings(key,value,updated_at) VALUES ('superadmin_alert_settings',$1::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=$1::jsonb,updated_at=now()`, [JSON.stringify(settings)]);
    res.json({ success: true, settings });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listRolePermissions(_req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT role, array_agg(permission ORDER BY permission) AS permissions FROM superadmin_role_permissions GROUP BY role ORDER BY role`);
    res.json({ roles: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function updateRolePermissions(req: Request, res: Response) {
  const { role } = req.params;
  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((p: unknown) => typeof p === "string") : [];

  if (!/^[A-Z][A-Z0-9_]{2,31}$/.test(role)) {
    return res.status(422).json({ error: "Format role tidak valid." });
  }

  if (role === "ROOT_ADMIN" && req.authActor?.superadminRole !== "ROOT_ADMIN") {
    return res.status(403).json({ error: "Hanya ROOT_ADMIN yang dapat mengubah permission ROOT_ADMIN." });
  }
  if (permissions.includes("*") && role !== "ROOT_ADMIN") {
    return res.status(422).json({ error: "Permission wildcard (*) hanya diizinkan untuk ROOT_ADMIN." });
  }

  try {
    const result = await dbTransaction(async (client) => {
      const before = await client.query(`SELECT role, array_agg(permission ORDER BY permission) AS permissions FROM superadmin_role_permissions WHERE role=$1 GROUP BY role`, [role]);

      await client.query(`DELETE FROM superadmin_role_permissions WHERE role=$1`, [role]);
      for (const permission of permissions) {
        await client.query(`INSERT INTO superadmin_role_permissions(role,permission) VALUES ($1,$2)`, [role, permission]);
      }
      const after = { role, permissions };
      await adminAudit(client, req, "ROLE_PERMISSIONS_UPDATED", "superadmin_role", role, null, before.rows[0] || null, after, { role, permissions });
    });
    res.json({ success: true, role, permissions });
  } catch (err: any) {
    logger.error({ err: err.message }, "updateRolePermissions failed");
    res.status(500).json({ error: "Gagal memperbarui permission role." });
  }
}

export async function listSuperAdminUsers(_req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT id,name,email,superadmin_role AS "superadminRole",mfa_enabled AS "mfaEnabled",created_at AS "createdAt" FROM users WHERE role='SUPER_ADMIN' ORDER BY name,email`);
    res.json({ users: result.rows });
  } catch (err: any) {
    logger.error({ err: err.message }, "listSuperAdminUsers failed");
    res.status(500).json({ error: "Daftar user Super Admin gagal dimuat." });
  }
}

export async function assignSuperAdminRole(req: Request, res: Response) {
  const { userId } = req.params;
  const role = String(req.body?.role || "");

  if (!/^[A-Z][A-Z0-9_]{2,31}$/.test(role)) {
    return res.status(422).json({ error: "Format role tidak valid." });
  }

  try {
    const validRole = await dbQuery(`SELECT 1 FROM superadmin_role_permissions WHERE role=$1 LIMIT 1`, [role]);
    if (!validRole.rows[0]) return res.status(422).json({ error: "Role Super Admin tidak valid." });

    const result = await dbTransaction(async (client) => {
      const before = await client.query(`SELECT id,name,email,superadmin_role FROM users WHERE id=$1 AND role='SUPER_ADMIN' FOR UPDATE`, [userId]);
      if (!before.rows[0]) return { code: 404, error: "User Super Admin tidak ditemukan." };

      if (role === "ROOT_ADMIN" && req.authActor?.superadminRole !== "ROOT_ADMIN") {
        return { code: 403, error: "Hanya ROOT_ADMIN yang dapat menetapkan role ROOT_ADMIN." };
      }
      if (before.rows[0].id === req.authActor?.userId && role !== "ROOT_ADMIN") {
        return { code: 403, error: "ROOT_ADMIN tidak dapat menurunkan role dirinya sendiri." };
      }

      const after = await client.query(`UPDATE users SET superadmin_role=$2 WHERE id=$1 RETURNING id,name,email,superadmin_role AS "superadminRole"`, [userId, role]);
      await adminAudit(client, req, "SUPERADMIN_ROLE_ASSIGNED", "user", userId, null, before.rows[0], after.rows[0], { role });
      return { user: after.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err: err.message }, "assignSuperAdminRole failed");
    res.status(500).json({ error: "Gagal menetapkan role Super Admin." });
  }
}

export async function getTenantDetail(req: Request, res: Response) {
  try {
    const [tenant, users, invoices, statusHistory, impersonations, audit] = await Promise.all([
      dbQuery(`SELECT id,name,subdomain,status,tier,trial_ends_at AS "trialEndsAt",created_at AS "createdAt",settings,branding,version,status_reason AS "statusReason",scheduled_reactivation_at AS "scheduledReactivationAt",storage_used_bytes AS "storageUsedBytes",storage_measured_at AS "storageMeasuredAt" FROM tenants WHERE id=$1`, [req.params.id]),
      dbQuery(`SELECT id,name,email,role,mfa_enabled AS "mfaEnabled",created_at AS "createdAt" FROM users WHERE tenant_id=$1 ORDER BY created_at DESC`, [req.params.id]),
      dbQuery(`SELECT id,date,due_date AS "dueDate",amount,tier,status,billing_cycle AS "billingCycle",paid_at AS "paidAt",created_at AS "createdAt" FROM saas_invoices WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.params.id]).catch(() => ({ rows: [] } as any)),
      dbQuery(`SELECT previous_status AS "previousStatus",next_status AS "nextStatus",category,reason,internal_note AS "internalNote",created_at AS "createdAt" FROM tenant_status_history WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.params.id]),
      dbQuery(`SELECT id,reason,ticket_id AS "ticketId",access_mode AS "accessMode",started_at AS "startedAt",expires_at AS "expiresAt",ended_at AS "endedAt" FROM impersonation_sessions WHERE tenant_id=$1 ORDER BY started_at DESC LIMIT 50`, [req.params.id]),
      dbQuery(`SELECT id,action,outcome,resource_type AS "resourceType",resource_id AS "resourceId",created_at AS "createdAt",metadata FROM superadmin_audit_events WHERE effective_tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.params.id]),
    ]);
    if (!tenant.rows[0]) return res.status(404).json({ error: "Tenant tidak ditemukan." });
    res.json({ tenant: redactTenantSettingsSecrets(tenant.rows[0]), users: users.rows, invoices: invoices.rows, statusHistory: statusHistory.rows, impersonations: impersonations.rows, audit: audit.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function listInvitations(req: Request, res: Response) {
  try {
    const result = await dbQuery(`SELECT id,tenant_id AS "tenantId",email,name,role,token_prefix AS "tokenPrefix",expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt",created_at AS "createdAt" FROM tenant_invitations WHERE tenant_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ invitations: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function revokeInvitation(req: Request, res: Response) {
  try {
    const row = await dbQuery(`UPDATE tenant_invitations SET revoked_at=now() WHERE id=$1 AND tenant_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`, [req.params.invitationId, req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: "Undangan aktif tidak ditemukan." });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function checkTenantAvailability(req: Request, res: Response) {
  const subdomain = String(req.query.subdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!subdomain && !email) return res.status(422).json({ error: "Subdomain atau email wajib diisi." });
  try {
    const [tenant, user, invitation] = await Promise.all([
      subdomain ? dbQuery(`SELECT 1 FROM tenants WHERE subdomain=$1 LIMIT 1`, [subdomain]) : Promise.resolve({ rows: [] }),
      email ? dbQuery(`SELECT 1 FROM users WHERE lower(email)=$1 LIMIT 1`, [email]) : Promise.resolve({ rows: [] }),
      email ? dbQuery(`SELECT 1 FROM tenant_invitations WHERE lower(email)=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() LIMIT 1`, [email]) : Promise.resolve({ rows: [] }),
    ]);
    res.json({ subdomainAvailable: subdomain ? !tenant.rows[0] : null, emailAvailable: email ? !user.rows[0] && !invitation.rows[0] : null });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

export async function registerTenant(req: Request, res: Response) {
  const { name, subdomain, ownerName, ownerEmail, tier = "PRO", idempotencyKey } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanSubdomain = String(subdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const cleanOwnerName = String(ownerName || "").trim();
  const cleanOwnerEmail = String(ownerEmail || "").trim().toLowerCase();
  if (!cleanName || !cleanSubdomain || !cleanOwnerName || !cleanOwnerEmail.includes("@") || !["BASIC", "PRO", "ENTERPRISE"].includes(tier) || !/^[0-9a-f-]{36}$/i.test(String(idempotencyKey || ""))) {
    return res.status(422).json({ error: "Nama, subdomain, owner, email, paket, dan idempotency key wajib valid." });
  }

  const planLimits: Record<string, { users: number; branches: number; storageMb: number; features: string[] }> = {
    BASIC: { users: 3, branches: 1, storageMb: 500, features: ["POS", "SERVICE"] },
    PRO: { users: 15, branches: 5, storageMb: 2048, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM"] },
    ENTERPRISE: { users: 100, branches: 20, storageMb: 10240, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM", "MARKETPLACE", "RENTAL", "SECURITY"] },
  };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const existingRequest = await dbQuery(`SELECT t.*,i.id AS invitation_id,i.expires_at AS invitation_expires_at FROM tenants t LEFT JOIN tenant_invitations i ON i.tenant_id=t.id WHERE t.registration_key=$1 ORDER BY i.created_at DESC LIMIT 1`, [idempotencyKey]);
    if (existingRequest.rows[0]) {
      const row = existingRequest.rows[0];
      return res.status(200).json({ success: true, replayed: true, tenant: row, invitation: { id: row.invitation_id, expiresAt: row.invitation_expires_at } });
    }
    const result = await dbTransaction(async (client) => {
      const duplicate = await client.query(`SELECT id FROM tenants WHERE subdomain=$1`, [cleanSubdomain]);
      if (duplicate.rows[0]) return { code: 409, error: "Subdomain sudah digunakan." };
      const duplicateEmail = await client.query(`SELECT id FROM users WHERE lower(email)=$1`, [cleanOwnerEmail]);
      if (duplicateEmail.rows[0]) return { code: 409, error: "Email owner sudah terdaftar." };

      const tenantId = randomUUID();
      const branchId = randomUUID();
      const tenant = await client.query(
        `INSERT INTO tenants (id,name,subdomain,status,tier,trial_ends_at,settings,branding,registration_key,created_at)
         VALUES ($1,$2,$3,'TRIAL',$4,now()+interval '30 days',$5::jsonb,$6::jsonb,$7,now())
         RETURNING *`,
        [tenantId, cleanName, cleanSubdomain, tier,
          JSON.stringify({ baseCurrency: "IDR", limits: planLimits[tier], authSettings: { requireMfa: false, passwordPolicy: "medium" }, taxSettings: { taxEnabled: true, taxRate: 11, taxInclusive: false } }),
          JSON.stringify({ primaryColor: "#1e3a8a", accentColor: "#3b82f6", whiteLabelEnabled: tier === "ENTERPRISE" }), idempotencyKey],
      );
      await client.query(`INSERT INTO branches (id,tenant_id,name,address,phone,is_active,created_at) VALUES ($1,$2,$3,$4,'',true,now())`, [branchId, tenantId, `Cabang Utama ${cleanName}`, `Alamat Utama ${cleanName}`]);
      await client.query(`INSERT INTO warehouses (id,tenant_id,branch_id,name,location,created_at) VALUES ($1,$2,$3,'Gudang Utama','Lokasi utama',now())`, [randomUUID(), tenantId, branchId]);
      const coa = [["10100", "Kas Utama", "ASSET"], ["10200", "Bank Utama", "ASSET"], ["10300", "Piutang Pelanggan", "ASSET"], ["10500", "Persediaan Barang", "ASSET"], ["40100", "Pendapatan Jasa Servis", "REVENUE"], ["40200", "Pendapatan Penjualan", "REVENUE"], ["50100", "HPP Sparepart", "EXPENSE"], ["60100", "Beban Gaji", "EXPENSE"]];
      for (const [code, accountName, type] of coa) await client.query(`INSERT INTO coa_accounts (id,tenant_id,code,name,type,balance) VALUES ($1,$2,$3,$4,$5,0)`, [randomUUID(), tenantId, code, accountName, type]);
      const invitation = await client.query(
        `INSERT INTO tenant_invitations (tenant_id,email,name,token_hash,token_prefix,created_by,expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,now()+interval '48 hours')
         RETURNING id,tenant_id AS "tenantId",email,name,expires_at AS "expiresAt"`,
        [tenantId, cleanOwnerEmail, cleanOwnerName, tokenHash, token.slice(0, 8), req.authActor?.userId],
      );
      await client.query(`INSERT INTO billing_notification_outbox (event_key,tenant_id,channel,recipient,payload,status) VALUES ($1,$2,'INTERNAL',$3,$4::jsonb,'PENDING') ON CONFLICT(event_key,channel,recipient) DO NOTHING`, [`tenant_invitation:${invitation.rows[0].id}`, tenantId, cleanOwnerEmail, JSON.stringify({ type: "TENANT_INVITATION", invitationToken: token, tenantName: cleanName, ownerName: cleanOwnerName, expiresAt: invitation.rows[0].expiresAt })]);
      await adminAudit(client, req, "TENANT_REGISTERED", "tenant", tenantId, tenantId, null, tenant.rows[0], { invitationId: invitation.rows[0].id, ownerEmail: cleanOwnerEmail });
      return { tenant: tenant.rows[0], branchId, invitation: invitation.rows[0] };
    });
    if ((result as any).error) return res.status((result as any).code).json({ error: (result as any).error });
    const deliveryQueued = await sendInvitationEmail(cleanOwnerEmail, cleanOwnerName, cleanName, token, (result as any).invitation.expiresAt).catch((err) => { logger.warn({ err: err.message }, "Invitation email delivery failed; retained in outbox"); return false; });
    return res.status(201).json({ success: true, ...result, delivery: deliveryQueued ? "EMAIL_SENT" : "OUTBOX_PENDING" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Tenant registration failed");
    return res.status(500).json({ error: "Registrasi tenant gagal." });
  }
}

export async function createTenantInvitation(req: Request, res: Response) {
  const { name, email, expiresInHours = 48 } = req.body || {};
  if (!name?.trim() || !email?.includes("@")) return res.status(422).json({ error: "Nama dan email valid wajib diisi." });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const row = await dbQuery(`INSERT INTO tenant_invitations
      (tenant_id,email,name,token_hash,token_prefix,created_by,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,now()+($7||' hours')::interval)
      RETURNING id,tenant_id AS "tenantId",email,name,token_prefix AS "tokenPrefix",expires_at AS "expiresAt",created_at AS "createdAt"`,
      [req.params.id, String(email).toLowerCase().trim(), name.trim(), tokenHash, token.slice(0, 8), req.authActor?.userId, Math.min(168, Math.max(1, expiresInHours))]);
    const tenant = await dbQuery(`SELECT name FROM tenants WHERE id=$1`, [req.params.id]);
    await dbQuery(`INSERT INTO billing_notification_outbox(event_key,tenant_id,channel,recipient,payload,status) VALUES ($1,$2,'INTERNAL',$3,$4::jsonb,'PENDING') ON CONFLICT(event_key,channel,recipient) DO NOTHING`, [`tenant_invitation:${row.rows[0].id}`, req.params.id, row.rows[0].email, JSON.stringify({ type: "TENANT_INVITATION", invitationToken: token, tenantName: tenant.rows[0]?.name, ownerName: row.rows[0].name, expiresAt: row.rows[0].expiresAt })]);
    const sent = await sendInvitationEmail(row.rows[0].email, row.rows[0].name, tenant.rows[0]?.name || "Tenant", token, row.rows[0].expiresAt).catch(() => false);
    res.status(201).json({ success: true, invitation: row.rows[0], delivery: sent ? "EMAIL_SENT" : "OUTBOX_PENDING" });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Undangan aktif untuk email ini sudah tersedia." });
    res.status(500).json({ error: err.message });
  }
}
