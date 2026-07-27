ALTER TABLE service_payments
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS service_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  service_payment_id UUID NOT NULL UNIQUE REFERENCES service_payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVABLE' CHECK (status IN ('RECEIVABLE','PARTIAL','PAID','OVERDUE')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_service_receivables_scope
  ON service_receivables(tenant_id, branch_id, status, due_at);

CREATE TABLE IF NOT EXISTS service_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  receivable_id UUID NOT NULL REFERENCES service_receivables(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('CASH','BANK_TRANSFER','QRIS','EDC','E_WALLET')),
  reference_no TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_service_receivable_payments_receivable
  ON service_receivable_payments(tenant_id, branch_id, receivable_id, created_at);
