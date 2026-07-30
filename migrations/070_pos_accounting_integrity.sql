CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_transactions_tenant_branch_client_request
  ON pos_transactions (tenant_id, branch_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_reference
  ON journal_entries (tenant_id, reference_no);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_journal_lines_valid_amounts') THEN
    ALTER TABLE journal_lines
      ADD CONSTRAINT chk_journal_lines_valid_amounts
      CHECK (
        debit >= 0 AND credit >= 0
        AND ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
      ) NOT VALID;
  END IF;
END
$$;
