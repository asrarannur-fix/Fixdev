const fs = require('fs');
const { Client } = require('pg');

(async () => {
  const file = 'migrations/019_service_schema_fixes.sql';
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    const checks = await client.query(`SELECT
      (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_queue' AND column_name='scheduled_time') AS wq_scheduled_time,
      (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='service_stock_movements' AND column_name='movement_type') AS sm_movement,
      (SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='service_stock_movements' AND constraint_type='UNIQUE' AND constraint_name='service_stock_movements_ticket_id_product_id_warehouse_id_m_key') AS sm_uniq,
      (SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='whatsapp_queue' AND indexname='idx_whatsapp_queue_tenant_status') AS wq_idx`);
    await client.query('COMMIT');
    console.log(JSON.stringify({ applied: file, checks: checks.rows[0] }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('MIGRATION_019_FAILED', error.code || '', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error('CONNECTION_FAILED', error.code || '', error.message);
  process.exitCode = 1;
});
// no secrets are printed
