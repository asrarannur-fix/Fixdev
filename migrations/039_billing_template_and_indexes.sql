-- Migration 039: invoice_template support & billing notification indexes
-- Created: 2026-07-24

-- Invoice template stored in app_settings (key: invoice_template)
INSERT INTO app_settings (key, value, updated_at)
VALUES ('invoice_template', '{
  "header": "PT FixDev ERP — Invoice",
  "logoUrl": "",
  "fields": ["invoice_number", "tenant_name", "plan_name", "amount", "due_date", "payment_method"],
  "footer": "Terima kasih telah berlangganan FixDev ERP",
  "colorPrimary": "#059669"
}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- Indexes aligned with actual billing_internal_notifications schema
CREATE INDEX IF NOT EXISTS idx_billing_notifications_tenant_event
  ON billing_internal_notifications (tenant_id, event_type);

CREATE INDEX IF NOT EXISTS idx_billing_notifications_resource
  ON billing_internal_notifications (resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_billing_gateway_events_event_key
  ON billing_gateway_events (event_key);
