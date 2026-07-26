-- Tenant infrastructure hardening: single platform domain and branch integrity.
ALTER TABLE tenants DROP COLUMN IF EXISTS custom_domain;
ALTER TABLE tenants DROP COLUMN IF EXISTS custom_domain_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;

CREATE UNIQUE INDEX IF NOT EXISTS branches_id_tenant_unique ON branches(id, tenant_id);

CREATE OR REPLACE FUNCTION enforce_user_branch_tenant_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u JOIN branches b ON b.id=NEW.branch_id
    WHERE u.id=NEW.user_id AND u.tenant_id=b.tenant_id
  ) THEN RAISE EXCEPTION 'user and branch must belong to the same tenant'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS user_branches_tenant_match ON user_branches;
CREATE TRIGGER user_branches_tenant_match BEFORE INSERT OR UPDATE ON user_branches
FOR EACH ROW EXECUTE FUNCTION enforce_user_branch_tenant_match();

CREATE OR REPLACE FUNCTION enforce_branch_tenant_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM branches WHERE id=NEW.branch_id AND tenant_id=NEW.tenant_id
  ) THEN RAISE EXCEPTION 'branch must belong to the same tenant'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS warehouses_branch_tenant_match ON warehouses;
CREATE TRIGGER warehouses_branch_tenant_match BEFORE INSERT OR UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION enforce_branch_tenant_match();
DROP TRIGGER IF EXISTS service_tickets_branch_tenant_match ON service_tickets;
CREATE TRIGGER service_tickets_branch_tenant_match BEFORE INSERT OR UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION enforce_branch_tenant_match();
DROP TRIGGER IF EXISTS pos_shifts_branch_tenant_match ON pos_shifts;
CREATE TRIGGER pos_shifts_branch_tenant_match BEFORE INSERT OR UPDATE ON pos_shifts FOR EACH ROW EXECUTE FUNCTION enforce_branch_tenant_match();
DROP TRIGGER IF EXISTS pos_transactions_branch_tenant_match ON pos_transactions;
CREATE TRIGGER pos_transactions_branch_tenant_match BEFORE INSERT OR UPDATE ON pos_transactions FOR EACH ROW EXECUTE FUNCTION enforce_branch_tenant_match();
