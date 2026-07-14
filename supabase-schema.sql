-- FIXDEV Supabase PostgreSQL Database Schema
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'TRIAL',
    tier TEXT NOT NULL DEFAULT 'BASIC',
    trial_ends_at TIMESTAMP,
    settings JSONB,
    branding JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'TEKNISI',
    permissions TEXT[] DEFAULT '{}',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    auth_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_branches (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, branch_id)
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    segment TEXT DEFAULT 'PERSONAL',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT DEFAULT 'SPAREPART',
    sell_price NUMERIC DEFAULT 0,
    purchase_cost NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_stock (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    PRIMARY KEY (product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS service_tickets (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    ticket_no TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_brand_model TEXT,
    customer_complaints TEXT,
    status TEXT NOT NULL DEFAULT 'DITERIMA',
    assigned_tech_id UUID,
    estimated_cost NUMERIC DEFAULT 0,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    cashier_id UUID,
    opened_at TIMESTAMP DEFAULT NOW(),
    starting_cash NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    closed_at TIMESTAMP,
    expected_ending_cash NUMERIC DEFAULT 0,
    actual_ending_cash NUMERIC DEFAULT 0,
    difference NUMERIC DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
    invoice_no TEXT NOT NULL,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    payment_method TEXT NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    change_amount NUMERIC DEFAULT 0,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    is_refunded BOOLEAN DEFAULT FALSE,
    deposit_used NUMERIC DEFAULT 0,
    posted_to_ledger BOOLEAN DEFAULT TRUE,
    payment_details TEXT
);

CREATE TABLE IF NOT EXISTS coa_accounts (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    description TEXT,
    ref_no TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES coa_accounts(id) ON DELETE CASCADE,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_records (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    record_id UUID NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE (tenant_id, module, record_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_name TEXT,
    recipient_phone TEXT,
    type TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'SENT',
    sender_name TEXT,
    channel TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_name TEXT,
    recipient_phone TEXT,
    type TEXT,
    message TEXT,
    scheduled_time TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'PENDING'
);

-- Automated Warranty Calculation Trigger
CREATE OR REPLACE FUNCTION calculate_warranty_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('SELESAI', 'DIAMBIL') AND NEW.warranty_ends_at IS NULL THEN
    IF NEW.warranty_months IS NULL OR NEW.warranty_months = 0 THEN
      NEW.warranty_months := 3;
    END IF;
    NEW.warranty_ends_at := NOW() + (NEW.warranty_months || ' months')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_warranty ON service_tickets;
CREATE TRIGGER trigger_calculate_warranty
BEFORE INSERT OR UPDATE ON service_tickets
FOR EACH ROW
EXECUTE FUNCTION calculate_warranty_ends_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Helper function to get current user's tenant_id based on Supabase auth.uid()
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Tenants: user can only see and update their own tenant
CREATE POLICY "Tenant isolation for tenants" ON tenants FOR ALL USING (id = current_tenant_id());

-- Tables with direct tenant_id
CREATE POLICY "Tenant isolation for users" ON users FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for branches" ON branches FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for warehouses" ON warehouses FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for customers" ON customers FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for products" ON products FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for service_tickets" ON service_tickets FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for pos_shifts" ON pos_shifts FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for pos_transactions" ON pos_transactions FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for coa_accounts" ON coa_accounts FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for journal_entries" ON journal_entries FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for audit_logs" ON audit_logs FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for module_records" ON module_records FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for whatsapp_logs" ON whatsapp_logs FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Tenant isolation for whatsapp_queue" ON whatsapp_queue FOR ALL USING (tenant_id = current_tenant_id());

-- Tables without direct tenant_id (using joins)
CREATE POLICY "Tenant isolation for user_branches" ON user_branches FOR ALL USING (user_id IN (SELECT id FROM users WHERE tenant_id = current_tenant_id()));
CREATE POLICY "Tenant isolation for product_stock" ON product_stock FOR ALL USING (warehouse_id IN (SELECT id FROM warehouses WHERE tenant_id = current_tenant_id()));
CREATE POLICY "Tenant isolation for journal_lines" ON journal_lines FOR ALL USING (account_id IN (SELECT id FROM coa_accounts WHERE tenant_id = current_tenant_id()));

