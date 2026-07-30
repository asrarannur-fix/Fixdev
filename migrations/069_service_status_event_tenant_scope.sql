CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_tenant_id
  ON service_tickets(tenant_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_service_status_events_tenant_ticket'
  ) THEN
    ALTER TABLE service_status_events
      ADD CONSTRAINT fk_service_status_events_tenant_ticket
      FOREIGN KEY (tenant_id, ticket_id)
      REFERENCES service_tickets(tenant_id, id)
      NOT VALID;
  END IF;
END
$$;
