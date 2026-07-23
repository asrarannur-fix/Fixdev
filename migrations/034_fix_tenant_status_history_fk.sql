ALTER TABLE tenant_status_history
DROP CONSTRAINT tenant_status_history_actor_user_id_fkey,
ADD CONSTRAINT tenant_status_history_actor_user_id_fkey
FOREIGN KEY (actor_user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- To ensure consistency, also make sure tenant_id cascade is explicit if it's not already
-- This was checked and confirmed to be CASCADE, but adding for completeness.
ALTER TABLE tenant_status_history
DROP CONSTRAINT tenant_status_history_tenant_id_fkey,
ADD CONSTRAINT tenant_status_history_tenant_id_fkey
FOREIGN KEY (tenant_id)
REFERENCES tenants(id)
ON DELETE CASCADE;
