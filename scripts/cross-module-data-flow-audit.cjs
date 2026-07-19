require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const results = {
  tenant: null, branch: null,
  handoverTickets: [],
  serviceStockMovements: [],
  serviceJournalEntries: [],
  posTransactions: [],
  integrityChecks: [],
};

function check(name, passed, detail = '') {
  results.integrityChecks.push({ name, passed, detail });
  console.log(`${passed ? '\u2705' : '\u274c'} ${name}${detail ? ': ' + detail : ''}`);
}

async function main() {
  await client.connect();
  console.log('=== CROSS-MODULE DATA FLOW AUDIT ===\n');

  // Get active tenant
  const tRes = await client.query(
    `SELECT t.id AS tid, t.name AS tname,
            b.id AS bid, b.name AS bname
     FROM tenants t JOIN branches b ON b.tenant_id=t.id
     WHERE t.status IN ('ACTIVE','TRIAL')
     ORDER BY t.created_at LIMIT 1`
  );
  if (!tRes.rows[0]) { console.log('No active tenant'); return; }
  const { tid, tname, bid, bname } = tRes.rows[0];
  results.tenant = tname; results.branch = bname;
  console.log(`Tenant: ${tname} (${tid})`);
  console.log(`Branch: ${bname} (${bid})\n`);

  // STEP 1: Handover/completed tickets
  console.log('--- STEP 1: Service Handover Tickets ---');
  const handover = await client.query(
    `SELECT st.id, st.ticket_no, st.status, st.device_name,
            st.estimated_cost::float AS est_cost,
            st.down_payment::float AS dp,
            st.payment_method, st.handover_at,
            st.qc_status, st.invoice_id,
            sp.id AS pay_id, sp.amount::float AS pay_amount,
            sp.method AS pay_method, sp.reference_no AS pay_ref,
            sp.status AS pay_status
     FROM service_tickets st
     LEFT JOIN service_payments sp ON sp.ticket_id=st.id AND sp.tenant_id=st.tenant_id
     WHERE st.tenant_id=$1 AND st.branch_id=$2
       AND st.status IN ('DIAMBIL','SIAP_DIAMBIL','MENUGGU_PEMBAYARAN')
     ORDER BY st.handover_at DESC NULLS LAST
     LIMIT 10`, [tid, bid]
  );
  results.handoverTickets = handover.rows;
  console.log(`Found ${handover.rows.length} handover/completed tickets`);
  for (const t of handover.rows) {
    console.log(`  ${t.ticket_no} | ${t.status} | ${t.device_name} | est: Rp${t.est_cost?.toLocaleString('id-ID')} | pay: ${t.pay_method} Rp${t.pay_amount?.toLocaleString('id-ID')}${t.handover_at ? ' | handover: '+t.handover_at : ''}`);
  }

  // STEP 2: Service stock movements (inventory deduction from parts)
  console.log('\n--- STEP 2: Service Stock Movements ---');
  const ssm = await client.query(
    `SELECT ssm.*, st.ticket_no, st.device_name,
            p.name AS pname, p.sku,
            w.name AS wname
     FROM service_stock_movements ssm
     JOIN service_tickets st ON st.id=ssm.ticket_id AND st.tenant_id=ssm.tenant_id
     LEFT JOIN products p ON p.id=ssm.product_id
     LEFT JOIN warehouses w ON w.id=ssm.warehouse_id
     WHERE ssm.tenant_id=$1
     ORDER BY ssm.created_at DESC LIMIT 10`, [tid]
  );
  results.serviceStockMovements = ssm.rows;
  console.log(`Found ${ssm.rows.length} service stock movements`);
  for (const m of ssm.rows) {
    console.log(`  ${m.ticket_no} | ${m.pname} (${m.sku}) | qty: ${m.quantity} | ${m.movement_type} | ref: ${m.reference_no} | ${m.wname}`);
  }

  // Also check stock_movements for SERVICE-related entries
  const sm = await client.query(
    `SELECT sm.*, p.name AS pname
     FROM stock_movements sm
     LEFT JOIN products p ON p.id=sm.product_id
     WHERE sm.tenant_id=$1 AND (sm.type LIKE 'SERVICE%' OR sm.reference_id::text IN (SELECT id::text FROM service_tickets WHERE tenant_id=$1))
     ORDER BY sm.timestamp DESC LIMIT 10`, [tid]
  );
  console.log(`Found ${sm.rows.length} service-related stock_movements entries`);
  for (const m of sm.rows) {
    console.log(`  type=${m.type} | ${m.pname} | qty=${m.quantity} | ${m.reference_no || ''}`);
  }

  // STEP 3: Accounting journal entries (SERVICE_PAYMENT)
  console.log('\n--- STEP 3: Accounting Journals (SERVICE_PAYMENT) ---');
  const je = await client.query(
    `SELECT je.id, je.description, je.reference_no, je.source_type, je.source_id,
            je.created_at, je.created_by,
            jl.id AS line_id, jl.account_id, jl.debit::float, jl.credit::float,
            ca.code AS acct_code, ca.name AS acct_name, ca.type AS acct_type
     FROM journal_entries je
     JOIN journal_lines jl ON jl.journal_entry_id=je.id
     JOIN coa_accounts ca ON ca.id=jl.account_id
     WHERE je.tenant_id=$1 AND je.source_type='SERVICE_PAYMENT'
     ORDER BY je.created_at DESC LIMIT 30`, [tid]
  );
  results.serviceJournalEntries = je.rows;
  const jgroups = {};
  for (const r of je.rows) {
    if (!jgroups[r.id]) jgroups[r.id] = { desc: r.description, ref: r.reference_no, sid: r.source_id, lines: [] };
    jgroups[r.id].lines.push({ code: r.acct_code, name: r.acct_name, dr: r.debit, cr: r.credit });
  }
  console.log(`Found ${Object.keys(jgroups).length} SERVICE_PAYMENT journal entries`);
  for (const [jid, j] of Object.entries(jgroups).slice(0, 5)) {
    const td = j.lines.reduce((s,l) => s+l.dr, 0);
    const tc = j.lines.reduce((s,l) => s+l.cr, 0);
    console.log(`  ${j.ref} | ${j.desc}`);
    for (const l of j.lines) console.log(`    ${l.code} ${l.name}: Dr ${l.dr} / Cr ${l.cr}`);
    console.log(`    Balance: Dr ${td} = Cr ${tc} ${Math.abs(td-tc)<0.01 ? '\u2705' : '\u274c UNBALANCED'}`);
  }

  // Also check POS_SALE journal entries
  const posJe = await client.query(
    `SELECT je.id, je.description, je.reference_no, je.source_type,
            jl.debit::float, jl.credit::float,
            ca.code AS acct_code, ca.name AS acct_name
     FROM journal_entries je
     JOIN journal_lines jl ON jl.journal_entry_id=je.id
     JOIN coa_accounts ca ON ca.id=jl.account_id
     WHERE je.tenant_id=$1 AND je.source_type='POS_SALE'
     ORDER BY je.created_at DESC LIMIT 20`, [tid]
  );
  console.log(`\nFound ${new Set(posJe.rows.map(r=>r.id)).size} POS_SALE journal entries`);

  // STEP 4: POS transactions
  console.log('\n--- STEP 4: POS Transactions ---');
  const pos = await client.query(
    `SELECT id, invoice_no, grand_total::float, payment_method,
            subtotal::float, tax_amount::float, is_refunded, status, created_at
     FROM pos_transactions WHERE tenant_id=$1 AND branch_id=$2
     ORDER BY created_at DESC LIMIT 5`, [tid, bid]
  );
  results.posTransactions = pos.rows;
  console.log(`Found ${pos.rows.length} POS transactions`);
  for (const p of pos.rows) console.log(`  ${p.invoice_no} | Rp${p.grand_total.toLocaleString('id-ID')} | ${p.payment_method} | ${p.status}`);

  // === INTEGRITY CHECKS ===
  console.log('\n=== INTEGRITY CHECKS ===\n');

  // 5a. Handover tickets that have no payment record
  const noPay = handover.rows.filter(t => !t.pay_id);
  check('Handover tickets have payment record',
    noPay.length === 0,
    noPay.length > 0 ? `FAIL: ${noPay.length} tickets missing payment: ${noPay.map(t=>t.ticket_no).join(',')}` : `All ${handover.rows.length} tickets have payment`
  );

  // 5b. Payments that are missing journal entries
  for (const t of handover.rows.filter(r => r.pay_id)) {
    const jc = await client.query(
      `SELECT id FROM journal_entries WHERE tenant_id=$1 AND source_type='SERVICE_PAYMENT' AND source_id=$2`,
      [tid, t.pay_id]
    );
    const has = jc.rows.length > 0;
    check(`Payment ${t.ticket_no} \u2192 journal entry`, has, has ? 'OK' : `MISSING: pay_id=${t.pay_id} has no journal`);
  }

  // 5c. Journal balance validation for SERVICE_PAYMENT
  for (const [jid, j] of Object.entries(jgroups)) {
    const td = j.lines.reduce((s,l) => s+l.dr, 0);
    const tc = j.lines.reduce((s,l) => s+l.cr, 0);
    const bal = Math.abs(td-tc) < 0.01;
    check(`Journal ${j.ref} balanced`, bal, bal ? `Dr ${td}=Cr ${tc}` : `UNBALANCED Dr ${td}!=Cr ${tc}`);
  }

  // 5d. Inventory deduction for service parts
  for (const t of handover.rows.filter(r => r.status === 'DIAMBIL' && r.pay_id).slice(0, 5)) {
    const parts = await client.query(
      `SELECT id, name, quantity::float, status, warehouse_id
       FROM service_parts WHERE tenant_id=$1 AND ticket_id=$2
       AND status IN ('RESERVED','USED')`, [tid, t.id]
    );
    const movements = await client.query(
      `SELECT id, product_id, quantity, movement_type FROM service_stock_movements
       WHERE tenant_id=$1 AND ticket_id=$2`, [tid, t.id]
    );
    if (parts.rows.length > 0) {
      const hasMov = movements.rows.length > 0;
      check(`Ticket ${t.ticket_no} stock deduct \u2192 service_stock_movements`, hasMov,
        hasMov ? `${movements.rows.length} movements for ${parts.rows.length} parts` :
          `MISSING: ${parts.rows.length} parts but 0 stock movements`);
      // Verify qty matches
      for (const p of parts.rows) {
        const sumMov = movements.rows.filter(m => m.product_id === p.id).reduce((s,m) => s + Number(m.quantity), 0);
        check(`Part ${p.name} qty matches`, Math.abs(Number(p.quantity) + sumMov) < 0.01,
          `Part qty: ${p.quantity}, movement sum: ${sumMov}`);
      }
    } else {
      check(`Ticket ${t.ticket_no} parts check`, true, `No service parts (no inventory impact expected)`);
    }
  }

  // 5e. Workflow timeline consistency
  console.log('\n--- Workflow Timeline ---');
  for (const t of handover.rows.slice(0, 5)) {
    const ev = await client.query(
      `SELECT from_status, to_status, created_at FROM service_status_events
       WHERE tenant_id=$1 AND ticket_id=$2 ORDER BY created_at ASC`, [tid, t.id]
    );
    const s = ev.rows.map(e => e.to_status);
    const ok = s.includes('DITERIMA') && s.includes('DIAGNOSA') && t.status === 'DIAMBIL';
    check(`Ticket ${t.ticket_no} workflow`, ok, `Path: ${s.join(' \u2192 ')}`);
  }

  // 5f. Stock_movements consistency (POS_SALE type)
  console.log('\n--- POS Stock Consistency ---');
  const stk = await client.query(
    `SELECT sm.product_id, sm.warehouse_id, sm.type,
            SUM(sm.quantity)::float AS net,
            p.name AS pname, ps.quantity::float AS cur
     FROM stock_movements sm
     JOIN products p ON p.id=sm.product_id
     LEFT JOIN product_stock ps ON ps.product_id=sm.product_id AND ps.warehouse_id=sm.warehouse_id
     WHERE sm.tenant_id=$1 AND sm.type='POS_SALE'
     GROUP BY sm.product_id, sm.warehouse_id, sm.type, p.name, ps.quantity
     ORDER BY net ASC LIMIT 10`, [tid]
  );
  for (const s of stk.rows) {
    const nn = (s.cur ?? 0) >= 0;
    check(`Stock ${s.pname} non-negative`, nn, nn ? `OK (stock: ${s.cur})` : `NEGATIVE: ${s.cur}`);
  }

  // 5g. Schema completeness
  console.log('\n--- Schema Completeness ---');
  const reqTables = ['service_tickets','service_payments','service_parts',
    'service_stock_movements','stock_movements','pos_transactions','pos_shifts',
    'journal_entries','journal_lines','coa_accounts','products','product_stock','warehouses',
    'customers','branches','service_status_events'];
  const tq = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  const exists = new Set(tq.rows.map(r => r.table_name));
  for (const tbl of reqTables) check(`Table '${tbl}' exists`, exists.has(tbl), exists.has(tbl) ? 'OK' : 'MISSING');

  // 5h. Cross-module FK integrity
  console.log('\n--- Cross-Module Links ---');
  const orphPay = await client.query(
    `SELECT sp.id FROM service_payments sp
     LEFT JOIN service_tickets st ON st.id=sp.ticket_id AND st.tenant_id=sp.tenant_id
     WHERE sp.tenant_id=$1 AND st.id IS NULL`, [tid]
  );
  check('No orphan service_payments', orphPay.rows.length === 0,
    orphPay.rows.length === 0 ? 'OK' : `${orphPay.rows.length} orphan`);

  const orphJe = await client.query(
    `SELECT je.id, je.description FROM journal_entries je
     LEFT JOIN service_payments sp ON sp.id=je.source_id AND sp.tenant_id=je.tenant_id
     WHERE je.tenant_id=$1 AND je.source_type='SERVICE_PAYMENT' AND sp.id IS NULL`, [tid]
  );
  check('No orphan SERVICE_PAYMENT journals', orphJe.rows.length === 0,
    orphJe.rows.length === 0 ? 'OK' : `${orphJe.rows.length} orphan: ${orphJe.rows.map(r=>r.description).join(',')}`);

  const orphInv = await client.query(
    `SELECT st.ticket_no FROM service_tickets st
     LEFT JOIN service_payments sp ON sp.id=st.invoice_id AND sp.tenant_id=st.tenant_id
     WHERE st.tenant_id=$1 AND st.invoice_id IS NOT NULL AND sp.id IS NULL`, [tid]
  );
  check('invoice_id \u2192 service_payments FK', orphInv.rows.length === 0,
    orphInv.rows.length === 0 ? 'OK' : `${orphInv.rows.length} broken: ${orphInv.rows.map(r=>r.ticket_no).join(',')}`);

  // 5i. Check if code inserts use correct column names
  console.log('\n--- Code-DB Alignment Check ---');
  // stock_movements schema: id, tenant_id, product_id, warehouse_id, type, quantity, reference_no, note, timestamp, reference_id, notes
  // But migration 016 says quantity_change INT - the live DB has quantity NUMERIC
  const smCols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='stock_movements' ORDER BY ordinal_position`
  );
  const colNames = smCols.rows.map(r => r.column_name);
  const hasQuantity = colNames.includes('quantity');
  check('stock_movements has canonical quantity column', hasQuantity,
    hasQuantity ? 'Uses quantity' : 'Canonical quantity column missing');

  const mc = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='stock_movements' AND column_name='quantity'`
  );
  check('stock_movements.quantity code-DB match', mc.rows.length > 0,
    mc.rows.length > 0 ? 'Code writes quantity' : 'COLUMN MISSING - code writes quantity');

  console.log('\n=== AUDIT SUMMARY ===\n');
  const passed = results.integrityChecks.filter(c => c.passed).length;
  const failed = results.integrityChecks.filter(c => !c.passed).length;
  console.log(`Checks: ${results.integrityChecks.length} | Pass: ${passed} | Fail: ${failed}`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    for (const c of results.integrityChecks.filter(c => !c.passed)) console.log(`  \u274c ${c.name}: ${c.detail}`);
  }
  console.log(`\nResult: ${failed === 0 ? '\u2705 CHAIN INTACT' : '\u274c CHAIN BROKEN'}`);

  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
