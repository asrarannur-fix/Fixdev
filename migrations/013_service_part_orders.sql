
CREATE TABLE IF NOT EXISTS service_part_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  supplier_name TEXT,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  estimated_arrival_date DATE,
  cost_approved BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','ORDERED','SHIPPED','ARRIVED','RESERVED','CANCELLED')),
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS service_part_orders_ticket_idx
  ON service_part_orders(tenant_id, ticket_id, status, created_at DESC);

