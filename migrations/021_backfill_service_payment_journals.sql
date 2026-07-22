-- Backfill missing double-entry journals for completed service payments.
-- Idempotent: source_id + source_type prevents duplicates.

INSERT INTO journal_entries (id, tenant_id, branch_id, description, reference_no, source_type, source_id, created_by)
SELECT gen_random_uuid(), sp.tenant_id, sp.branch_id,
       'Backfill pembayaran servis ' || st.ticket_no,
       st.ticket_no, 'SERVICE_PAYMENT', sp.id, sp.created_by
FROM service_payments sp
JOIN service_tickets st ON st.id = sp.ticket_id
WHERE sp.amount > 0
  AND sp.status IN ('PAID', 'RECEIVABLE')
  AND NOT EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.source_type='SERVICE_PAYMENT' AND je.source_id=sp.id
  );

INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
SELECT gen_random_uuid(), je.id,
       debit.id, sp.amount, 0
FROM journal_entries je
JOIN service_payments sp ON sp.id = je.source_id AND je.source_type='SERVICE_PAYMENT'
JOIN LATERAL (
  SELECT id FROM coa_accounts
  WHERE tenant_id=sp.tenant_id
    AND code=CASE WHEN sp.method='TEMPO' THEN '10300' WHEN sp.method IN ('CASH','DEPOSIT') THEN '10100' ELSE '10200' END
  LIMIT 1
) debit ON TRUE
WHERE NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.journal_entry_id=je.id AND jl.debit > 0);

INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit)
SELECT gen_random_uuid(), je.id, revenue.id, 0, sp.amount
FROM journal_entries je
JOIN service_payments sp ON sp.id = je.source_id AND je.source_type='SERVICE_PAYMENT'
JOIN LATERAL (
  SELECT id FROM coa_accounts WHERE tenant_id=sp.tenant_id AND code='40100' LIMIT 1
) revenue ON TRUE
WHERE NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.journal_entry_id=je.id AND jl.credit > 0);

