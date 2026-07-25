-- Customer deposit / store credit tracking for POS DEPOSIT payment method
CREATE TABLE IF NOT EXISTS customer_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES pos_transactions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'CHARGE', 'REFUND', 'ADJUSTMENT')),
  amount NUMERIC NOT NULL CHECK (amount != 0),
  balance NUMERIC NOT NULL DEFAULT 0,
  reference_no TEXT,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_deposits_tenant ON customer_deposits(tenant_id);
CREATE INDEX IF NOT EXISTS customer_deposits_customer ON customer_deposits(customer_id);
CREATE INDEX IF NOT EXISTS customer_deposits_branch ON customer_deposits(branch_id);
CREATE INDEX IF NOT EXISTS customer_deposits_transaction ON customer_deposits(transaction_id);
CREATE INDEX IF NOT EXISTS customer_deposits_created_at ON customer_deposits(created_at DESC);

COMMENT ON TABLE customer_deposits IS 'Tracks customer deposit/store credit balances for POS DEPOSIT payment method.';