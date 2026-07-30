ALTER TABLE service_payments
  DROP CONSTRAINT IF EXISTS service_payments_ticket_id_key;

DROP INDEX IF EXISTS service_payments_ticket_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_payments_tenant_idempotency_key
  ON service_payments(tenant_id, idempotency_key);
