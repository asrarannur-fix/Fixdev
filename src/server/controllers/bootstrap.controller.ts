/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Request, Response } from "express";
import { getPool } from "../../lib/db.js";
import { toApiResponse } from "../utils/responseTransform.js";
import { redactScreenLockPin } from "../lib/screenLockPin.js";

export function sanitizeServiceTicketsForBootstrap(tickets: Record<string, any>[]) {
  return tickets.map(redactScreenLockPin);
}

export function redactTenantSettingsSecrets(tenant: Record<string, any>) {
  const settings = tenant.settings || {};
  const emailSettings = { ...(settings.emailSettings || {}) };
  const notificationSettings = { ...(settings.notificationSettings || {}) };
  const waConfig = { ...(settings.waConfig || {}) };
  const smtpConfigured = Boolean(emailSettings.smtpPass);
  const telegramConfigured = Boolean(notificationSettings.telegramBotToken);
  const waConfigured = Boolean(waConfig.apiToken || waConfig.webhookSecret || waConfig.whatsappKey);
  delete emailSettings.smtpPass;
  delete notificationSettings.telegramBotToken;
  delete waConfig.apiToken;
  delete waConfig.webhookSecret;
  delete waConfig.whatsappKey;
  return { ...tenant, settings: { ...settings, emailSettings: { ...emailSettings, smtpConfigured }, notificationSettings: { ...notificationSettings, telegramConfigured }, waConfig: { ...waConfig, credentialsConfigured: waConfigured } } };
}

export async function platformBootstrapHandler(req: Request, res: Response) {
  if (req.authActor?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Super Admin access is required." });
  }
  try {
    const pool = getPool();
    const [tenants, users, auditLogs] = await Promise.all([
      pool.query(`select id, name, subdomain, status, tier, trial_ends_at, created_at, version, status_reason, scheduled_reactivation_at, storage_used_bytes, storage_measured_at from tenants order by created_at desc`),
      pool.query(`select id, tenant_id, email, name, role, permissions, mfa_enabled, auth_id, created_at from users order by created_at desc`),
      pool.query(`select * from audit_logs order by created_at desc limit 500`).catch(() => ({ rows: [] })),
    ]);
    res.json(toApiResponse({ tenants: tenants.rows, users: users.rows, auditLogs: auditLogs.rows }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function bootstrapHandler(req: Request, res: Response) {
  const tenantId = req.tenantId || "";
  if (!tenantId) return res.status(401).json({ error: "Tenant auth context is required" });
  try {
    const pool = getPool();
    const data = await Promise.allSettled([
      pool.query(`select * from tenants where id = $1`, [tenantId]),
      pool.query(`select id, tenant_id, email, name, role, permissions, mfa_enabled, auth_id, created_at, superadmin_role from users where tenant_id = $1`, [tenantId]),
      pool.query(`select ub.* from user_branches ub join branches b on b.id = ub.branch_id where b.tenant_id = $1`, [tenantId]),
      pool.query(`select * from branches where tenant_id = $1`, [tenantId]),
      pool.query(`select * from warehouses where branch_id in (select id from branches where tenant_id = $1)`, [tenantId]),
      pool.query(`select * from customers where tenant_id = $1`, [tenantId]),
      pool.query(`select * from products where tenant_id = $1`, [tenantId]),
      pool.query(`select ps.* from product_stock ps join products p on p.id = ps.product_id where p.tenant_id = $1`, [tenantId]),
      pool.query(`select * from service_tickets where tenant_id = $1 LIMIT 500`, [tenantId]),
      pool.query(`select * from pos_transactions where tenant_id = $1 LIMIT 500`, [tenantId]),
      pool.query(`select ps.* from pos_shifts ps join branches b on b.id = ps.branch_id where b.tenant_id = $1`, [tenantId]),
      pool.query(`select * from coa_accounts where tenant_id = $1`, [tenantId]),
      pool.query(`select * from journal_entries where tenant_id = $1 LIMIT 500`, [tenantId]),
      pool.query(`select jl.* from journal_lines jl join journal_entries je on je.id = jl.journal_entry_id where je.tenant_id = $1`, [tenantId]),
      pool.query(`select * from audit_logs where tenant_id = $1 LIMIT 500`, [tenantId]),
      pool.query(`select * from module_records where tenant_id = $1 LIMIT 500`, [tenantId]),
    ]).then((results) => ({
       tenants: results[0].status === 'fulfilled' ? results[0].value.rows.map(redactTenantSettingsSecrets) : [],
      users: results[1].status === 'fulfilled' ? results[1].value.rows : [],
      userBranches: results[2].status === 'fulfilled' ? results[2].value.rows : [],
      branches: results[3].status === 'fulfilled' ? results[3].value.rows : [],
      warehouses: results[4].status === 'fulfilled' ? results[4].value.rows : [],
      customers: results[5].status === 'fulfilled' ? results[5].value.rows : [],
      products: results[6].status === 'fulfilled' ? results[6].value.rows : [],
      productStock: results[7].status === 'fulfilled' ? results[7].value.rows : [],
      serviceTickets: results[8].status === 'fulfilled' ? sanitizeServiceTicketsForBootstrap(results[8].value.rows) : [],
      posTransactions: results[9].status === 'fulfilled' ? results[9].value.rows : [],
      posShifts: results[10].status === 'fulfilled' ? results[10].value.rows : [],
      coaAccounts: results[11].status === 'fulfilled' ? results[11].value.rows : [],
      journalEntries: results[12].status === 'fulfilled' ? results[12].value.rows : [],
      journalLines: results[13].status === 'fulfilled' ? results[13].value.rows : [],
      auditLogs: results[14].status === 'fulfilled' ? results[14].value.rows : [],
      moduleRecords: results[15].status === 'fulfilled' ? results[15].value.rows : [],
    }));
    res.json(toApiResponse(data));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
