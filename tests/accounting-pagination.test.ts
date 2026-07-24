import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { __setMockDb, __resetMockDb } from "../src/lib/db.ts";
import { getAccounts, getJournalEntries } from "../src/server/controllers/accounting.controller.ts";

const mockDbData = {
  coa_accounts: [
    { id: "acc-1", tenant_id: "tenant-1", code: "100", name: "Cash", type: "ASSET", is_group: false, balance: 1000, created_at: new Date("2024-01-01T00:00:00Z") },
    { id: "acc-2", tenant_id: "tenant-1", code: "200", name: "Revenue", type: "REVENUE", is_group: false, balance: 500, created_at: new Date("2024-01-02T00:00:00Z") },
    { id: "acc-3", tenant_id: "tenant-1", code: "300", name: "Expense", type: "EXPENSE", is_group: false, balance: 200, created_at: new Date("2024-01-03T00:00:00Z") },
    { id: "acc-4", tenant_id: "tenant-1", code: "400", name: "Equity", type: "EQUITY", is_group: false, balance: 1000, created_at: new Date("2024-01-04T00:00:00Z") },
    { id: "acc-5", tenant_id: "tenant-1", code: "500", name: "Another Asset", type: "ASSET", is_group: false, balance: 100, created_at: new Date("2024-01-05T00:00:00Z") },
    { id: "acc-6", tenant_id: "tenant-2", code: "100", name: "Cash", type: "ASSET", is_group: false, balance: 5000, created_at: new Date("2024-01-06T00:00:00Z") },
  ].sort((a, b) => a.code.localeCompare(b.code)),
  journal_entries: [
    { id: "je-1", tenant_id: "tenant-1", branch_id: "branch-1", description: "Entry 1", reference_no: "REF-001", source_type: "MANUAL", is_posted: true, created_by: "user-1", created_at: new Date("2024-01-01T00:00:00Z") },
    { id: "je-2", tenant_id: "tenant-1", branch_id: "branch-1", description: "Entry 2", reference_no: "REF-002", source_type: "MANUAL", is_posted: true, created_by: "user-1", created_at: new Date("2024-01-02T00:00:00Z") },
    { id: "je-3", tenant_id: "tenant-1", branch_id: "branch-1", description: "Entry 3", reference_no: "REF-003", source_type: "MANUAL", is_posted: true, created_by: "user-1", created_at: new Date("2024-01-03T00:00:00Z") },
    { id: "je-4", tenant_id: "tenant-1", branch_id: "branch-1", description: "Entry 4", reference_no: "REF-004", source_type: "MANUAL", is_posted: true, created_by: "user-1", created_at: new Date("2024-01-04T00:00:00Z") },
    { id: "je-5", tenant_id: "tenant-1", branch_id: "branch-1", description: "Entry 5", reference_no: "REF-005", source_type: "MANUAL", is_posted: true, created_by: "user-1", created_at: new Date("2024-01-05T00:00:00Z") },
    { id: "je-6", tenant_id: "tenant-2", branch_id: "branch-2", description: "Entry 6", reference_no: "REF-006", source_type: "MANUAL", is_posted: true, created_by: "user-2", created_at: new Date("2024-01-06T00:00:00Z") },
  ],
  journal_lines: [
    { id: "jline-1", journal_entry_id: "je-1", account_id: "acc-1", debit: 100, credit: 0, description: "Debit Cash" },
    { id: "jline-2", journal_entry_id: "je-1", account_id: "acc-2", debit: 0, credit: 100, description: "Credit Revenue" },
    { id: "jline-3", journal_entry_id: "je-2", account_id: "acc-1", debit: 200, credit: 0, description: "Debit Cash" },
    { id: "jline-4", journal_entry_id: "je-2", account_id: "acc-3", debit: 0, credit: 200, description: "Credit Expense" },
    { id: "jline-5", journal_entry_id: "je-3", account_id: "acc-1", debit: 50, credit: 0, description: "Debit Cash" },
    { id: "jline-6", journal_entry_id: "je-3", account_id: "acc-2", debit: 0, credit: 50, description: "Credit Revenue" },
    { id: "jline-7", journal_entry_id: "je-4", account_id: "acc-1", debit: 75, credit: 0, description: "Debit Cash" },
    { id: "jline-8", journal_entry_id: "je-4", account_id: "acc-3", debit: 0, credit: 75, description: "Credit Expense" },
    { id: "jline-9", journal_entry_id: "je-5", account_id: "acc-1", debit: 120, credit: 0, description: "Debit Cash" },
    { id: "jline-10", journal_entry_id: "je-5", account_id: "acc-2", debit: 0, credit: 120, description: "Credit Revenue" },
  ],
};

const testDbQuery = async (sql: string, params: any[]) => {
  if (sql.includes("FROM coa_accounts WHERE tenant_id = $1")) {
    const tenantId = params[0];
    let filtered = mockDbData.coa_accounts.filter((acc) => acc.tenant_id === tenantId);

    const typeIndex = params.findIndex((p, i) => i > 0 && ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(p));
    if (typeIndex > -1 && params[typeIndex]) {
      filtered = filtered.filter((acc) => acc.type === params[typeIndex]);
    }

    if (sql.includes("COUNT(*)")) {
      return { rows: [{ count: filtered.length }] };
    }

    const limit = params[params.length - 2];
    const offset = params[params.length - 1];
    return { rows: filtered.slice(offset, offset + limit) };
  }

  if (sql.includes("FROM journal_entries je")) {
    const tenantId = params[0];
    let filtered = mockDbData.journal_entries.filter((je) => je.tenant_id === tenantId);

    const sourceTypeIndex = params.findIndex((p, i) => i > 0 && ["POS_SALE", "SERVICE_PAYMENT", "PURCHASE", "MANUAL", "CASH_TX"].includes(p));
    if (sourceTypeIndex > -1 && params[sourceTypeIndex]) {
      filtered = filtered.filter((je) => je.source_type === params[sourceTypeIndex]);
    }

    const accountIdIndex = params.findIndex((p, i) => i > 0 && typeof p === "string" && p.startsWith("acc-"));
    if (accountIdIndex > -1 && params[accountIdIndex]) {
      const accountId = params[accountIdIndex];
      const entryIds = mockDbData.journal_lines
        .filter((jl) => jl.account_id === accountId)
        .map((jl) => jl.journal_entry_id);
      filtered = filtered.filter((je) => entryIds.includes(je.id));
    }

    if (sql.includes("COUNT(DISTINCT je.id)")) {
      return { rows: [{ count: filtered.length }] };
    }

    const limit = params[params.length - 2];
    const offset = params[params.length - 1];
    filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return { rows: filtered.slice(offset, offset + limit) };
  }

  if (sql.includes("FROM journal_lines jl")) {
    const entryIds = params[0];
    const filteredLines = mockDbData.journal_lines.filter((jl) => entryIds.includes(jl.journal_entry_id));
    return {
      rows: filteredLines.map((jl) => ({
        ...jl,
        accountCode: mockDbData.coa_accounts.find((acc) => acc.id === jl.account_id)?.code,
        accountName: mockDbData.coa_accounts.find((acc) => acc.id === jl.account_id)?.name,
      })),
    };
  }

  if (sql.includes("INSERT INTO audit_logs")) {
    return { rows: [] };
  }

  return { rows: [] };
}

const testDbTransaction = async (callback: (client: any) => Promise<any>) => {
  const client = { query: testDbQuery };
  return callback(client);
};

test.beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://user:***@host:port/database";
  __setMockDb(testDbQuery, testDbTransaction);
});

test.afterEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.DATABASE_URL;
  __resetMockDb();
});

test("getAccounts: returns paginated accounts", async () => {
  const req = {
    tenantId: "tenant-1",
    query: { limit: "2", offset: "0" },
  };

  const res = {
    json: (data: any) => {
      assert.equal(data.data.length, 2);
      assert.equal(data.total, 5);
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 0);
      assert.equal(data.data[0].code, "100");
      assert.equal(data.data[1].code, "200");
    },
    status: (code: number) => {
      assert.equal(code, 200);
      return res;
    },
  };

  await getAccounts(req, res);
});

test("getAccounts: returns correct offset", async () => {
  const req = {
    tenantId: "tenant-1",
    query: { limit: "2", offset: "2" },
  };

  const res = {
    json: (data: any) => {
      assert.equal(data.data.length, 2);
      assert.equal(data.total, 5);
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 2);
      assert.equal(data.data[0].code, "300");
      assert.equal(data.data[1].code, "400");
    },
    status: (code: number) => {
      assert.equal(code, 200);
      return res;
    },
  };

  await getAccounts(req, res);
});

test("getJournalEntries: returns paginated entries", async () => {
  const req = {
    tenantId: "tenant-1",
    query: { limit: "2", offset: "0" },
  };

  const res = {
    json: (data: any) => {
      assert.equal(data.data.length, 2);
      assert.equal(data.total, 5);
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 0);
      assert.equal(data.data[0].id, "je-5");
      assert.equal(data.data[1].id, "je-4");
    },
    status: (code: number) => {
      assert.equal(code, 200);
      return res;
    },
  };

  await getJournalEntries(req, res);
});

test("getJournalEntries: returns correct offset", async () => {
  const req = {
    tenantId: "tenant-1",
    query: { limit: "2", offset: "2" },
  };

  const res = {
    json: (data: any) => {
      assert.equal(data.data.length, 2);
      assert.equal(data.total, 5);
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 2);
      assert.equal(data.data[0].id, "je-3");
      assert.equal(data.data[1].id, "je-2");
    },
    status: (code: number) => {
      assert.equal(code, 200);
      return res;
    },
  };

  await getJournalEntries(req, res);
});
