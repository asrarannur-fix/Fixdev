-- Migration: 038_fix_pos_shifts_id_default
-- Description: 000_baseline.sql creates pos_shifts with "id UUID PRIMARY KEY"
-- but without a DEFAULT, while the POS controllers insert shifts without
-- supplying an id. On databases where no later ALTER added the default, inserts
-- fail with a NOT NULL violation. Add the default idempotently.

ALTER TABLE pos_shifts
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
