DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'service_payments'
    AND con.contype = 'u'
    AND array_length(con.conkey, 1) = 1
    AND att.attname = 'ticket_id'
  LIMIT 1;
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE service_payments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_service_payments_ticket ON service_payments(tenant_id, ticket_id, created_at);
