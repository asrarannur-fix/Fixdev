-- Migration: 049_saas_invoices_amount_zero
-- Relax the saas_invoices.amount CHECK from `> 0` to `>= 0` so a pro-rata
-- credit that fully covers a new plan (downgrade / switch) can be recorded as
-- a zero-amount PAID invoice (credit note) instead of failing the CHECK and
-- returning HTTP 500 ("Invoice gagal dibuat").
-- Also add proration_source_invoice_id to mark which prior invoice's credit
-- was consumed, preventing repeatable credit harvesting (audit H2).

ALTER TABLE saas_invoices DROP CONSTRAINT IF EXISTS saas_invoices_amount_positive;
ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoices_amount_nonneg CHECK (amount >= 0);

ALTER TABLE saas_invoices
  ADD COLUMN IF NOT EXISTS proration_source_invoice_id text;
