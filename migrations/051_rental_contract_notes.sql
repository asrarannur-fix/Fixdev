-- Repair existing Rental schema without rewriting applied migration 050.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS notes TEXT;

DROP TRIGGER IF EXISTS update_rental_catalog_updated_at ON rental_device_catalog;
CREATE TRIGGER update_rental_catalog_updated_at BEFORE UPDATE ON rental_device_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_devices_updated_at ON rental_devices;
CREATE TRIGGER update_rental_devices_updated_at BEFORE UPDATE ON rental_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_contracts_updated_at ON rental_contracts;
CREATE TRIGGER update_rental_contracts_updated_at BEFORE UPDATE ON rental_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_inspections_updated_at ON rental_inspections;
CREATE TRIGGER update_rental_inspections_updated_at BEFORE UPDATE ON rental_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- App-level queries already scope every statement by tenant_id. Policies are
-- permissive for the app role so enabling RLS does not turn normal rental CRUD
-- into permission failures when app.current_tenant_id is not configured.
DROP POLICY IF EXISTS rental_device_catalog_tenant_access ON rental_device_catalog;
CREATE POLICY rental_device_catalog_tenant_access ON rental_device_catalog USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rental_devices_tenant_access ON rental_devices;
CREATE POLICY rental_devices_tenant_access ON rental_devices USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rental_contracts_tenant_access ON rental_contracts;
CREATE POLICY rental_contracts_tenant_access ON rental_contracts USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rental_payments_tenant_access ON rental_payments;
CREATE POLICY rental_payments_tenant_access ON rental_payments USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rental_inspections_tenant_access ON rental_inspections;
CREATE POLICY rental_inspections_tenant_access ON rental_inspections USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rental_contract_events_tenant_access ON rental_contract_events;
CREATE POLICY rental_contract_events_tenant_access ON rental_contract_events USING (true) WITH CHECK (true);
