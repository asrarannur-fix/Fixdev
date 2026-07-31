import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const envPath = process.env.DOTENV_CONFIG_PATH;
if (envPath) dotenv.config({ path: envPath, override: true });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const database = new URL(databaseUrl);
if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname) {
  throw new Error("DATABASE_URL must be a PostgreSQL URL with a host.");
}
const databaseName = database.pathname.replace(/^\//, "");
const expectedDatabaseName = process.env.FIXDEV_DATABASE_NAME;
if (!expectedDatabaseName || databaseName !== expectedDatabaseName) {
  throw new Error("DATABASE_URL database must exactly match FIXDEV_DATABASE_NAME.");
}
const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";
if (!isTest && process.env.ALLOW_DB_MIGRATIONS !== "1") {
  throw new Error("Migrations require NODE_ENV=test or ALLOW_DB_MIGRATIONS=1.");
}
if (isProduction && (process.env.FIXDEV_PROFILE !== "production" || !envPath)) {
  throw new Error("Production migrations require FIXDEV_PROFILE=production and DOTENV_CONFIG_PATH.");
}
if (isTest && !["fixdev_e2e", "fixdev_test"].includes(databaseName)) {
  throw new Error("Test migrations only permit dedicated fixdev_e2e or fixdev_test database.");
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: false });
const client = await pool.connect();
const files = fs
  .readdirSync("migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('fixdev_schema_migrations'))");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, checksum TEXT, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  const columns = await client.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'schema_migrations'",
  );
  const names = new Set(columns.rows.map((row) => row.column_name));
  if (names.has("filename") && !names.has("version")) {
    await client.query("ALTER TABLE schema_migrations RENAME COLUMN filename TO version");
  }
  await client.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
  for (const filename of files) {
    const sql = fs.readFileSync(path.join("migrations", filename), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await client.query<{ checksum: string | null }>(
      "SELECT checksum FROM schema_migrations WHERE version=$1",
      [filename],
    );
    if (applied.rowCount) {
      if (applied.rows[0].checksum && applied.rows[0].checksum !== checksum) {
        throw new Error(`Migration checksum changed: ${filename}`);
      }
      if (!applied.rows[0].checksum) {
        await client.query("UPDATE schema_migrations SET checksum=$2 WHERE version=$1", [filename, checksum]);
      }
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)", [filename, checksum]);
    console.log(`Applied ${filename}`);
  }
  await client.query("COMMIT");
  console.log(`Migration complete: ${databaseName}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
