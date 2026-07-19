-- Migration: 016_pos_sales
-- Description: Creates core POS tables, indexes, and stock movement tracking.

-- ==========================================
-- 1. ENUMERATED TYPES
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_transaction_status') THEN
        CREATE TYPE pos_transaction_status AS ENUM (
            'COMPLETED',
            'VOIDED',
            'PARTIAL_REFUND',
            'FULL_REFUND'
        );
    END IF;
END
$$;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- POS Shift Sessions
CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    starting_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    closed_at TIMESTAMPTZ,
    expected_ending_cash NUMERIC(15, 2),
    actual_ending_cash NUMERIC(15, 2),
    difference NUMERIC(15, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- POS Sale Transactions
CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
    invoice_no TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_details TEXT,
    deposit_used NUMERIC(15, 2) NOT NULL DEFAULT 0,
    -- Kept for compatibility with older void/refund queries.
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    posted_to_ledger BOOLEAN NOT NULL DEFAULT FALSE,
    status pos_transaction_status NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Movements (for atomic inventory tracking)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'POS_SALE', 'POS_REFUND', 'SERVICE_PART', 'MANUAL_ADJUSTMENT'
    quantity_change INT NOT NULL,
    reference_id UUID, -- e.g., pos_transaction_id or service_ticket_id
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_pos_shifts_tenant_branch_status ON pos_shifts(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_tenant_branch_created ON pos_transactions(tenant_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift_id ON pos_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer_id ON pos_transactions(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_transactions_invoice_no ON pos_transactions(tenant_id, invoice_no);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_product ON stock_movements(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Tenant isolation for pos_shifts" ON pos_shifts;
CREATE POLICY "Tenant isolation for pos_shifts" ON pos_shifts FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation for pos_transactions" ON pos_transactions;
CREATE POLICY "Tenant isolation for pos_transactions" ON pos_transactions FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation for stock_movements" ON stock_movements;
CREATE POLICY "Tenant isolation for stock_movements" ON stock_movements FOR ALL USING (tenant_id = current_tenant_id());
