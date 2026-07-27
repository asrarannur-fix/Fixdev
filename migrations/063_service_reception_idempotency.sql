ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS reception_idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_tenant_reception_idempotency
  ON service_tickets (tenant_id, reception_idempotency_key)
  WHERE reception_idempotency_key IS NOT NULL;
