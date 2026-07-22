-- FIXDEV PostgreSQL Database Schema
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'TRIAL',
    tier TEXT NOT NULL DEFAULT 'BASIC',
    trial_ends_at TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    branding JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_tier ON tenants(tier);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'TEKNISI',
    permissions TEXT[] DEFAULT '{}',
    password_hash TEXT,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    superadmin_role TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_active ON branches(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS user_branches (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses(branch_id);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    segment TEXT DEFAULT 'PERSONAL',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE phone IS NOT NULL AND phone <> '';
CREATE INDEX IF NOT EXISTS idx_customers_tenant_email ON customers(tenant_id, email) WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT DEFAULT 'SPAREPART',
    sell_price NUMERIC DEFAULT 0,
    purchase_cost NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE TABLE IF NOT EXISTS product_stock (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (product_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse ON product_stock(warehouse_id);

CREATE TABLE IF NOT EXISTS service_tickets (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    ticket_no TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_brand_model TEXT,
    customer_complaints TEXT,
    status TEXT NOT NULL DEFAULT 'DITERIMA',
    assigned_tech_id UUID,
    estimated_cost NUMERIC DEFAULT 0,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    warranty_months INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months >= 0),
    warranty_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_tickets_tenant ON service_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_customer ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_tenant_status ON service_tickets(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_tickets_tenant_ticket_no ON service_tickets(tenant_id, ticket_no);

CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL,
    opened_at TIMESTAMP DEFAULT NOW(),
    starting_cash NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    closed_at TIMESTAMP,
    expected_ending_cash NUMERIC DEFAULT 0,
    actual_ending_cash NUMERIC DEFAULT 0,
    difference NUMERIC DEFAULT 0,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_tenant ON pos_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_tenant_branch_status ON pos_shifts(tenant_id, branch_id, status);

CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
    invoice_no TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    payment_method TEXT NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    change_amount NUMERIC DEFAULT 0,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_refunded BOOLEAN DEFAULT FALSE,
    deposit_used NUMERIC DEFAULT 0,
    posted_to_ledger BOOLEAN DEFAULT TRUE,
    payment_details TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'COMPLETED',
    voided_at TIMESTAMP,
    void_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_tenant ON pos_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_branch ON pos_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift ON pos_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer ON pos_transactions(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_transactions_invoice ON pos_transactions(tenant_id, invoice_no);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_tenant_branch_created ON pos_transactions(tenant_id, branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS coa_accounts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_coa_accounts_tenant ON coa_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_accounts_type ON coa_accounts(tenant_id, type);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    description TEXT,
    -- Legacy compatibility only; new code must use reference_no.
    ref_no TEXT,
    reference_no TEXT NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    source_type TEXT,
    source_id UUID,
    is_posted BOOLEAN DEFAULT TRUE,
    created_by UUID,
    entry_date TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES coa_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    description TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS module_records (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    record_id UUID NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE (tenant_id, module, record_id)
);
CREATE INDEX IF NOT EXISTS idx_module_records_tenant ON module_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_module_records_module ON module_records(tenant_id, module, record_id);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_name TEXT,
    recipient_phone TEXT,
    type TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'SENT',
    sender_name TEXT,
    channel TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tenant ON whatsapp_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tenant_created ON whatsapp_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);

CREATE TABLE IF NOT EXISTS service_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_status_events_ticket
    ON service_status_events(tenant_id, ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_status_events_actor
    ON service_status_events(actor_user_id) WHERE actor_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticket_id UUID REFERENCES service_tickets(id) ON DELETE SET NULL,
    event_id UUID REFERENCES service_status_events(id) ON DELETE SET NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_tenant_status
    ON whatsapp_queue(tenant_id, status, scheduled_time);

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

-- Tenant isolation is enforced at the application layer via middleware and SQL queries.
-- RLS is not used; all queries include explicit tenant_id predicates.

