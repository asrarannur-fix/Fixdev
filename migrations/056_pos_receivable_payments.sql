CREATE TABLE IF NOT EXISTS pos_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES pos_receivables(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_pos_receivable_payments_receivable
  ON pos_receivable_payments(tenant_id, branch_id, receivable_id, created_at);
