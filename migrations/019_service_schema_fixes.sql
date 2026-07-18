-- Migration: 019_service_schema_fixes
-- Description: Schema drift fixes for the Service module.
-- Safe additive/backfill changes only. Applied via POST /api/supabase/migrate.
-- All checks are IF NOT EXISTS / idempotent.

BEGIN;

-- 1. whatsapp_queue: the codebase consistently writes scheduled_time (queueNotification
--    in serviceWorkflow.controller.ts, whatsapp.controller.ts, and the index
--    idx_whatsapp_queue_tenant_status orders by scheduled_time). supabase-schema.sql
--    still declared scheduled_at. Reconcile the canonical schema file to the live
--    column and add the matching index.
ALTER TABLE whatsapp_queue
  ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP INDEX IF EXISTS idx_whatsapp_queue_scheduled;
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_tenant_status
  ON whatsapp_queue (tenant_id, status, scheduled_time);

-- 2. service_stock_movements: handoverServiceTicket inserts with movement_type
--    'SERVICE_OUT' and relies on the UNIQUE (ticket_id, product_id, warehouse_id,
--    movement_type) constraint. The 011 migration forgot the column + constraint.
--    Backward-compatible: existing rows get 'SERVICE_OUT' so the unique key stays valid.
ALTER TABLE service_stock_movements
  ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT 'SERVICE_OUT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'service_stock_movements'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'service_stock_movements'::regclass AND attname = 'ticket_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'service_stock_movements'::regclass AND attname = 'product_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'service_stock_movements'::regclass AND attname = 'warehouse_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'service_stock_movements'::regclass AND attname = 'movement_type')
      ]
  ) THEN
    ALTER TABLE service_stock_movements
      ADD CONSTRAINT service_stock_movements_ticket_id_product_id_warehouse_id_m_key
      UNIQUE (ticket_id, product_id, warehouse_id, movement_type);
  END IF;
END $$;

-- 3. journal_entries: live DB already enforces branch_id NOT NULL and
--    reference_no NOT NULL (column is named reference_no, not ref_no). 017 has been
--    corrected to match. The legacy nullable ref_no column is retained for compatibility.
--    No live ALTER required; documented here for schema-file parity.

COMMIT;
