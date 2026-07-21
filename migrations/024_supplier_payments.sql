-- Accounts Payable settlement: track paid amount per goods receipt + payment history.
-- Additive and idempotent.
BEGIN;

ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    payment_no TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    method TEXT NOT NULL DEFAULT 'CASH', -- CASH, BANK_TRANSFER
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, payment_no)
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_tenant ON supplier_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_receipt ON supplier_payments(goods_receipt_id);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for supplier_payments" ON supplier_payments;
CREATE POLICY "Tenant isolation for supplier_payments" ON supplier_payments FOR ALL USING (tenant_id = current_tenant_id());

COMMIT;
