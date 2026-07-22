INSERT INTO superadmin_role_permissions(role, permission) VALUES
  ('ROOT_ADMIN', 'tenants:manage_config'),
  ('OPERATIONS_ADMIN', 'tenants:manage_config')
ON CONFLICT DO NOTHING;
