-- Migration: 037_sync_accounting_serviceticket_schema
-- Description: Reconcile schema drift caused by feature tables (coa_accounts,
-- service_tickets) being first created by 000_baseline.sql with an incomplete
-- column set, while later feature migrations used CREATE TABLE IF NOT EXISTS /
-- partial ALTER statements and never added the columns the controllers rely on.
-- This migration is fully idempotent (ADD COLUMN IF NOT EXISTS) so it is safe
-- to run on dev (fresh) and prod (existing data) without data loss.

-- ==========================================================
-- 1. coa_accounts: add columns defined in 017_accounting.sql
-- ==========================================================
ALTER TABLE coa_accounts
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ==========================================================
-- 2. service_tickets: add every column referenced by the
--    service reception / workflow controllers (INSERT + ticketSelect)
-- ==========================================
ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS device_serial TEXT,
  ADD COLUMN IF NOT EXISTS device_brand_model TEXT,
  ADD COLUMN IF NOT EXISTS tech_diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS customer_approval_status TEXT,
  ADD COLUMN IF NOT EXISTS parts_requested JSONB,
  ADD COLUMN IF NOT EXISTS parts_used JSONB,
  ADD COLUMN IF NOT EXISTS initial_checklist JSONB,
  ADD COLUMN IF NOT EXISTS initial_photos JSONB,
  ADD COLUMN IF NOT EXISTS accessories_left TEXT,
  ADD COLUMN IF NOT EXISTS custom_accessories TEXT,
  ADD COLUMN IF NOT EXISTS physical_condition TEXT,
  ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS captured_conditions JSONB,
  ADD COLUMN IF NOT EXISTS dynamic_fields JSONB,
  ADD COLUMN IF NOT EXISTS storage_location_id UUID,
  ADD COLUMN IF NOT EXISTS timeline JSONB,
  ADD COLUMN IF NOT EXISTS screen_lock_pin TEXT,
  ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS outsourced_vendor_id UUID,
  ADD COLUMN IF NOT EXISTS outsourcing_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_check_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS device_category TEXT,
  ADD COLUMN IF NOT EXISTS qc_score NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS qc_checklist JSONB,
  ADD COLUMN IF NOT EXISTS qc_photos JSONB,
  ADD COLUMN IF NOT EXISTS qc_notes TEXT,
  ADD COLUMN IF NOT EXISTS qc_status TEXT,
  ADD COLUMN IF NOT EXISTS repair_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repair_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technician_notes TEXT,
  ADD COLUMN IF NOT EXISTS tech_pre_checklist JSONB,
  ADD COLUMN IF NOT EXISTS tech_post_checklist JSONB,
  ADD COLUMN IF NOT EXISTS internal_discussions JSONB,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_name TEXT,
  ADD COLUMN IF NOT EXISTS tempo_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS public_tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS micro_component_usages JSONB NOT NULL DEFAULT '[]'::jsonb;
