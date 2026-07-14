import { Request, Response } from "express";
import pg from "pg";
const { Client } = pg;

export async function supabaseTestHandler(req: Request, res: Response) {
  const { dbUrl } = req.body;
  if (!dbUrl) return res.status(400).json({ success: false, message: "Direct Database URL is required." });
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const result = await client.query("SELECT version();");
    await client.end();
    return res.json({ success: true, message: "Berhasil terhubung ke PostgreSQL database!", details: result.rows[0]?.version || "Koneksi berhasil." });
  } catch (error: any) {
    try { await client.end(); } catch (_) {}
    return res.status(500).json({ success: false, message: "Gagal menghubungkan ke database PostgreSQL.", details: error.message });
  }
}

export async function runPendingMigrations(connectionString: string) {
  const logs: string[] = [];
  const addLogLine = (line: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
  const client = new Client({ connectionString });
  try {
    const { readFileSync, readdirSync } = await import("fs");
    const { join } = await import("path");
    const { createHash } = await import("crypto");
    const migrationDir = join(process.cwd(), "migrations");
    const files = readdirSync(migrationDir).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    await client.connect();
    const existingBilling = await client.query(`SELECT to_regclass('public.saas_invoices') AS invoices, to_regclass('public.app_settings') AS settings`);
    const migrationFiles = existingBilling.rows[0]?.invoices && existingBilling.rows[0]?.settings
      ? files.filter((name) => name !== "005_billing.sql")
      : files;
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await client.query("SELECT pg_advisory_lock(hashtext('fixdev_schema_migrations'))");
    for (const file of migrationFiles) {
      const sql = readFileSync(join(migrationDir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = await client.query("SELECT checksum FROM schema_migrations WHERE version = $1", [file]);
      if (applied.rows[0]) {
        if (applied.rows[0].checksum !== checksum) throw new Error(`Checksum migration berubah: ${file}`);
        addLogLine(`Lewati ${file} (sudah diterapkan).`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)", [file, checksum]);
        await client.query("COMMIT");
        addLogLine(`Migration ${file} berhasil.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    await client.query("SELECT pg_advisory_unlock(hashtext('fixdev_schema_migrations'))");
    await client.end();
    return logs;
  } catch (error) {
    try { await client.query("SELECT pg_advisory_unlock(hashtext('fixdev_schema_migrations'))"); } catch {}
    try { await client.end(); } catch {}
    throw error;
  }
}

export async function supabaseMigrateHandler(_req: Request, res: Response) {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    return res.status(503).json({ success: false, message: "Server database URL is not configured." });
  }
  try {
    const logs = await runPendingMigrations(connectionString);
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
