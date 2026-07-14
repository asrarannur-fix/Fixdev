-- Prevent concurrent requests from opening multiple shifts for one branch.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_shifts_one_open_per_branch
  ON pos_shifts (tenant_id, branch_id)
  WHERE status = 'OPEN';

-- Prevent stock from becoming negative regardless of write path.
ALTER TABLE product_stock
  DROP CONSTRAINT IF EXISTS product_stock_quantity_nonnegative;
ALTER TABLE product_stock
  ADD CONSTRAINT product_stock_quantity_nonnegative CHECK (quantity >= 0) NOT VALID;
ALTER TABLE product_stock
  VALIDATE CONSTRAINT product_stock_quantity_nonnegative;
