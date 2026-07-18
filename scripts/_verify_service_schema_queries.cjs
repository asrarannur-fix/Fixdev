const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const queries = {
    ticket: `SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", ticket_no AS "ticketNo",
      customer_id AS "customerId", device_name AS "deviceName", device_serial AS "deviceSerial",
      tech_diagnosis AS "techDiagnosis", parts_requested AS "partsRequested", parts_used AS "partsUsed",
      qc_score::float AS "qcScore", qc_status AS "qcStatus", warranty_ends_at AS "warrantyEndsAt",
      public_tracking_token AS "publicTrackingToken" FROM service_tickets WHERE id IS NULL AND tenant_id IS NULL`,
    event: `INSERT INTO service_status_events (tenant_id,ticket_id,from_status,to_status,note,actor_user_id,metadata)
      VALUES (NULL,NULL,NULL,'DIAGNOSA','schema verify',NULL,'{}'::jsonb)`,
    queue: `INSERT INTO whatsapp_queue (tenant_id,recipient_name,recipient_phone,type,message,status,ticket_id,event_id,scheduled_time)
      VALUES (NULL,'schema verify','000','SERVICE_UPDATE','schema verify','PENDING',NULL,NULL,NOW())`,
    part: `INSERT INTO service_parts (tenant_id,ticket_id,product_id,warehouse_id,name,quantity,unit_price,serial_number,status)
      VALUES (NULL,NULL,NULL,NULL,'schema verify',1,0,NULL,'REQUESTED')`,
    movement: `INSERT INTO service_stock_movements (tenant_id,ticket_id,product_id,warehouse_id,quantity,movement_type,reference_no)
      VALUES (NULL,NULL,NULL,NULL,-1,'SERVICE_OUT','schema verify')
      ON CONFLICT (ticket_id,product_id,warehouse_id,movement_type)
      DO UPDATE SET quantity=service_stock_movements.quantity + EXCLUDED.quantity`,
    payment: `INSERT INTO service_payments (tenant_id,branch_id,ticket_id,idempotency_key,method,subtotal,tax_amount,down_payment_used,amount,reference_no,proof_name,tempo_days,due_at,status,created_by)
      VALUES (NULL,NULL,NULL,'schema-verify-key','CASH',0,0,0,0,NULL,NULL,0,NULL,'PAID',NULL)`,
    journal: `INSERT INTO journal_entries (id,tenant_id,branch_id,description,reference_no,source_type,source_id,created_by)
      VALUES (gen_random_uuid(),NULL,NULL,'schema verify','schema-verify','SERVICE_PAYMENT',NULL,NULL)`,
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    try {
      await client.query(`EXPLAIN (COSTS OFF) ${sql}`);
      result[name] = 'ok';
    } catch (error) {
      result[name] = `${error.code || 'ERR'}: ${error.message}`;
    }
  }
  const integrity = await client.query(`SELECT
    (SELECT count(*) FROM service_parts sp JOIN service_tickets st ON st.id=sp.ticket_id WHERE sp.tenant_id<>st.tenant_id) AS part_tenant_mismatch,
    (SELECT count(*) FROM service_payments p JOIN service_tickets st ON st.id=p.ticket_id WHERE p.tenant_id<>st.tenant_id OR p.branch_id<>st.branch_id) AS payment_scope_mismatch,
    (SELECT count(*) FROM service_stock_movements sm JOIN service_tickets st ON st.id=sm.ticket_id WHERE sm.tenant_id<>st.tenant_id) AS movement_tenant_mismatch,
    (SELECT count(*) FROM whatsapp_queue q LEFT JOIN service_status_events e ON e.id=q.event_id WHERE q.event_id IS NOT NULL AND e.id IS NULL) AS dangling_queue_events,
    (SELECT count(*) FROM journal_entries WHERE branch_id IS NULL OR reference_no IS NULL) AS incomplete_journals,
    (SELECT count(*) FROM service_stock_movements WHERE movement_type='SERVICE_OUT' AND quantity >= 0) AS invalid_service_out`);
  console.log(JSON.stringify({queries: result, integrity: integrity.rows[0]}, null, 2));
  await client.end();
  if (Object.values(result).some((v) => v !== 'ok')) process.exitCode = 1;
})().catch((error) => {
  console.error('VERIFY_FAILED', error.code || '', error.message);
  process.exitCode = 1;
});
