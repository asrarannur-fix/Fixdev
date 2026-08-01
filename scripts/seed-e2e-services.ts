import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;

if (
  process.env.NODE_ENV !== "test" ||
  process.env.E2E_SEED_CONFIRM !== "devtes"
) {
  throw new Error(
    "E2E seed requires NODE_ENV=test and E2E_SEED_CONFIRM=devtes.",
  );
}
if (!databaseUrl || !email || !password)
  throw new Error(
    "DATABASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD are required.",
  );

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "");
if (!["fixdev_e2e", "fixdev_test"].includes(databaseName)) {
  throw new Error(
    "E2E seed only permits dedicated fixdev_e2e or fixdev_test database.",
  );
}

const ids = {
  tenant: "00000000-0000-4000-8000-000000000101",
  branch: "00000000-0000-4000-8000-000000000102",
  warehouse: "00000000-0000-4000-8000-000000000103",
  user: "00000000-0000-4000-8000-000000000104",
  ready: "00000000-0000-4000-8000-000000000105",
  done: "00000000-0000-4000-8000-000000000106",
  readyTrackingToken: "00000000-0000-4000-8000-000000000107",
  doneTrackingToken: "00000000-0000-4000-8000-000000000108",
};
const pool = new Pool({ connectionString: databaseUrl, ssl: false });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "fixdev-e2e-devtes",
  ]);
  const passwordHash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO tenants (id,name,subdomain,status,tier,settings)
     VALUES ($1,'Fixdev E2E','devtes','ACTIVE','ENTERPRISE',$2::jsonb)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,subdomain=EXCLUDED.subdomain,status=EXCLUDED.status,settings=EXCLUDED.settings`,
    [ids.tenant, JSON.stringify({ e2eSeed: "fixdev-devtes-v1" })],
  );
  await client.query(
    `INSERT INTO branches (id,tenant_id,name,is_active) VALUES ($1,$2,'E2E Branch',true)
     ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,name=EXCLUDED.name,is_active=true`,
    [ids.branch, ids.tenant],
  );
  await client.query(
    `INSERT INTO warehouses (id,tenant_id,branch_id,name) VALUES ($1,$2,$3,'E2E Warehouse')
     ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,branch_id=EXCLUDED.branch_id,name=EXCLUDED.name`,
    [ids.warehouse, ids.tenant, ids.branch],
  );
  await client.query(
    `INSERT INTO users (id,tenant_id,email,name,role,permissions,password_hash)
      VALUES ($1,$2,$3,'E2E Owner','OWNER','{}',$4)
      ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role,password_hash=EXCLUDED.password_hash`,
    [ids.user, ids.tenant, email, passwordHash],
  );
  await client.query(
    `INSERT INTO user_branches (user_id,branch_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [ids.user, ids.branch],
  );
  for (const ticket of [
    [ids.ready, "E2E-DEVTES-READY", "SIAP_DIAMBIL", "E2E Ready Pickup", ids.readyTrackingToken],
    [ids.done, "E2E-DEVTES-DONE", "SELESAI", "E2E Technically Complete", ids.doneTrackingToken],
  ]) {
    await client.query(
      `INSERT INTO service_tickets (id,tenant_id,branch_id,ticket_no,device_name,status,estimated_cost,public_tracking_token,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,250000,$7,NOW())
       ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,branch_id=EXCLUDED.branch_id,ticket_no=EXCLUDED.ticket_no,device_name=EXCLUDED.device_name,status=EXCLUDED.status,estimated_cost=EXCLUDED.estimated_cost,public_tracking_token=EXCLUDED.public_tracking_token`,
      [ticket[0], ids.tenant, ids.branch, ticket[1], ticket[3], ticket[2], ticket[4]],
    );
  }
  await client.query("COMMIT");
  console.log("E2E service seed ready: devtes");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
