/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accounting Routes — Dedicated endpoints for Chart of Accounts, Journal Entries,
 * Cash Transactions, and Financial Reports.
 */
import express from "express";
import { requireRoles, requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import {
  createAccountSchema, updateAccountSchema, createJournalEntrySchema, createCashTxSchema, validateBody,
  getAccounts, createAccount, updateAccount, createJournalEntry, createCashTransaction,
  getJournalEntries, getJournalEntryById, getTrialBalance, getProfitAndLoss,
} from "../controllers/accounting.controller.js";

const router = express.Router();
const accViewer = requireRoles("OWNER", "ADMIN", "MANAGER");
const accWriter = requireRoles("OWNER", "ADMIN");
const auth = requireSupabaseJwt;
const scope = requireTenantScope;

router.get("/accounts", auth, scope, accViewer, getAccounts);
router.post("/accounts", auth, scope, accWriter, validateBody(createAccountSchema), createAccount);
router.put("/accounts/:id", auth, scope, accWriter, validateBody(updateAccountSchema), updateAccount);
router.get("/journal", auth, scope, accViewer, getJournalEntries);
router.get("/journal/:id", auth, scope, accViewer, getJournalEntryById);
router.post("/journal", auth, scope, accWriter, validateBody(createJournalEntrySchema), createJournalEntry);
router.post("/cash", auth, scope, accWriter, validateBody(createCashTxSchema), createCashTransaction);
router.get("/trial-balance", auth, scope, accViewer, getTrialBalance);
router.get("/profit-and-loss", auth, scope, accViewer, getProfitAndLoss);

export default router;
