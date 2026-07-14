-- Connect Super Admin role templates to authenticated user profiles.
ALTER TABLE users ADD COLUMN IF NOT EXISTS superadmin_role TEXT;

UPDATE users
SET superadmin_role = 'ROOT_ADMIN'
WHERE role = 'SUPER_ADMIN' AND superadmin_role IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_superadmin_role
  ON users(superadmin_role) WHERE role = 'SUPER_ADMIN';
