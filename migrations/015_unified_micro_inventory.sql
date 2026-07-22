
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'RETAIL_PRODUCT';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'pcs';

UPDATE products
SET item_type = CASE
  WHEN category = 'SPAREPART' THEN 'SERVICE_PART'
  WHEN category = 'JASA' THEN 'CONSUMABLE'
  ELSE 'RETAIL_PRODUCT'
END
WHERE item_type IS NULL OR item_type = 'RETAIL_PRODUCT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_item_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_item_type_check
      CHECK (item_type IN ('RETAIL_PRODUCT','SERVICE_PART','MICRO_COMPONENT','CONSUMABLE'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_unique_idx ON products(tenant_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS micro_components_product_unique_idx ON micro_components(product_id) WHERE product_id IS NOT NULL;

DO $$
DECLARE
  component RECORD;
  target_warehouse UUID;
  new_product UUID;
BEGIN
  FOR component IN SELECT * FROM micro_components ORDER BY created_at, id LOOP
    target_warehouse := component.warehouse_id;
    IF target_warehouse IS NULL THEN
      SELECT w.id INTO target_warehouse
      FROM warehouses w
      WHERE w.tenant_id = component.tenant_id
      ORDER BY w.created_at NULLS LAST, w.id
      LIMIT 1;
    END IF;
    IF target_warehouse IS NULL THEN
      RAISE EXCEPTION 'Tenant % tidak memiliki gudang untuk migrasi komponen %', component.tenant_id, component.sku;
    END IF;

    IF component.product_id IS NULL THEN
      SELECT p.id INTO new_product FROM products p
      WHERE p.tenant_id = component.tenant_id AND p.sku = component.sku
      LIMIT 1;

      IF new_product IS NULL THEN
        INSERT INTO products(
          id, tenant_id, name, sku, barcode, category, purchase_cost, sell_price,
          unit, min_stock, reorder_level, item_type, is_active
        ) VALUES (
          gen_random_uuid(), component.tenant_id, component.name, component.sku, component.sku,
          'SPAREPART', component.purchase_cost, component.sell_price, 'pcs', component.min_stock,
          component.min_stock, 'MICRO_COMPONENT', TRUE
        ) RETURNING id INTO new_product;
      ELSE
        UPDATE products SET item_type='MICRO_COMPONENT', is_active=TRUE,
          purchase_cost=component.purchase_cost, sell_price=component.sell_price,
          min_stock=component.min_stock, reorder_level=component.min_stock
        WHERE id=new_product;
      END IF;
      UPDATE micro_components SET product_id=new_product, warehouse_id=target_warehouse WHERE id=component.id;
    ELSE
      new_product := component.product_id;
      UPDATE products SET item_type='MICRO_COMPONENT', is_active=TRUE WHERE id=new_product;
    END IF;

    INSERT INTO product_stock(product_id, warehouse_id, quantity)
    VALUES(new_product, target_warehouse, component.stock_qty)
    ON CONFLICT(product_id, warehouse_id) DO UPDATE
      SET quantity = CASE WHEN product_stock.quantity = 0 THEN EXCLUDED.quantity ELSE product_stock.quantity END;
  END LOOP;
END $$;

ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);
ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS balance_before NUMERIC;
ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS balance_after NUMERIC;
ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE micro_component_movements ADD COLUMN IF NOT EXISTS note TEXT;

UPDATE micro_component_movements m SET product_id=c.product_id, warehouse_id=COALESCE(m.warehouse_id,c.warehouse_id)
FROM micro_components c WHERE c.id=m.component_id AND m.product_id IS NULL;

ALTER TABLE micro_components ALTER COLUMN product_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS products_tenant_item_type_idx ON products(tenant_id,item_type,is_active);
CREATE INDEX IF NOT EXISTS micro_component_movements_product_idx ON micro_component_movements(tenant_id,product_id,created_at);

