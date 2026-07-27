CREATE OR REPLACE FUNCTION calculate_warranty_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('SELESAI', 'DIAMBIL') AND NEW.warranty_ends_at IS NULL AND NEW.warranty_months > 0 THEN
    NEW.warranty_ends_at := NOW() + (NEW.warranty_months || ' months')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
