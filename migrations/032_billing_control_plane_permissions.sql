INSERT INTO superadmin_role_permissions(role, permission) VALUES
  ('ROOT_ADMIN', 'billing:view_subscription'),
  ('ROOT_ADMIN', 'billing:manage_invoices'),
  ('ROOT_ADMIN', 'billing:manage_subscription'),
  ('BILLING_ADMIN', 'billing:view_subscription'),
  ('BILLING_ADMIN', 'billing:manage_invoices'),
  ('BILLING_ADMIN', 'billing:manage_subscription')
ON CONFLICT DO NOTHING;
