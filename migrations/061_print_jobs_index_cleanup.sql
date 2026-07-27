ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS copies INTEGER NOT NULL DEFAULT 1 CHECK (copies BETWEEN 1 AND 20);

CREATE INDEX IF NOT EXISTS idx_print_jobs_tenant_branch_created
  ON print_jobs (tenant_id, branch_id, created_at DESC);
