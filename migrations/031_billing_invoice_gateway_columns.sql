ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS gateway_provider TEXT;
ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
