ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode
  ON products(tenant_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_transactions_client_request
  ON pos_transactions(tenant_id, branch_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED')),
  decision_reason TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pos_refund_requests_pending
  ON pos_refund_requests(tenant_id, branch_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_refund_request_pending
  ON pos_refund_requests(tenant_id, transaction_id)
  WHERE status IN ('PENDING', 'APPROVED');

CREATE TABLE IF NOT EXISTS pos_payment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  total NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, transaction_id)
);

CREATE TABLE IF NOT EXISTS pos_payment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES pos_payment_snapshots(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  line_no INTEGER NOT NULL,
  UNIQUE (snapshot_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_pos_payment_lines_shift ON pos_payment_lines(tenant_id, branch_id, snapshot_id);

CREATE TABLE IF NOT EXISTS pos_reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES pos_shifts(id) ON DELETE CASCADE,
  summary JSONB NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, shift_id)
);
