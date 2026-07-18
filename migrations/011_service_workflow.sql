BEGIN;

ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS tech_diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS parts_requested JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parts_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qc_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qc_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qc_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qc_notes TEXT,
  ADD COLUMN IF NOT EXISTS qc_status TEXT,
  ADD COLUMN IF NOT EXISTS provisional_signature TEXT,
  ADD COLUMN IF NOT EXISTS provisional_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS provisional_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_name TEXT,
  ADD COLUMN IF NOT EXISTS tempo_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS warranty_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS warranty_card_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warranty_card_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS public_tracking_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS service_tickets_public_tracking_token_unique
  ON service_tickets(public_tracking_token);
CREATE INDEX IF NOT EXISTS service_tickets_scope_status_idx
  ON service_tickets(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS service_tickets_serial_idx
  ON service_tickets(tenant_id, device_serial)
  WHERE device_serial IS NOT NULL AND device_serial <> '';

CREATE TABLE IF NOT EXISTS service_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL,
  actor_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_status_events_ticket_idx
  ON service_status_events(tenant_id, ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_status_events_actor
  ON service_status_events(actor_user_id) WHERE actor_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','RESERVED','USED','RETURNED','CANCELLED')),
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_parts_ticket_idx ON service_parts(tenant_id, ticket_id, status);
CREATE INDEX IF NOT EXISTS idx_service_parts_product ON service_parts(product_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_warehouse ON service_parts(warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity NUMERIC NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'SERVICE_OUT',
  reference_no TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, product_id, warehouse_id, movement_type)
);

CREATE INDEX IF NOT EXISTS idx_service_stock_movements_product
  ON service_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_service_stock_movements_warehouse
  ON service_stock_movements(warehouse_id);

CREATE TABLE IF NOT EXISTS service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  method TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  down_payment_used NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  reference_no TEXT,
  proof_name TEXT,
  tempo_days INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'PAID',
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_service_payments_branch ON service_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_tenant_method ON service_payments(tenant_id, method);

ALTER TABLE whatsapp_queue
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES service_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES service_status_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

COMMIT;
