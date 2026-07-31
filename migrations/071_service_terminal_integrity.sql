CREATE OR REPLACE FUNCTION prevent_terminal_service_ticket_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('DIAMBIL','DIBATALKAN','TIDAK_BISA_DIPERBAIKI','CUSTOMER_TIDAK_MERESPON','BARANG_TIDAK_DIAMBIL','RUSAK') AND (
    to_jsonb(NEW) - ARRAY['updated_at','deleted_at']::text[]
    IS DISTINCT FROM
    to_jsonb(OLD) - ARRAY['updated_at','deleted_at']::text[]
  ) THEN
    RAISE EXCEPTION 'terminal service ticket is immutable';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
