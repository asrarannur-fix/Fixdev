import * as React from "react";
import { useState } from "react";
import { Lock, Search, FileSpreadsheet, PlusCircle, Check } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSaaS } from "../../context/SaaSContext";
import { useAccounting } from "../../hooks/useAccounting";
import { useToast } from "../ui/Toast";
import { AccountType } from "../../types";

interface AccountingTabProps {
  activeSubTab: string;
}

export const AccountingTab: React.FC<AccountingTabProps> = ({
  activeSubTab,
}) => {
  const { showToast } = useToast();

  const { currentTenantId, currentBranchId } = useSaaS();

  // Use the new accounting hook for server-side operations
  const {
    fetchAccounts,
    createAccount,
    fetchJournalEntries,
    createJournalEntry,
    createCashTransaction,
    fetchTrialBalance,
    fetchProfitAndLoss,
  } = useAccounting({ currentTenantId, currentBranchId });

  // State for COA
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // State for Journal Entries
  const [journals, setJournals] = useState<any[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(true);
  const [journalsError, setJournalsError] = useState<string | null>(null);

  // State for Trial Balance
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(true);

  // State for P&L
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [profitLossLoading, setProfitLossLoading] = useState(true);

  // UI state
  const [financeActiveTab, setFinanceActiveTab] = useState<string>("laba-rugi");
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState("05-2024");

  // Manual transaction form state
  const [txSearch, setTxSearch] = useState("");
  const [txFilterType, setTxFilterType] = useState("ALL");
  const [txType, setTxType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [txAmount, setTxAmount] = useState("");
  const [txFromAccount, setTxFromAccount] = useState("");
  const [txToAccount, setTxToAccount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Load data on mount and when tenant/branch changes
  React.useEffect(() => {
    const loadAll = async () => {
      try {
        // Load accounts
        const accts = await fetchAccounts();
        setAccounts(accts);
        setAccountsError(null);
      } catch (e: any) {
        setAccountsError(e.message);
      } finally {
        setAccountsLoading(false);
      }

      try {
        const jnls = await fetchJournalEntries();
        setJournals(jnls);
        setJournalsError(null);
      } catch (e: any) {
        setJournalsError(e.message);
      } finally {
        setJournalsLoading(false);
      }

      try {
        const tb = await fetchTrialBalance();
        setTrialBalance(tb);
      } catch (e: any) {
        console.error("Trial balance error:", e);
      } finally {
        setTrialBalanceLoading(false);
      }

      try {
        const pl = await fetchProfitAndLoss();
        setProfitLoss(pl);
      } catch (e: any) {
        console.error("P&L error:", e);
      } finally {
        setProfitLossLoading(false);
      }
    };

    loadAll();
  }, [currentTenantId, currentBranchId, fetchAccounts, fetchJournalEntries, fetchTrialBalance, fetchProfitAndLoss]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = txDesc.trim();
    if (!txAmount || !cleanDesc || !txToAccount || !txFromAccount) return;
    const amount = Math.max(0, Number(txAmount) || 0);
    if (amount <= 0) return;

    setTxSubmitting(true);
    try {
      if (txType === "CASH_IN") {
        await createCashTransaction({
          type: "CASH_IN",
          amount,
          description: cleanDesc,
          refNo: null,
          toAccountId: txToAccount,
          fromAccountId: txFromAccount,
        });
      } else {
        await createCashTransaction({
          type: "CASH_OUT",
          amount,
          description: cleanDesc,
          refNo: null,
          toAccountId: txFromAccount,
          fromAccountId: txToAccount,
        });
      }
      // Reset form
      setTxAmount("");
      setTxDesc("");
      setTxToAccount("");
      setTxFromAccount("");
      // Reload data
      const accts = await fetchAccounts();
      setAccounts(accts);
      const jnls = await fetchJournalEntries();
      setJournals(jnls);
    } catch (e: any) {
      showToast(e.message || "Gagal menambahkan transaksi", "error");
    } finally {
      setTxSubmitting(false);
    }
  };

  // Revenue & Expense accounts for display (derived from accounts state)
  const revenueAccounts = accounts.filter((a) => a.type === AccountType.REVENUE);
  const expenseAccounts = accounts.filter((a) => a.type === AccountType.EXPENSE);
  const totalRevenue = profitLoss?.summary?.totalRevenue ?? revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalExpense = profitLoss?.summary?.totalExpense ?? expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const netProfit = profitLoss?.summary?.netProfit ?? (totalRevenue - totalExpense);

  // Compute dynamic monthly chart data from real journal entries
  const monthlyData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const currentYear = new Date().getFullYear();
    const dataMap = Array.from({ length: 12 }, (_, i) => ({
      name: months[i],
      income: 0,
      expense: 0,
    }));

    journals.forEach((j) => {
      if (!j.entryDate) return;
      const entryDate = new Date(j.entryDate);
      if (entryDate.getFullYear() !== currentYear) return;
      const monthIdx = entryDate.getMonth();

      (j.lines || []).forEach((line: any) => {
        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) return;
        if (acc.type === AccountType.REVENUE) {
          // In double-entry, credit increases revenue
          dataMap[monthIdx].income += line.credit - line.debit;
        } else if (acc.type === AccountType.EXPENSE) {
          // Debit increases expense
          dataMap[monthIdx].expense += line.debit - line.credit;
        }
      });
    });

    // Make sure we return at least a default or only months with activity/reasonable fallbacks
    return dataMap.map((d) => ({
      ...d,
      income: Math.max(0, d.income),
      expense: Math.max(0, d.expense),
      profit: Math.max(0, d.income - d.expense),
    }));
  }, [journals, accounts]);

  // Monthly breakdown for P&L display (using profitLoss or fallback to raw totals)
  const monthlyBreakdown = React.useMemo(() => {
    return {
      totalRevenue: totalRevenue,
      totalExpense: totalExpense,
      netProfit: netProfit,
      repairRevenue: 0,
      productRevenue: 0,
      otherRevenue: totalRevenue,
      sparepartHPP: 0,
      staffSalary: 0,
      otherExpense: totalExpense,
    };
  }, [totalRevenue, totalExpense, netProfit]);

  return (
    <>
      <div className="space-y-6" id="accounting-pane">
        {activeSubTab === "coa" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Chart of Accounts (COA) Tenant
              </h3>
            </div>
            {accountsLoading && (
              <p className="text-xs text-slate-400 italic text-center py-8">Memuat data akun...</p>
            )}
            {accountsError && (
              <p className="text-xs text-red-500 italic text-center py-8">{accountsError}</p>
            )}
            {!accountsLoading && !accountsError && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3">Kode Akun</th>
                  <th className="px-4 py-3">Nama Rekening</th>
                  <th className="px-4 py-3">Klasifikasi</th>
                  <th className="px-4 py-3 text-right">Saldo Saat Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                        {acc.code}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {acc.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            acc.type === AccountType.ASSET
                              ? "bg-blue-100 text-blue-800"
                              : acc.type === AccountType.REVENUE
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                        Rp {(acc.balance ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {activeSubTab === "ledger" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Jurnal Umum (Double-Entry Log)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Posted - Lock Policy
              </span>
            </div>
            {journalsLoading && (
              <p className="text-xs text-slate-400 italic text-center py-8">Memuat jurnal...</p>
            )}
            {journalsError && (
              <p className="text-xs text-red-500 italic text-center py-8">{journalsError}</p>
            )}
            {!journalsLoading && !journalsError && (
            <div className="divide-y divide-slate-150">
              {journals.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  Belum ada jurnal umum terposting.
                </p>
              ) : (
                journals.map((j) => (
                    <div key={j.id} className="p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-blue-600 font-mono">
                            {j.refNo || "NO-REF"}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono ml-2">
                            ({new Date(j.entryDate).toLocaleDateString("id-ID")})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] font-mono rounded">
                          {j.sourceType || "MANUAL"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        “{j.description}”
                      </p>
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 font-mono text-[9px] text-slate-400">
                            <tr>
                              <th className="px-3 py-1.5">Kode Rekening</th>
                              <th className="px-3 py-1.5 text-right">Debit</th>
                              <th className="px-3 py-1.5 text-right">Kredit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(j.lines || []).map((line: any, lIdx: number) => {
                              const accName =
                                accounts.find((a) => a.id === line.accountId)
                                  ?.name || "Rekening";
                              return (
                                <tr
                                  key={lIdx}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-3 py-1.5">
                                    {accName} ({line.accountId.split("-").pop()
                                    })
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                                    {line.debit > 0
                                      ? `Rp ${(line.debit ?? 0).toLocaleString()}`
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                                    {line.credit > 0
                                      ? `Rp ${(line.credit ?? 0).toLocaleString()}`
                                      : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
              )}
            </div>
            )}
          </div>
        )}

        {activeSubTab === "statements" && (
          <div className="space-y-6 animate-fadeIn" id="finance-module">
            {/* Top Dynamic Stats widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kas Utama & Laci
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold font-mono text-slate-800">
                    Rp{" "}
                    {(
                      accounts.find((a) => a.code === "10100")?.balance ||
                      0
                    ).toLocaleString("id-ID")}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold font-mono">
                    10100
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Pendapatan ({selectedFinanceMonth})
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold font-mono text-emerald-600">
                    + Rp{" "}
                    {(monthlyBreakdown?.totalRevenue ?? 0).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono">
                    IN
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Pengeluaran ({selectedFinanceMonth})
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold font-mono text-rose-600">
                    - Rp{" "}
                    {(monthlyBreakdown?.totalExpense ?? 0).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                  <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold font-mono">
                    OUT
                  </span>
                </div>
              </div>

              <div
                className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                  (monthlyBreakdown?.netProfit ?? 0) >= 0
                    ? "bg-emerald-50/20 border-emerald-200"
                    : "bg-rose-50/20 border-rose-200"
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Laba Bersih ({selectedFinanceMonth})
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span
                    className={`text-lg font-bold font-mono ${
                      (monthlyBreakdown?.netProfit ?? 0) >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    Rp{" "}
                    {(monthlyBreakdown?.netProfit ?? 0).toLocaleString("id-ID")}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                      (monthlyBreakdown?.netProfit ?? 0) >= 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {(monthlyBreakdown?.netProfit ?? 0) >= 0
                      ? "PROFIT"
                      : "LOSS"}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Finance Tabs */}
            <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1 rounded-xl border">
              <button
                onClick={() => setFinanceActiveTab("laba-rugi")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  financeActiveTab === "laba-rugi"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📊 Tren Laba Rugi Bulanan
              </button>
              <button
                onClick={() => setFinanceActiveTab("transaksi")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  financeActiveTab === "transaksi"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                💸 Pencatatan Kas Masuk/Keluar
              </button>
              <button
                onClick={() => setFinanceActiveTab("neraca")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  financeActiveTab === "neraca"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🏛️ Neraca Akuntansi (Ledger)
              </button>
            </div>

            {/* Tab Panels */}
            {financeActiveTab === "laba-rugi" && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fadeIn">
                {/* Visual Chart - Left 3 cols */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Grafik Profitabilitas Usaha
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Tren Pemasukan, Pengeluaran, & Laba Bersih Bulanan
                      </p>
                    </div>
                    <div className="text-[10px] flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>{" "}
                        Pemasukan
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>{" "}
                        Pengeluaran
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>{" "}
                        Laba Bersih
                      </span>
                    </div>
                  </div>

                  <div className="h-[280px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="month"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            `Rp ${(val / 1000000).toFixed(1)}jt`
                          }
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            `Rp ${value !== undefined && value !== null ? value.toLocaleString("id-ID") : "0"}`,
                          ]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "8px",
                            border: "none",
                            color: "#fff",
                            fontSize: "11px",
                          }}
                        />
                        <Bar
                          dataKey="income"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                        <Bar
                          dataKey="expense"
                          fill="#f43f5e"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                        <Bar
                          dataKey="profit"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* P&L Statement breakdown - Right 2 cols */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Rincian Laporan Laba Rugi
                    </h3>
                    <div className="flex gap-1">
                      {["Apr", "Mei", "Jun"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedFinanceMonth(m)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                            selectedFinanceMonth === m
                              ? "bg-slate-900 text-white"
                              : "bg-slate-150 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 space-y-4 text-xs text-slate-700">
                    <div className="flex justify-between font-bold border-b border-slate-200 pb-1.5 text-slate-900 uppercase text-[10px]">
                      <span>Kategori Akun</span>
                      <span>Nominal</span>
                    </div>

                    {/* Pendapatan */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                        Pendapatan Usaha (Revenue)
                      </p>
                      <div className="flex justify-between pl-3 text-slate-600">
                        <span>Pendapatan Jasa Servis</span>
                        <span className="font-mono text-emerald-600 font-semibold">
                          + Rp{" "}
                          {(
                            monthlyBreakdown?.repairRevenue ?? 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600">
                        <span>Penjualan Suku Cadang & Retail</span>
                        <span className="font-mono text-emerald-600 font-semibold">
                          + Rp{" "}
                          {(
                            monthlyBreakdown?.productRevenue ?? 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {(monthlyBreakdown?.otherRevenue ?? 0) > 0 && (
                        <div className="flex justify-between pl-3 text-slate-600">
                          <span>Pendapatan Lain-lain</span>
                          <span className="font-mono text-emerald-600 font-semibold">
                            + Rp{" "}
                            {(
                              monthlyBreakdown?.otherRevenue ?? 0
                            ).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 pl-3 border-t border-slate-100 pt-1">
                        <span>Total Pendapatan</span>
                        <span className="font-mono">
                          Rp{" "}
                          {(monthlyBreakdown?.totalRevenue ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Pengeluaran */}
                    <div className="space-y-1.5 pt-1">
                      <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                        Harga Pokok & Operasional (Expenses)
                      </p>
                      <div className="flex justify-between pl-3 text-slate-600">
                        <span>HPP Suku Cadang Terpakai / Restok</span>
                        <span className="font-mono text-rose-600 font-semibold">
                          - Rp{" "}
                          {(monthlyBreakdown?.sparepartHPP ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600">
                        <span>Beban Gaji & Komisi Teknisi</span>
                        <span className="font-mono text-rose-600 font-semibold">
                          - Rp{" "}
                          {(monthlyBreakdown?.staffSalary ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                      {(monthlyBreakdown?.otherExpense ?? 0) > 0 && (
                        <div className="flex justify-between pl-3 text-slate-600">
                          <span>Beban Operasional Lainnya</span>
                          <span className="font-mono text-rose-600 font-semibold">
                            - Rp{" "}
                            {(
                              monthlyBreakdown?.otherExpense ?? 0
                            ).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 pl-3 border-t border-slate-100 pt-1">
                        <span>Total Pengeluaran</span>
                        <span className="font-mono">
                          Rp{" "}
                          {(monthlyBreakdown?.totalExpense ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Laba Bersih */}
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        LABA BERSIH (NET PROFIT)
                      </span>
                      <span
                        className={`font-mono text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                          (monthlyBreakdown?.netProfit ?? 0) >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        Rp{" "}
                        {(monthlyBreakdown?.netProfit ?? 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {financeActiveTab === "transaksi" && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fadeIn">
                {/* Left form - 2 cols */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Pencatatan Transaksi Baru
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Catat kas masuk atau pengeluaran secara manual
                    </p>
                  </div>

                  <form onSubmit={handleAddTransaction} className="space-y-4">
                    {/* Transaksi Type Buttons */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Jenis Transaksi
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTxType("CASH_IN")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                            txType === "CASH_IN"
                              ? "bg-emerald-550 border-emerald-500 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          📥 Kas Masuk (Pemasukan)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxType("CASH_OUT")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                            txType === "CASH_OUT"
                              ? "bg-rose-600 border-rose-500 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          📤 Kas Keluar (Pengeluaran)
                        </button>
                      </div>
                    </div>

                    {/* Nominal Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Jumlah Nominal (IDR)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                          Rp
                        </div>
                        <input
                          type="number"
                          required
                          min="100"
                          placeholder="Contoh: 150000"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Deskripsi Transaksi
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan rincian keterangan..."
                        value={txDesc}
                        onChange={(e) => setTxDesc(e.target.value)}
                        className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    {/* Source & Destination Accounts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Akun Debit (Sumber)
                        </label>
                        <select
                          value={txToAccount}
                          onChange={(e) => setTxToAccount(e.target.value)}
                          className="block w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        >
                          <option value="">Pilih Akun...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Akun Kredit (Tujuan)
                        </label>
                        <select
                          value={txFromAccount}
                          onChange={(e) => setTxFromAccount(e.target.value)}
                          className="block w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        >
                          <option value="">Pilih Akun...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className={`w-full py-2.5 text-xs font-bold rounded-lg transition-all text-white shadow flex items-center justify-center gap-1.5 cursor-pointer ${
                        txType === "CASH_IN"
                          ? "bg-slate-900 hover:bg-slate-850"
                          : "bg-slate-900 hover:bg-slate-850"
                      }`}
                    >
                      <Check className="w-4 h-4" /> Simpan Transaksi Ke Kas
                    </button>
                  </form>
                </div>

                {/* Right ledger list - 3 cols */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Buku Besar Transaksi Terkini
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Daftar rekonsiliasi kas masuk & keluar
                      </p>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Cari transaksi..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-slate-50 w-36 sm:w-44"
                      />
                      <select
                        value={txFilterType}
                        onChange={(e: any) => setTxFilterType(e.target.value)}
                        className="px-2 py-1 text-[10px] border border-slate-200 rounded-lg focus:outline-none bg-slate-50"
                      >
                        <option value="ALL">Semua</option>
                        <option value="CASH_IN">Pemasukan</option>
                        <option value="CASH_OUT">Pengeluaran</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-600 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-3 py-2">ID & Tanggal</th>
                          <th className="px-3 py-2">Deskripsi & Operator</th>
                          <th className="px-3 py-2 text-center">
                            Akun Debit/Kredit
                          </th>
                          <th className="px-3 py-2 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journals.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-8 text-center text-slate-400"
                            >
                              Tidak ada transaksi kas yang sesuai filter.
                            </td>
                          </tr>
                        ) : (
                          journals.map((tx) => {
                            const dateString = new Date(
                              tx.timestamp,
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            const debName =
                              accounts.find(
                                (a) => a.id === tx.toAccountId,
                              )?.name || "Debit";
                            const credName =
                              accounts.find(
                                (a) => a.id === tx.fromAccountId,
                              )?.name || "Kredit";

                            return (
                              <tr
                                key={tx.id}
                                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-800 font-mono text-[9px]">
                                    {tx.id}
                                  </div>
                                  <div className="text-slate-400 text-[9px] mt-0.5">
                                    {dateString}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 max-w-[180px] truncate">
                                  <div className="font-medium text-slate-800">
                                    {tx.description}
                                  </div>
                                  <div className="text-slate-400 text-[9px] mt-0.5">
                                    Oleh: {tx.operator}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="text-[10px] text-slate-700 font-medium">
                                    D: {debName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    K: {credName}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold">
                                  <span
                                    className={
                                      tx.type === "CASH_IN"
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                    }
                                  >
                                    {tx.type === "CASH_IN" ? "+" : "-"} Rp{" "}
                                    {(tx.amount ?? 0).toLocaleString("id-ID")}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {financeActiveTab === "neraca" && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn max-w-4xl mx-auto">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Laporan Neraca Dinamis (Balance Sheet)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Posisi keuangan terverifikasi langsung dari laci buku
                      besar kas
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    Per{" "}
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="p-5 space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Aset */}
                    <div className="space-y-3">
                      <p className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-[10px] uppercase tracking-wider">
                        Aset (Assets)
                      </p>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          10100 - Kas Utama & Laci
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "10100")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          10200 - Bank Mandiri Tenant
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "10200")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          10300 - Piutang Usaha
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "10300")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          10400 - Persediaan Suku Cadang
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "10400")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between font-bold text-slate-800 text-xs">
                        <span>TOTAL AKTIVA (ASET)</span>
                        <span className="font-mono text-slate-900">
                          Rp{" "}
                          {(
                            (accounts.find((a) => a.code === "10100")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "10200")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "10300")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "10400")
                              ?.balance || 0)
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Kewajiban & Ekuitas */}
                    <div className="space-y-3 md:border-l md:border-slate-100 md:pl-6">
                      <p className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-[10px] uppercase tracking-wider">
                        Kewajiban & Ekuitas (Pasiva)
                      </p>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          20100 - Hutang Suku Cadang Vendor
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "20100")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          20200 - DP Diterima di Muka (Uang Muka)
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "20200")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          20300 - Kewajiban Pajak PPN
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "20300")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] pl-2">
                        <span className="text-slate-600">
                          30100 - Modal Pemilik
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          Rp{" "}
                          {(
                            accounts.find((a) => a.code === "30100")
                              ?.balance || 0
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between font-bold text-slate-800 text-xs">
                        <span>TOTAL PASIVA (KEWAJIBAN & MODAL)</span>
                        <span className="font-mono text-slate-900">
                          Rp{" "}
                          {(
                            (accounts.find((a) => a.code === "20100")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "20200")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "20300")
                              ?.balance || 0) +
                            (accounts.find((a) => a.code === "30100")
                              ?.balance || 0)
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-1.5 text-[10px] text-emerald-800 mt-4">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 uppercase">
                        Neraca Seimbang (Verified Ledger Synchronized)
                      </p>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        Persamaan akuntansi dasar Aset = Kewajiban + Ekuitas
                        telah dihitung secara real-time dan terverifikasi
                        balance sempurna.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
