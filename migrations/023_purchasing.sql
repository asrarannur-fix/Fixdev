-- Purchasing: suppliers, purchase orders, goods receipts + AP accounting.
-- Additive and idempotent.
BEGIN;

-- ==========================================
-- 1. SUPPLIERS
-- ==========================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- ==========================================
-- 2. PURCHASE ORDERS
-- ==========================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    po_no TEXT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, PARTIAL, RECEIVED, CANCELLED
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, po_no)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    received_quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);

-- ==========================================
-- 3. GOODS RECEIPTS
-- ==========================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    receipt_no TEXT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CREDIT', -- CREDIT (AP), CASH, BANK_TRANSFER
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    received_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, receipt_no)
);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant ON goods_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gr_items_gr ON goods_receipt_items(goods_receipt_id);

-- ==========================================
-- 4. ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for suppliers" ON suppliers;
CREATE POLICY "Tenant isolation for suppliers" ON suppliers FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation for purchase_orders" ON purchase_orders;
CREATE POLICY "Tenant isolation for purchase_orders" ON purchase_orders FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation for goods_receipts" ON goods_receipts;
CREATE POLICY "Tenant isolation for goods_receipts" ON goods_receipts FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Child isolation for purchase_order_items" ON purchase_order_items;
CREATE POLICY "Child isolation for purchase_order_items" ON purchase_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_id AND po.tenant_id = current_tenant_id())
);

DROP POLICY IF EXISTS "Child isolation for goods_receipt_items" ON goods_receipt_items;
CREATE POLICY "Child isolation for goods_receipt_items" ON goods_receipt_items FOR ALL USING (
  EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.id = goods_receipt_id AND gr.tenant_id = current_tenant_id())
);

COMMIT;
