-- Fix foreign keys for audit tables to allow tenant deletion
ALTER TABLE superadmin_audit_events
DROP CONSTRAINT IF EXISTS superadmin_audit_events_effective_tenant_id_fkey,
ADD CONSTRAINT superadmin_audit_events_effective_tenant_id_fkey
    FOREIGN KEY (effective_tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE;

ALTER TABLE billing_audit_events
DROP CONSTRAINT IF EXISTS billing_audit_events_effective_tenant_id_fkey,
ADD CONSTRAINT billing_audit_events_effective_tenant_id_fkey
    FOREIGN KEY (effective_tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE;
