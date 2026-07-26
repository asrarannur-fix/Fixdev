CREATE TABLE IF NOT EXISTS pos_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS pos_price_list_items (
  price_list_id UUID NOT NULL REFERENCES pos_price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (price_list_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_price_lists_lookup ON pos_price_lists(tenant_id, branch_id, customer_id, starts_at, ends_at) WHERE is_active;

CREATE TABLE IF NOT EXISTS pos_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount NUMERIC CHECK (max_discount IS NULL OR max_discount > 0),
  min_purchase NUMERIC NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_promotions_code_tenant ON pos_promotions(tenant_id, code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_promotions_lookup ON pos_promotions(tenant_id, branch_id, starts_at, ends_at) WHERE is_active;

CREATE TABLE IF NOT EXISTS pos_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  bundle_price NUMERIC NOT NULL CHECK (bundle_price >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_bundles_code_tenant ON pos_bundles(tenant_id, code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_bundles_lookup ON pos_bundles(tenant_id, branch_id, starts_at, ends_at) WHERE is_active;

CREATE TABLE IF NOT EXISTS pos_bundle_components (
  bundle_id UUID NOT NULL REFERENCES pos_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (bundle_id, product_id)
);

COMMENT ON TABLE pos_price_lists IS 'Harga POS efektif per tenant, cabang, atau pelanggan.';
COMMENT ON TABLE pos_promotions IS 'Promosi POS server-authoritative; non-stackable secara default.';
COMMENT ON TABLE pos_bundles IS 'Paket POS; komponen stok disimpan pada snapshot transaksi.';
