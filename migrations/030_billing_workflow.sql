CREATE TABLE IF NOT EXISTS billing_invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  invoice_id TEXT REFERENCES saas_invoices(id),
  response JSONB,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS billing_gateway_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  order_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  transaction_status TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (processing_status IN ('PROCESSING','COMPLETED','REJECTED','FAILED')),
  result JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_key)
);

ALTER TABLE billing_notifications ADD COLUMN IF NOT EXISTS event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_notification_event
  ON billing_notifications(event_key, channel, recipient)
  WHERE event_key IS NOT NULL;

ALTER TABLE saas_invoices ADD COLUMN IF NOT EXISTS renewed_from_invoice_id TEXT REFERENCES saas_invoices(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_invoice_renewal_source
  ON saas_invoices(renewed_from_invoice_id)
  WHERE renewed_from_invoice_id IS NOT NULL AND status IN ('UNPAID','PENDING_VERIFICATION');

ALTER TABLE billing_audit_events ADD COLUMN IF NOT EXISTS console_session_id UUID REFERENCES superadmin_console_sessions(id);
ALTER TABLE billing_audit_events ADD COLUMN IF NOT EXISTS impersonation_session_id UUID REFERENCES impersonation_sessions(id);
