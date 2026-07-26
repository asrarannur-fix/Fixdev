-- Data Manager integrity indexes. Existing duplicate-safe indexes remain idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_manager_idx
  ON products (tenant_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE UNIQUE INDEX IF NOT EXISTS coa_accounts_tenant_code_manager_idx
  ON coa_accounts (tenant_id, code);
