import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.replace(/^\//, "")
  : "";
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (
  process.env.NODE_ENV !== "test" &&
  process.env.ALLOW_DB_MIGRATIONS !== "1"
) {
  throw new Error("Migrations require NODE_ENV=test or ALLOW_DB_MIGRATIONS=1.");
}
if (databaseName === "production") {
  throw new Error("Refusing migration on protected database: production");
}
if (
  process.env.NODE_ENV === "test" &&
  !["fixdev_e2e", "fixdev_test"].includes(databaseName)
) {
  throw new Error(
    "Test migrations only permit dedicated fixdev_e2e or fixdev_test database.",
  );
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: false });
const client = await pool.connect();
const files = fs
  .readdirSync("migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
try {
  await client.query("BEGIN");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  for (const filename of files) {
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE filename=$1",
      [filename],
    );
    if (applied.rowCount) continue;
    await client.query(
      fs.readFileSync(path.join("migrations", filename), "utf8"),
    );
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
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
