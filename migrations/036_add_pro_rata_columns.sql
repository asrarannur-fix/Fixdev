-- Migration 036: Add paid_at, period_start, period_end columns to saas_invoices
ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;
ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;