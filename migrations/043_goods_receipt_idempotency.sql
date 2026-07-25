-- Migration: 043_goods_receipt_idempotency
-- Description: Prevent duplicate goods receipts (double stock + double journal)
-- caused by retry / double-click. Adds an optional unique idempotency key.

ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_idempotency
  ON goods_receipts (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
