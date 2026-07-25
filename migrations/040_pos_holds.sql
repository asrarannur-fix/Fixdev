-- hold cart persistence for POS checkout
CREATE TABLE IF NOT EXISTS pos_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_used NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  payment_details TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  recalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pos_holds_tenant_branch ON pos_holds(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS pos_holds_shift ON pos_holds(shift_id);
CREATE INDEX IF NOT EXISTS pos_holds_customer ON pos_holds(customer_id);
CREATE INDEX IF NOT EXISTS pos_holds_created_at ON pos_holds(created_at DESC);

COMMENT ON TABLE pos_holds IS 'Temporary hold/park for in-progress POS transactions.';
COMMENT ON COLUMN pos_holds.recalled_at IS 'Set when a hold is recalled and converted into a transaction; NULL if still parked.';