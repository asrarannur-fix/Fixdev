-- Super Admin operations, security and observability
-- Apply after 006_secure_manual_payments.sql.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_category TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_reactivation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS storage_measured_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OWNER',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_created_by ON tenant_invitations(created_by) WHERE created_by IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_active_owner_invite
  ON tenant_invitations(tenant_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS tenant_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  next_status TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  internal_note TEXT,
  scheduled_reactivation_at TIMESTAMPTZ,
  notify_owner BOOLEAN NOT NULL DEFAULT true,
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_status_history_tenant ON tenant_status_history(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ticket_id TEXT,
  access_mode TEXT NOT NULL DEFAULT 'READ_ONLY' CHECK (access_mode IN ('READ_ONLY', 'FULL')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  client_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_impersonation_actor_active ON impersonation_sessions(actor_user_id, ended_at, expires_at DESC);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('SNAPSHOT', 'RESTORE_DRY_RUN', 'RESTORE')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'VALIDATED', 'COMPLETED', 'FAILED', 'CANCELLED')),
  schema_version INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'APPLICATION_JSON',
  file_name TEXT,
  size_bytes BIGINT,
  checksum_sha256 TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created ON backup_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS platform_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  title TEXT NOT NULL,
  details TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS superadmin_role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(role, permission)
);

INSERT INTO superadmin_role_permissions(role, permission) VALUES
  ('ROOT_ADMIN', '*'),
  ('SUPPORT_ADMIN', 'overview:view'), ('SUPPORT_ADMIN', 'tenants:view'), ('SUPPORT_ADMIN', 'impersonation:read_only'),
  ('BILLING_ADMIN', 'overview:view'), ('BILLING_ADMIN', 'billing:view'), ('BILLING_ADMIN', 'billing:approve'),
  ('OPERATIONS_ADMIN', 'overview:view'), ('OPERATIONS_ADMIN', 'operations:view'), ('OPERATIONS_ADMIN', 'backup:manage'),
  ('SECURITY_ADMIN', 'overview:view'), ('SECURITY_ADMIN', 'audit:view'), ('SECURITY_ADMIN', 'permissions:manage')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS superadmin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_role TEXT,
  effective_tenant_id UUID NOT NULL REFERENCES tenants(id),
  impersonation_session_id UUID REFERENCES impersonation_sessions(id),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  client_ip TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_filter
  ON superadmin_audit_events(created_at DESC, effective_tenant_id, actor_user_id, outcome);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_actor
  ON superadmin_audit_events(actor_user_id) WHERE actor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_impersonation
  ON superadmin_audit_events(impersonation_session_id) WHERE impersonation_session_id IS NOT NULL;

-- Access control enforced by application middleware.
