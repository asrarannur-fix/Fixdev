-- Migration: 017_accounting
-- Description: Creates accounting tables with indexes, constraints, and balance sync triggers.

-- ==========================================
-- 1. ENUMS
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM (
            'ASSET',
            'LIABILITY',
            'EQUITY',
            'REVENUE',
            'EXPENSE'
        );
    END IF;
END
$$;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS coa_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    -- Legacy compatibility only; new code must use reference_no.
    ref_no TEXT,
    reference_no TEXT NOT NULL,
    source_type TEXT, -- e.g. 'POS_SALE', 'SERVICE_PAYMENT', 'PURCHASE', 'MANUAL'
    source_id UUID,
    is_posted BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal Lines (double-entry detail)
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES coa_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0)) -- a line must be either debit or credit, not both
);

-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_coa_accounts_tenant ON coa_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_accounts_tenant_type ON coa_accounts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_ref ON journal_entries(tenant_id, reference_no);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- ==========================================
-- 4. TRIGGERS: Auto-sync account balance
-- ==========================================

-- Function to recalculate account balance from journal_lines
CREATE OR REPLACE FUNCTION sync_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    acct_id UUID;
BEGIN
    -- Determine which account(s) need recalculation
    IF TG_OP = 'DELETE' THEN
        acct_id := OLD.account_id;
    ELSE
        acct_id := NEW.account_id;
    END IF;

    -- Recalculate balance from all journal lines for this account
    -- Balance = SUM(debit) - SUM(credit) for asset/expense accounts
    -- Balance = SUM(credit) - SUM(debit) for liability/equity/revenue accounts
    UPDATE coa_accounts SET
        balance = CASE
            WHEN type IN ('ASSET', 'EXPENSE') THEN
                COALESCE((SELECT SUM(jl.debit) - SUM(jl.credit)
                          FROM journal_lines jl
                          JOIN journal_entries je ON je.id = jl.journal_entry_id
                          WHERE jl.account_id = acct_id AND je.is_posted = TRUE), 0)
            ELSE
                COALESCE((SELECT SUM(jl.credit) - SUM(jl.debit)
                          FROM journal_lines jl
                          JOIN journal_entries je ON je.id = jl.journal_entry_id
                          WHERE jl.account_id = acct_id AND je.is_posted = TRUE), 0)
        END,
        updated_at = NOW()
    WHERE id = acct_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on journal_lines insert/update/delete
DROP TRIGGER IF EXISTS trg_sync_account_balance ON journal_lines;
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW
EXECUTE FUNCTION sync_account_balance();

-- ==========================================
-- 5. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for coa_accounts" ON coa_accounts;
CREATE POLICY "Tenant isolation for coa_accounts" ON coa_accounts FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation for journal_entries" ON journal_entries;
CREATE POLICY "Tenant isolation for journal_entries" ON journal_entries FOR ALL USING (tenant_id = current_tenant_id());

-- journal_lines: isolated via journal_entries.tenant_id (joined)
DROP POLICY IF EXISTS "Tenant isolation for journal_lines" ON journal_lines;
CREATE POLICY "Tenant isolation for journal_lines" ON journal_lines
FOR ALL USING (
    journal_entry_id IN (
        SELECT id FROM journal_entries WHERE tenant_id = current_tenant_id()
    )
);
