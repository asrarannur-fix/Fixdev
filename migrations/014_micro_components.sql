BEGIN;

CREATE TABLE IF NOT EXISTS micro_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id), product_id UUID REFERENCES products(id), name TEXT NOT NULL,
  sku TEXT NOT NULL, category TEXT NOT NULL, rack_id TEXT NOT NULL, drawer_id TEXT NOT NULL,
  stock_qty NUMERIC NOT NULL DEFAULT 0, min_stock NUMERIC NOT NULL DEFAULT 0,
  compat_models JSONB NOT NULL DEFAULT '[]'::jsonb, purchase_cost NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0, avg_weekly_consumption NUMERIC NOT NULL DEFAULT 0,
  lead_time_days INTEGER NOT NULL DEFAULT 0, supplier_name TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,sku)
);
CREATE INDEX IF NOT EXISTS micro_components_search_idx ON micro_components(tenant_id,category,warehouse_id);

CREATE TABLE IF NOT EXISTS micro_component_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES micro_components(id), warehouse_id UUID REFERENCES warehouses(id),
  idempotency_key TEXT NOT NULL, quantity NUMERIC NOT NULL CHECK(quantity > 0), unit_cost NUMERIC NOT NULL DEFAULT 0,
  hpp_total NUMERIC NOT NULL DEFAULT 0, chargeable BOOLEAN NOT NULL DEFAULT FALSE,
  unit_price NUMERIC NOT NULL DEFAULT 0, charge_total NUMERIC NOT NULL DEFAULT 0,
  note TEXT, consumed_by UUID, consumed_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS micro_component_usages_ticket_idx ON micro_component_usages(tenant_id,ticket_id,consumed_at);
CREATE INDEX IF NOT EXISTS idx_micro_component_usages_component ON micro_component_usages(component_id);
CREATE INDEX IF NOT EXISTS idx_micro_component_usages_warehouse ON micro_component_usages(warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS micro_component_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES micro_components(id), ticket_id UUID REFERENCES service_tickets(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, quantity NUMERIC NOT NULL, reference_no TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS micro_component_usages JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
