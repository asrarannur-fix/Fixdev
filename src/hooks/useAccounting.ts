/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Accounting API Hook — Server-side accounting operations.
 * Replaces client-side syncToApi for accounting data.
 */
import api from "../lib/api/client";
import type { COAAccount, JournalEntry } from "../types";

export interface UseAccountingProps {
  currentTenantId: string;
  currentBranchId: string;
}

export function useAccounting(props: UseAccountingProps) {
  const { currentTenantId, currentBranchId } = props;

  const headers = {
    "X-Tenant-ID": currentTenantId,
    "X-Branch-ID": currentBranchId,
  };

  // ──────────────────────────────────────────
  // COA ACCOUNTS
  // ──────────────────────────────────────────

  const fetchAccounts = async (type?: string): Promise<COAAccount[]> => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    const res = await api.get(`/accounting/accounts?${params.toString()}`, { headers });
    return res.data.data;
  };

  const createAccount = async (data: { code: string; name: string; type: string; isGroup?: boolean }): Promise<COAAccount> => {
    const res = await api.post("/accounting/accounts", data, { headers });
    return res.data.data;
  };

  const updateAccount = async (id: string, data: Partial<{ name: string; type: string; isGroup: boolean }>): Promise<COAAccount> => {
    const res = await api.put(`/accounting/accounts/${id}`, data, { headers });
    return res.data.data;
  };

  // ──────────────────────────────────────────
  // JOURNAL ENTRIES
  // ──────────────────────────────────────────

  const fetchJournalEntries = async (params?: { accountId?: string; from?: string; to?: string; sourceType?: string }): Promise<JournalEntry[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/accounting/journal?${query}`, { headers });
    return res.data.data;
  };

  const fetchJournalEntryById = async (id: string): Promise<JournalEntry> => {
    const res = await api.get(`/accounting/journal/${id}`, { headers });
    return res.data.data;
  };

  const createJournalEntry = async (data: {
    description: string;
    refNo?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    lines: { accountId: string; debit: number; credit: number; description?: string | null }[];
  }): Promise<JournalEntry> => {
    const res = await api.post("/accounting/journal", data, { headers });
    return res.data.data;
  };

  // ──────────────────────────────────────────
  // CASH TRANSACTIONS
  // ──────────────────────────────────────────

  const createCashTransaction = async (data: {
    type: "CASH_IN" | "CASH_OUT";
    amount: number;
    description: string;
    refNo?: string | null;
    toAccountId?: string | null;
    fromAccountId?: string | null;
  }): Promise<any> => {
    const res = await api.post("/accounting/cash", data, { headers });
    return res.data.data;
  };

  // ──────────────────────────────────────────
  // REPORTS
  // ──────────────────────────────────────────

  const fetchTrialBalance = async (): Promise<{
    accounts: COAAccount[];
    summary: { totalDebit: number; totalCredit: number; difference: number; isBalanced: boolean };
  }> => {
    const res = await api.get("/accounting/trial-balance", { headers });
    return res.data.data;
  };

  const fetchProfitAndLoss = async (from?: string, to?: string): Promise<{
    revenue: { code: string; name: string; balance: number }[];
    expense: { code: string; name: string; balance: number }[];
    summary: { totalRevenue: number; totalExpense: number; netProfit: number };
  }> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await api.get(`/accounting/profit-and-loss?${params.toString()}`, { headers });
    return res.data.data;
  };

  const fetchBalanceSheet = async (): Promise<{
    assets: COAAccount[];
    liabilities: COAAccount[];
    equity: COAAccount[];
    retainedEarnings: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    isBalanced: boolean;
  }> => {
    const res = await api.get("/accounting/balance-sheet", { headers });
    return res.data.data;
  };

  return {
    fetchAccounts,
    createAccount,
    updateAccount,
    fetchJournalEntries,
    fetchJournalEntryById,
    createJournalEntry,
    createCashTransaction,
    fetchTrialBalance,
    fetchProfitAndLoss,
    fetchBalanceSheet,
  };
}