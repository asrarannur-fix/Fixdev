ALTER TABLE superadmin_audit_events
DROP CONSTRAINT superadmin_audit_events_actor_user_id_fkey,
ADD CONSTRAINT superadmin_audit_events_actor_user_id_fkey
FOREIGN KEY (actor_user_id)
REFERENCES users(id)
ON DELETE CASCADE;
