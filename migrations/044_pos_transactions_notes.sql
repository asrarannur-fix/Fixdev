-- Migration: 044_pos_transactions_notes
-- Description: posService.ts inserts into pos_transactions but the schema was
-- missing the `notes` column (only is_refunded was added in 020) AND the `id`
-- column had no default, so every sale 500'd ("column notes does not exist"
-- then "null value in column id"). Additive + idempotent.

ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE pos_transactions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
