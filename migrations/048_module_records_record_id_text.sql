-- Migration: 048_module_records_record_id_text
-- The module_records.record_id column was typed uuid, but client modules (HR
-- employees, payroll, cash_advances, etc.) generate opaque string ids such as
-- "emp-<rand>" / "pay-<rand>" and send them as recordId. A uuid-typed column
-- rejects those strings and every HR write 500s in production. record_id is only
-- an opaque dedup key (unique on (tenant_id, module, record_id)), so widen it to
-- text. Idempotent.

ALTER TABLE module_records
  ALTER COLUMN record_id TYPE text USING record_id::text;

-- The unique index (tenant_id, module, record_id) remains valid for text.
