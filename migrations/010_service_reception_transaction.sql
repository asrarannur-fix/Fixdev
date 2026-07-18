BEGIN;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

UPDATE customers
SET normalized_phone = CASE
  WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '0%'
    THEN '62' || substring(regexp_replace(phone, '\D', '', 'g') FROM 2)
  WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '8%'
    THEN '62' || regexp_replace(phone, '\D', '', 'g')
  ELSE regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
END
WHERE normalized_phone IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_normalized_phone_unique
  ON customers (tenant_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone <> '';

ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS device_serial TEXT,
  ADD COLUMN IF NOT EXISTS initial_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS initial_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_approval_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS outsourced_vendor_id TEXT,
  ADD COLUMN IF NOT EXISTS outsourcing_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_check_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS device_category TEXT,
  ADD COLUMN IF NOT EXISTS accessories_left JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_accessories TEXT,
  ADD COLUMN IF NOT EXISTS physical_condition TEXT,
  ADD COLUMN IF NOT EXISTS screen_lock_pin TEXT,
  ADD COLUMN IF NOT EXISTS estimated_completion_date TEXT,
  ADD COLUMN IF NOT EXISTS captured_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_location_id TEXT,
  ADD COLUMN IF NOT EXISTS timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- UNIQUE (tenant_id, ticket_no) is already declared in supabase-schema.sql
-- as idx_service_tickets_tenant_ticket_no. Do not create a redundant index.

CREATE SEQUENCE IF NOT EXISTS service_ticket_number_seq;

COMMIT;
