import dotenv from "dotenv";
import bcrypt from "bcrypt";
import pg from "pg";
import { randomUUID } from "node:crypto";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env", override: false });

const nodeEnv = process.env.NODE_ENV || "development";
if (nodeEnv === "production") throw new Error("Dev superadmin seed disabled in production.");
const email = process.env.TEST_SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.TEST_SUPERADMIN_PASSWORD;
const connectionString = process.env.DATABASE_URL;
if (!email || !password || !connectionString) throw new Error("TEST_SUPERADMIN_EMAIL, TEST_SUPERADMIN_PASSWORD, and DATABASE_URL are required.");

const pool = new pg.Pool({ connectionString, ssl: false });
try {
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS name");
    if (database.rows[0]?.name !== "fixdev_dev") throw new Error("Dev superadmin seed requires current_database()=fixdev_dev.");
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (id, tenant_id, email, name, role, permissions, password_hash, superadmin_role, created_at)
       VALUES ($1, NULL, $2, 'Test Super Admin', 'SUPER_ADMIN', ARRAY['*'], $3, 'ROOT_ADMIN', now())
       ON CONFLICT (email) DO UPDATE SET
         tenant_id = NULL, name = EXCLUDED.name, role = EXCLUDED.role,
         permissions = EXCLUDED.permissions, password_hash = EXCLUDED.password_hash,
         superadmin_role = EXCLUDED.superadmin_role
       RETURNING id`,
      [randomUUID(), email, passwordHash],
    );
    console.log(`Development SUPER_ADMIN ready: ${result.rows[0].id}`);
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
