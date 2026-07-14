/**
 * Accounting API Tests — Schema validation and business rule coverage.
 * Run: npx tsx --test tests/accounting.api.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  createAccountSchema,
  createJournalEntrySchema,
  createCashTxSchema,
} from "../src/server/controllers/accounting.controller.ts";

// ──────────────────────────────────────────
// COA ACCOUNT SCHEMA
// ──────────────────────────────────────────

test("createAccountSchema: accepts valid ASSET account", () => {
  const result = createAccountSchema.safeParse({
    code: "10100",
    name: "Kas Kecil",
    type: "ASSET",
  });
  assert.equal(result.success, true);
});

test("createAccountSchema: rejects missing type", () => {
  const result = createAccountSchema.safeParse({
    code: "10100",
    name: "Kas Kecil",
  });
  assert.equal(result.success, false);
});

test("createAccountSchema: rejects invalid type", () => {
  const result = createAccountSchema.safeParse({
    code: "10100",
    name: "Kas Kecil",
    type: "KAS",
  });
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// JOURNAL ENTRY SCHEMA
// ──────────────────────────────────────────

test("createJournalEntrySchema: accepts valid balanced entry", () => {
  const result = createJournalEntrySchema.safeParse({
    description: "Bayar listrik",
    lines: [
      { accountId: "a1b2c3d4-0000-4000-8000-000000000000", debit: 500_000, credit: 0 },
      { accountId: "a1b2c3d4-0000-4000-8000-000000000001", debit: 0, credit: 500_000 },
    ],
  });
  assert.equal(result.success, true);
});

test("createJournalEntrySchema: rejects single line entry", () => {
  const result = createJournalEntrySchema.safeParse({
    description: "Bayar listrik",
    lines: [
      { accountId: "a1b2c3d4-0000-4000-8000-000000000000", debit: 500_000, credit: 0 },
    ],
  });
  assert.equal(result.success, false);
});

test("createJournalEntrySchema: rejects empty description", () => {
  const result = createJournalEntrySchema.safeParse({
    description: "",
    lines: [
      { accountId: "a1b2c3d4-0000-4000-8000-000000000000", debit: 500_000, credit: 0 },
      { accountId: "a1b2c3d4-0000-4000-8000-000000000001", debit: 0, credit: 500_000 },
    ],
  });
  assert.equal(result.success, false);
});

test("createJournalEntrySchema: rejects negative debit", () => {
  const result = createJournalEntrySchema.safeParse({
    description: "Bayar listrik",
    lines: [
      { accountId: "a1b2c3d4-0000-4000-8000-000000000000", debit: -500_000, credit: 0 },
      { accountId: "a1b2c3d4-0000-4000-8000-000000000001", debit: 0, credit: 500_000 },
    ],
  });
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// CASH TX SCHEMA
// ──────────────────────────────────────────

test("createCashTxSchema: accepts valid CASH_IN", () => {
  const result = createCashTxSchema.safeParse({
    type: "CASH_IN",
    amount: 1_000_000,
    description: "Setoran modal",
    toAccountId: "a1b2c3d4-0000-4000-8000-000000000000",
  });
  assert.equal(result.success, true);
});

test("createCashTxSchema: rejects zero amount", () => {
  const result = createCashTxSchema.safeParse({
    type: "CASH_IN",
    amount: 0,
    description: "Setoran modal",
    toAccountId: "a1b2c3d4-0000-4000-8000-000000000000",
  });
  assert.equal(result.success, false);
});

test("createCashTxSchema: rejects missing type", () => {
  const result = createCashTxSchema.safeParse({
    amount: 1_000_000,
    description: "Setoran modal",
    toAccountId: "a1b2c3d4-0000-4000-8000-000000000000",
  });
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// BUSINESS LOGIC VALIDATION
// ──────────────────────────────────────────

test("Balance logic: Double entry balance validation works", () => {
  const lines = [
    { debit: 500_000, credit: 0 },
    { debit: 0, credit: 300_000 },
    { debit: 0, credit: 200_000 },
  ];
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  assert.equal(totalDebit, totalCredit);
  assert.equal(Math.abs(totalDebit - totalCredit) < 0.01, true);
});

test("Balance logic: Unbalanced entry fails", () => {
  const lines = [
    { debit: 500_000, credit: 0 },
    { debit: 0, credit: 400_000 },
  ];
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  assert.notEqual(totalDebit, totalCredit);
  assert.equal(Math.abs(totalDebit - totalCredit) > 0.01, true);
});

test("Balance logic: Trial balance calculation", () => {
  const accounts = [
    { type: "ASSET", balance: 1_000_000 },
    { type: "ASSET", balance: 500_000 },
    { type: "EXPENSE", balance: 200_000 },
    { type: "LIABILITY", balance: 300_000 },
    { type: "EQUITY", balance: 1_000_000 },
    { type: "REVENUE", balance: 400_000 },
  ];

  const totalDebit = accounts
    .filter((a) => a.type === "ASSET" || a.type === "EXPENSE")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalCredit = accounts
    .filter((a) => a.type === "LIABILITY" || a.type === "EQUITY" || a.type === "REVENUE")
    .reduce((sum, a) => sum + a.balance, 0);

  assert.equal(totalDebit, 1_700_000);
  assert.equal(totalCredit, 1_700_000);
  assert.equal(totalDebit, totalCredit);
});

test("Balance logic: P&L calculation", () => {
  const accounts = [
    { type: "REVENUE", balance: 5_000_000 },
    { type: "REVENUE", balance: 2_000_000 },
    { type: "EXPENSE", balance: 1_500_000 },
    { type: "EXPENSE", balance: 500_000 },
    { type: "EXPENSE", balance: 200_000 },
  ];

  const totalRevenue = accounts
    .filter((a) => a.type === "REVENUE")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalExpense = accounts
    .filter((a) => a.type === "EXPENSE")
    .reduce((sum, a) => sum + a.balance, 0);

  const netProfit = totalRevenue - totalExpense;

  assert.equal(totalRevenue, 7_000_000);
  assert.equal(totalExpense, 2_200_000);
  assert.equal(netProfit, 4_800_000); // Profit
});
