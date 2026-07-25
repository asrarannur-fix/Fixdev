-- Migration: 047_customer_missing_columns
-- Fixes CRITICAL bug: apiV1.controller.ts (getCustomers/createCustomer/updateCustomer)
-- references columns that were never created: company_name, npwp, referral_code,
-- sales_pipeline_stage, notes. Without these, GET/POST/PUT /api/v1/customers 500.
-- Also hardens data integrity:
--   * normalized_phone is only backfilled on existing rows (migration 010) but never
--     populated on new inserts (createCustomer does not set it), so the unique phone
--     index is dead for new customers. Add a BEFORE INSERT/UPDATE trigger to populate it.
--   * email has no uniqueness enforcement; dedupe existing rows and add a partial
--     unique index (tenant-scoped) so duplicate emails (within a tenant) are prevented.

-- 1. Add the missing columns (idempotent)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS npwp TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS sales_pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Trigger to keep normalized_phone in sync with phone on every insert/update.
--    Formula mirrors migration 010 backfill.
CREATE OR REPLACE FUNCTION set_normalized_phone()
RETURNS trigger AS $$
BEGIN
  NEW.normalized_phone = CASE
    WHEN regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g') LIKE '0%'
      THEN '62' || substring(regexp_replace(NEW.phone, '\D', '', 'g') FROM 2)
    WHEN regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g') LIKE '8%'
      THEN '62' || regexp_replace(NEW.phone, '\D', '', 'g')
    ELSE regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g')
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_normalized_phone ON customers;
CREATE TRIGGER trg_customers_normalized_phone
  BEFORE INSERT OR UPDATE OF phone ON customers
  FOR EACH ROW EXECUTE FUNCTION set_normalized_phone();

-- 3. Backfill normalized_phone for any rows still missing it (e.g. inserted before trigger existed)
UPDATE customers
SET normalized_phone = CASE
  WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '0%'
    THEN '62' || substring(regexp_replace(phone, '\D', '', 'g') FROM 2)
  WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '8%'
    THEN '62' || regexp_replace(phone, '\D', '', 'g')
  ELSE regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
END
WHERE normalized_phone IS NULL;

-- 4. Dedupe existing duplicate emails within a tenant (keep earliest), so the
--    unique index below can be created. Idempotent: after first run there are no dups.
UPDATE customers c
SET email = NULL
WHERE c.email IS NOT NULL AND c.email <> ''
  AND c.created_at > (
    SELECT MIN(c2.created_at)
    FROM customers c2
    WHERE c2.tenant_id = c.tenant_id AND c2.email = c.email
  );

-- 5. Partial unique index on email (tenant-scoped). Prevents duplicate emails
--    within a tenant. Matches the existing pattern on normalized_phone.
CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_email_unique
  ON customers (tenant_id, email)
  WHERE email IS NOT NULL AND email <> '';
