import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID } from "crypto";

const email = `audit-${Date.now()}@fixdev.audit`;
const password = `Audit${Math.random().toString(36).slice(2, 10)}X9!`;
const TENANT_NAME = `AuditTenant-${Date.now()}`;

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, connectionTimeoutMillis: 7000 });

async function main() {
  // 1. Create auth user
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const authId = created.data.user!.id;
  console.log("Auth user:", authId);

  // 2. Create tenant
  const tenantId = randomUUID();
  await pool.query(
    `INSERT INTO tenants (id, name, subdomain, status, tier, trial_ends_at, settings, branding, created_at)
     VALUES ($1, $2, $3, 'ACTIVE', 'PRO', NOW() + INTERVAL '30 days', '{}', '{}', NOW())`,
    [tenantId, TENANT_NAME, `audit-${Date.now()}`],
  );

  // 3. Create branch + warehouse
  const branchId = randomUUID();
  const warehouseId = randomUUID();
  await pool.query(
    `INSERT INTO branches (id, tenant_id, name, address, is_active, created_at)
     VALUES ($1, $2, 'Cabang Audit', 'Audit', true, NOW())`,
    [branchId, tenantId],
  );
  await pool.query(
    `INSERT INTO warehouses (id, tenant_id, branch_id, name, location, created_at)
     VALUES ($1, $2, $3, 'Gudang Audit', 'Audit', NOW())`,
    [warehouseId, tenantId, branchId],
  );

  // 4. Create app user (OWNER)
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, name, role, permissions, mfa_enabled, auth_id, created_at)
     VALUES ($1, $2, $3, 'Audit Owner', 'OWNER', ARRAY['*'], false, $4, NOW())`,
    [randomUUID(), tenantId, email, authId],
  );

  // 5. Seed COA minimal (cash 10100, sales 40100, tax 20100, hpp 50100, inventory 10200)
  // Note: production schema has no 'created_at' column in coa_accounts
  const coa = [
    ["10100", "Kas", "ASSET"],
    ["10200", "Persediaan", "ASSET"],
    ["20100", "Pajak Terutang", "LIABILITY"],
    ["40100", "Pendapatan Penjualan", "REVENUE"],
    ["50100", "Harga Pokok Penjualan", "EXPENSE"],
  ];
  for (const [code, name, type] of coa) {
    await pool.query(
      `INSERT INTO coa_accounts (id, tenant_id, code, name, type, balance)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [randomUUID(), tenantId, code, name, type],
    );
  }

  console.log(JSON.stringify({ email, password, tenantId, branchId, warehouseId }, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error("PROVISION ERROR:", e.message);
  await pool.end();
  process.exit(1);
});