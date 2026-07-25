-- Migration: 045_customers_store_credit
-- Description: posService.ts consumes deposit via `customers.store_credit`
-- and awards `loyalty_points` on sale, but neither column was ever created.
-- Without them every deposit-funded sale 500s ("column store_credit does not exist").
-- Additive + idempotent.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS store_credit NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
