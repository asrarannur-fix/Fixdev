-- Authoritative Super Admin console sessions, invitation provisioning state, and operations lifecycle.

CREATE TABLE IF NOT EXISTS superadmin_console_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'READ_ONLY' CHECK (mode IN ('READ_ONLY', 'EDIT')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  client_ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_superadmin_console_actor_active
  ON superadmin_console_sessions(actor_user_id, ended_at, expires_at DESC);
-- Access control enforced by application middleware.

ALTER TABLE tenant_invitations
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (provisioning_status IN ('PENDING', 'PROVISIONING', 'COMPLETED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS provisioning_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_error TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registration_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_registration_key ON tenants(registration_key) WHERE registration_key IS NOT NULL;

ALTER TABLE platform_incidents
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS platform_incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES platform_incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'ACKNOWLEDGED', 'NOTE', 'RESOLVED', 'REOPENED')),
  note TEXT,
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_incident_events
  ON platform_incident_events(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_incident_events_actor
  ON platform_incident_events(actor_user_id) WHERE actor_user_id IS NOT NULL;
-- Access control enforced by application middleware.

INSERT INTO superadmin_role_permissions(role, permission) VALUES
  ('OPERATIONS_ADMIN', 'incidents:manage'),
  ('ROOT_ADMIN', 'impersonation:full'),
  ('ROOT_ADMIN', 'users:assign_role')
ON CONFLICT DO NOTHING;
