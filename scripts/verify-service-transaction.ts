import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query("BEGIN");
try {
  const scope = await client.query(
    "SELECT t.id AS tenant_id, b.id AS branch_id FROM tenants t JOIN branches b ON b.tenant_id=t.id LIMIT 1",
  );
  if (!scope.rows[0]) throw new Error("No tenant/branch available");
  const { tenant_id: tenantId, branch_id: branchId } = scope.rows[0];
  const customer = await client.query(
    `INSERT INTO customers(id,tenant_id,name,phone,normalized_phone)
     VALUES(gen_random_uuid(),$1,'Workflow Rollback Test','628999000111','628999000111')
     ON CONFLICT(tenant_id,normalized_phone) WHERE normalized_phone IS NOT NULL AND normalized_phone <> ''
     DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    [tenantId],
  );
  const ticket = await client.query(
    `INSERT INTO service_tickets(id,tenant_id,branch_id,ticket_no,customer_id,device_name,customer_complaints,status,timeline)
     VALUES(gen_random_uuid(),$1,$2,'TKT/TEST/ROLLBACK',$3,'Test Unit','Test complaint','DITERIMA','[]') RETURNING id`,
    [tenantId, branchId, customer.rows[0].id],
  );
  await client.query(
    `INSERT INTO service_status_events(tenant_id,ticket_id,from_status,to_status,note)
     VALUES($1,$2,'DITERIMA','DIAGNOSA','Rollback verification')`,
    [tenantId, ticket.rows[0].id],
  );
  const verified = await client.query(
    "SELECT COUNT(*)::int AS count FROM service_status_events WHERE ticket_id=$1",
    [ticket.rows[0].id],
  );
  console.log(JSON.stringify({ transactionalWorkflowWrite: verified.rows[0].count === 1, rolledBack: true }));
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
