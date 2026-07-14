import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID } from "crypto";

const email = process.env.TEST_SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.TEST_SUPERADMIN_PASSWORD;
const allowProduction = process.env.ALLOW_PRODUCTION_TEST_ACCOUNT === "true";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !allowProduction) {
  throw new Error("Refusing to provision a test account in production without ALLOW_PRODUCTION_TEST_ACCOUNT=true.");
}
if (!email || !password) {
  throw new Error("TEST_SUPERADMIN_EMAIL and TEST_SUPERADMIN_PASSWORD are required.");
}
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_DB_URL) {
  throw new Error("Supabase URL, service role key, and database URL are required.");
}

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
let authUser = listed.data.users.find((user) => user.email?.toLowerCase() === email);

if (authUser) {
  const updated = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
  });
  if (updated.error) throw updated.error;
  authUser = updated.data.user;
} else {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  authUser = created.data.user;
}

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, connectionTimeoutMillis: 7000 });
try {
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, name, role, permissions, mfa_enabled, auth_id, created_at, superadmin_role)
     VALUES ($1, NULL, $2, 'Integration Test Super Admin', 'SUPER_ADMIN', ARRAY['*'], false, $3, now(), 'ROOT_ADMIN')
     ON CONFLICT (email) DO UPDATE SET
       tenant_id = NULL,
       name = EXCLUDED.name,
       role = 'SUPER_ADMIN',
       permissions = ARRAY['*']::text[],
       superadmin_role = 'ROOT_ADMIN',
       auth_id = EXCLUDED.auth_id`,
    [randomUUID(), email, authUser.id],
  );
  const verification = await pool.query(
    "SELECT role, auth_id = $1 AS mapped FROM users WHERE email = $2 LIMIT 1",
    [authUser.id, email],
  );
  if (verification.rows[0]?.role !== "SUPER_ADMIN" || !verification.rows[0]?.mapped) {
    throw new Error("Test Super Admin profile mapping verification failed.");
  }
  console.log("Integration Test Super Admin provisioned and mapped successfully.");
} finally {
  await pool.end();
}
