BEGIN;

CREATE TABLE IF NOT EXISTS service_cost_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  previous_cost NUMERIC NOT NULL,
  new_cost NUMERIC NOT NULL,
  approval_method TEXT NOT NULL CHECK (approval_method IN ('WHATSAPP','PHONE','IN_PERSON')),
  approved_by_name TEXT,
  note TEXT,
  proof_name TEXT,
  recorded_by UUID,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS service_cost_adjustments_ticket_idx
  ON service_cost_adjustments(tenant_id, ticket_id, created_at DESC);

COMMIT;
