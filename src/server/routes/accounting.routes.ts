/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accounting Routes — Dedicated endpoints for Chart of Accounts, Journal Entries,
 * Cash Transactions, and Financial Reports.
 */
import express from "express";
import { requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import { sanctumAuthMiddleware, checkAbilities } from "../controllers/apiV1.controller.js";
import {
  createAccountSchema,
  updateAccountSchema,
  createJournalEntrySchema,
  createCashTxSchema,
  validateBody,
  getAccounts,
  createAccount,
  updateAccount,
  createJournalEntry,
  createCashTransaction,
  getJournalEntries,
  getJournalEntryById,
  getTrialBalance,
  getProfitAndLoss,
} from "../controllers/accounting.controller.js";

const router = express.Router();

// ──────────────────────────────────────────
// A. CHART OF ACCOUNTS (COA)
// ──────────────────────────────────────────

// List accounts (optionally filter by type)
router.get(
  "/accounts",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:read", "accounting-coa"]),
  getAccounts,
);

// Create new account
router.post(
  "/accounts",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:write", "accounting-coa"]),
  validateBody(createAccountSchema),
  createAccount,
);

// Update account
router.put(
  "/accounts/:id",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:write", "accounting-coa"]),
  validateBody(updateAccountSchema),
  updateAccount,
);

// ──────────────────────────────────────────
// B. JOURNAL ENTRIES (Double-Entry)
// ──────────────────────────────────────────

// List journal entries (with optional filters)
router.get(
  "/journal",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:read", "accounting-ledger"]),
  getJournalEntries,
);

// Get journal entry by ID (with lines)
router.get(
  "/journal/:id",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:read", "accounting-ledger"]),
  getJournalEntryById,
);

// Create new journal entry (with balance validation)
router.post(
  "/journal",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:write", "accounting-ledger"]),
  validateBody(createJournalEntrySchema),
  createJournalEntry,
);

// ──────────────────────────────────────────
// C. CASH TRANSACTIONS
// ──────────────────────────────────────────

// 4. CASH TRANSACTIONS
router.post(
  "/cash",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:write", "accounting-cash"]),
  validateBody(createCashTxSchema),
  createCashTransaction,
);

// ──────────────────────────────────────────
// D. FINANCIAL REPORTS
// ──────────────────────────────────────────

// Trial Balance
router.get(
  "/trial-balance",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:read", "accounting-reports"]),
  getTrialBalance,
);

// Profit & Loss
router.get(
  "/profit-and-loss",
  sanctumAuthMiddleware,
  requireSupabaseJwt,
  requireTenantScope,
  checkAbilities(["accounting:read", "accounting-reports"]),
  getProfitAndLoss,
);

export default router;