-- Canonical stock movement columns used by current API controllers.
-- Additive and idempotent; preserves legacy quantity_change/reference_id/notes columns.

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_no TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_transactions_invoice_no
  ON pos_transactions(tenant_id, invoice_no);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stock_movements' AND column_name='quantity_change'
  ) THEN
    EXECUTE 'UPDATE stock_movements SET quantity = quantity_change WHERE quantity = 0 AND quantity_change <> 0';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stock_movements' AND column_name='reference_id'
  ) THEN
    EXECUTE 'UPDATE stock_movements SET reference_no = reference_id::text WHERE reference_no IS NULL AND reference_id IS NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stock_movements' AND column_name='notes'
  ) THEN
    EXECUTE 'UPDATE stock_movements SET note = notes WHERE note IS NULL AND notes IS NOT NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_no ON stock_movements(reference_no);
