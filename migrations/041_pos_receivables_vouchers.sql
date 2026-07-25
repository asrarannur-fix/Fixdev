-- TEMPO receivable tracking
CREATE TABLE IF NOT EXISTS pos_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVABLE' CHECK (status IN ('RECEIVABLE', 'PAID', 'OVERDUE')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pos_receivables_tenant ON pos_receivables(tenant_id);
CREATE INDEX IF NOT EXISTS pos_receivables_transaction ON pos_receivables(transaction_id);
CREATE INDEX IF NOT EXISTS pos_receivables_customer ON pos_receivables(customer_id);
CREATE INDEX IF NOT EXISTS pos_receivables_status ON pos_receivables(status);
CREATE INDEX IF NOT EXISTS pos_receivables_due_at ON pos_receivables(due_at);

COMMENT ON TABLE pos_receivables IS 'Tracks outstanding TEMPO receivables from POS sales.';

-- Discount voucher system
CREATE TABLE IF NOT EXISTS discount_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount NUMERIC CHECK (max_discount IS NULL OR max_discount > 0),
  min_purchase NUMERIC NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS discount_vouchers_code_tenant ON discount_vouchers(tenant_id, code);
CREATE INDEX IF NOT EXISTS discount_vouchers_active ON discount_vouchers(tenant_id, is_active, valid_from, valid_until);

COMMENT ON TABLE discount_vouchers IS 'One-time or reusable discount vouchers for POS checkout.';