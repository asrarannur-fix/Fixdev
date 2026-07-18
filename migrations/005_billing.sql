-- Billing & Subscription Database Migration
-- SPDX-License-Identifier: Apache-2.0

-- 1. SaaS Invoices table
CREATE TABLE IF NOT EXISTS saas_invoices (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    tier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID',
    qris_data TEXT,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. App Settings table (key-value store for billing plans, gateway config, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON saas_invoices(status);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_due_date ON saas_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 4. Insert default billing plans (BASIC, PRO, ENTERPRISE)
INSERT INTO app_settings (key, value)
VALUES (
    'billing_plans',
    '[
      {
        "tier": "BASIC",
        "name": "Basic Growth Plan",
        "priceMonthly": 99000,
        "priceYearly": 990000,
        "features": ["POS Kasir Utama", "Daftar Servis Dasar", "1 Gudang / Cabang", "Maks 3 Staff User", "Penyimpanan 500MB"],
        "limits": { "users": 3, "branches": 1, "storageMb": 500, "features": ["POS", "SERVICE"] }
      },
      {
        "tier": "PRO",
        "name": "SaaS Professional ERP",
        "priceMonthly": 250000,
        "priceYearly": 2400000,
        "features": ["Semua Fitur Basic", "Double-Entry Accounting & Ledger", "WhatsApp Broadcast", "AI Repair Diagnostik", "Multi-Branch & Cabang (Maks 5)", "Maks 15 Staff User", "Penyimpanan 2GB"],
        "limits": { "users": 15, "branches": 5, "storageMb": 2048, "features": ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM", "AI_DIAGNOSE"] }
      },
      {
        "tier": "ENTERPRISE",
        "name": "Enterprise Multi-Tenant ERP",
        "priceMonthly": 1500000,
        "priceYearly": 15000000,
        "features": ["Semua Fitur Pro", "Integrasi Marketplace Sync", "Workflow Builder (Automasi)", "Proteksi Keamanan & Fraud Detector", "Hingga 20 Cabang", "Hingga 100 Staff User", "Penyimpanan 10GB", "Custom Domain & White-Label"],
        "limits": { "users": 100, "branches": 20, "storageMb": 10240, "features": ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM", "AI_DIAGNOSE", "MARKETPLACE", "RENTAL", "SECURITY"] }
      }
    ]'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- 5. Insert default Midtrans config (empty, to be filled by super admin)
INSERT INTO app_settings (key, value)
VALUES (
    'midtrans_config',
    '{
      "merchantId": "",
      "serverKey": "",
      "clientKey": "",
      "isProduction": false,
      "isEnabled": false
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- 6. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_saas_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saas_invoices_updated_at ON saas_invoices;
CREATE TRIGGER saas_invoices_updated_at
    BEFORE UPDATE ON saas_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_saas_invoices_updated_at();

CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

-- 7. RLS (Row Level Security)
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own invoices" ON saas_invoices
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can insert their own invoices" ON saas_invoices
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own invoices" ON saas_invoices
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 8. Function to check and update overdue invoices
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE saas_invoices 
    SET status = 'OVERDUE'
    WHERE status = 'UNPAID' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 9. Notification queue for billing (for future email/WA integration)
CREATE TABLE IF NOT EXISTS billing_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES saas_invoices(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'due_reminder', 'overdue_alert', 'payment_confirmed', 'auto_renew_failed'
    channel TEXT NOT NULL, -- 'email', 'whatsapp', 'telegram'
    recipient TEXT NOT NULL, -- email or phone number
    payload JSONB,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_notifications_tenant ON billing_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_invoice ON billing_notifications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_status ON billing_notifications(status);

ALTER TABLE billing_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own billing notifications" ON billing_notifications
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can insert their own billing notifications" ON billing_notifications
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 10. Cron job helper function
CREATE OR REPLACE FUNCTION get_expiring_invoices(days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
    id TEXT,
    tenant_id UUID,
    due_date DATE,
    amount NUMERIC,
    tier TEXT,
    tenant_name TEXT,
    owner_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.tenant_id,
        i.due_date,
        i.amount,
        i.tier,
        t.name as tenant_name,
        (SELECT u.email FROM users u WHERE u.tenant_id = i.tenant_id AND u.role = 'OWNER' LIMIT 1) as owner_email
    FROM saas_invoices i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.status = 'UNPAID'
    AND i.due_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND i.due_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
