ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_custom_domain ON tenants (lower(custom_domain)) WHERE custom_domain IS NOT NULL AND custom_domain_verified_at IS NOT NULL;
