-- Secure billing settlement and manual payment workflow
-- Apply after 005_billing.sql. This migration assumes tenants.id and users.id are UUID.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saas_invoices'
      AND column_name = 'tenant_id' AND data_type = 'text'
  ) THEN
    DROP POLICY IF EXISTS "Tenants can view their own invoices" ON saas_invoices;
    DROP POLICY IF EXISTS "Tenants can insert their own invoices" ON saas_invoices;
    DROP POLICY IF EXISTS "Tenants can update their own invoices" ON saas_invoices;
    DROP POLICY IF EXISTS tenant_select_own ON saas_invoices;
    DROP POLICY IF EXISTS service_role_all ON saas_invoices;
    DROP FUNCTION IF EXISTS get_expiring_invoices(INTEGER);
    ALTER TABLE saas_invoices ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
  END IF;
END $$;

ALTER TABLE saas_invoices
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gateway_provider TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saas_invoices_tenant_id_fkey'
  ) THEN
    CREATE TABLE IF NOT EXISTS orphaned_saas_invoices_archive AS
      SELECT i.*, now() AS archived_at
      FROM saas_invoices i
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id)
      WITH NO DATA;
    INSERT INTO orphaned_saas_invoices_archive
      SELECT i.*, now()
      FROM saas_invoices i
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id);
    DELETE FROM saas_invoices i
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id);
    ALTER TABLE saas_invoices
      ADD CONSTRAINT saas_invoices_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS manual_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL REFERENCES saas_invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('BANK_TRANSFER', 'MANUAL_QRIS')),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  payer_name TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  notes TEXT,
  proof_object_path TEXT NOT NULL,
  proof_original_name TEXT NOT NULL,
  proof_content_type TEXT NOT NULL CHECK (proof_content_type IN ('image/jpeg', 'image/png', 'application/pdf')),
  proof_size_bytes BIGINT NOT NULL CHECK (proof_size_bytes BETWEEN 1 AND 5242880),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  submitted_by UUID NOT NULL REFERENCES users(id),
  recorded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES manual_payment_requests(id),
  CONSTRAINT manual_payment_review_fields CHECK (
    (status = 'SUBMITTED' AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status = 'APPROVED' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    OR (status = 'REJECTED' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND length(trim(rejection_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_tenant_status
  ON manual_payment_requests(tenant_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_payments_invoice
  ON manual_payment_requests(invoice_id, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_payment_pending_invoice
  ON manual_payment_requests(invoice_id) WHERE status = 'SUBMITTED';

CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL REFERENCES saas_invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('MIDTRANS', 'MANUAL', 'LEGACY_IMPORT')),
  method TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SETTLEMENT', 'DENIED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
  idempotency_key TEXT,
  request_hash TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, provider_transaction_id),
  UNIQUE(tenant_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_invoice_settlement
  ON billing_transactions(invoice_id) WHERE status = 'SETTLEMENT';

CREATE TABLE IF NOT EXISTS billing_internal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  audience_role TEXT,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'INTERNAL')),
  recipient TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_key, channel, recipient)
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE,
  token_hash TEXT UNIQUE,
  token_prefix TEXT,
  name TEXT NOT NULL,
  abilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  created_by UUID REFERENCES users(id),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS token_prefix TEXT;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_tokens_hash ON api_tokens(token_hash) WHERE token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_role TEXT,
  effective_tenant_id UUID NOT NULL REFERENCES tenants(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings(key, value)
VALUES (
  'manual_payment_config',
  '{"enabled":true,"bankName":"","accountNumber":"","accountHolder":"","manualQrisImageUrl":"","proofBucket":"billing-payment-proofs","maxProofBytes":5242880}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE manual_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_internal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_audit_events ENABLE ROW LEVEL SECURITY;
