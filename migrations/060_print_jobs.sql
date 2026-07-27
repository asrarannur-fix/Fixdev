CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL,
  document_id VARCHAR(200),
  printer VARCHAR(250),
  transport VARCHAR(20) NOT NULL CHECK (transport IN ('browser', 'qz')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'submitted', 'failed')),
  error_code VARCHAR(100),
  error_message VARCHAR(1000),
  reprint BOOLEAN NOT NULL DEFAULT FALSE,
  reprint_reason VARCHAR(500),
  reprint_sequence INTEGER NOT NULL DEFAULT 0,
  idempotency_key UUID NOT NULL,
  content_hash CHAR(64) NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((reprint = FALSE AND reprint_reason IS NULL) OR (reprint = TRUE AND length(trim(reprint_reason)) >= 3)),
  CHECK (reprint_sequence >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_print_jobs_tenant_idempotency ON print_jobs (tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_print_jobs_tenant_created ON print_jobs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_tenant_document ON print_jobs (tenant_id, document_type, document_id);
