/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accounting Routes — Dedicated endpoints for Chart of Accounts, Journal Entries,
 * Cash Transactions, and Financial Reports.
 */
import express from "express";
import { requireRoles, requireJwt, requireTenantScope, requireFeature } from "../../middleware/auth.middleware.js";
import {
  createAccountSchema, updateAccountSchema, createJournalEntrySchema, createCashTxSchema, validateBody,
  getAccounts, createAccount, updateAccount, createJournalEntry, createCashTransaction,
  getJournalEntries, getJournalEntryById, getTrialBalance, getBalanceSheet, getProfitAndLoss,
} from "../controllers/accounting.controller.js";

const router = express.Router();
const accViewer = requireRoles("OWNER", "ADMIN", "MANAGER");
const accWriter = requireRoles("OWNER", "ADMIN");
const auth = requireJwt;
const scope = requireTenantScope;

router.get("/accounts", auth, scope, requireFeature("ACCOUNTING"), accViewer, getAccounts);
router.post("/accounts", auth, scope, requireFeature("ACCOUNTING"), accWriter, validateBody(createAccountSchema), createAccount);
router.put("/accounts/:id", auth, scope, requireFeature("ACCOUNTING"), accWriter, validateBody(updateAccountSchema), updateAccount);
router.get("/journal", auth, scope, requireFeature("ACCOUNTING"), accViewer, getJournalEntries);
router.get("/journal/:id", auth, scope, requireFeature("ACCOUNTING"), accViewer, getJournalEntryById);
router.post("/journal", auth, scope, requireFeature("ACCOUNTING"), accWriter, validateBody(createJournalEntrySchema), createJournalEntry);
router.post("/cash", auth, scope, requireFeature("ACCOUNTING"), accWriter, validateBody(createCashTxSchema), createCashTransaction);
router.get("/trial-balance", auth, scope, requireFeature("ACCOUNTING"), accViewer, getTrialBalance);
router.get("/balance-sheet", auth, scope, requireFeature("ACCOUNTING"), accViewer, getBalanceSheet);
router.get("/profit-and-loss", auth, scope, accViewer, getProfitAndLoss);

export default router;
