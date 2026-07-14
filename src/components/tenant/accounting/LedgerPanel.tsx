import * as React from "react";
import { Check } from "lucide-react";
import { COAAccount as Account, JournalEntry, CashTransaction } from "../../../types";

interface LedgerPanelProps {
  journals: JournalEntry[];
  tenantId: string;
  accounts: Account[];
  cashTransactions: CashTransaction[];
  addJournalEntry: (refNo: string, desc: string, lines: any[]) => void;
  tenantAccounts: Account[];
}

export const LedgerPanel: React.FC<LedgerPanelProps> = ({ journals, tenantId, accounts, cashTransactions, addJournalEntry, tenantAccounts }) => {
  const [txSearch, setTxSearch] = React.useState("");
  const [txFilterType, setTxFilterType] = React.useState("ALL");
  const [txType, setTxType] = React.useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [txAmount, setTxAmount] = React.useState("");
  const [txFromAccount, setTxFromAccount] = React.useState("");
  const [txToAccount, setTxToAccount] = React.useState("");
  const [txDesc, setTxDesc] = React.useState("");

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = txDesc.trim();
    if (!txAmount || !cleanDesc || !txToAccount || !txFromAccount) return;
    const amount = Math.max(0, Number(txAmount) || 0);
    if (amount <= 0) return;

    const fromAccountExists = tenantAccounts.some((a) => a.id === txFromAccount);
    const toAccountExists = tenantAccounts.some((a) => a.id === txToAccount);
    if (!fromAccountExists || !toAccountExists) return;

    const refNo = `MANUAL/${new Date().getFullYear()}/${(journals.length + 1).toString().padStart(4, "0")}`;
    if (txType === "CASH_IN") {
      addJournalEntry(refNo, cleanDesc, [
        { accountId: txToAccount, debit: amount, credit: 0 },
        { accountId: txFromAccount, debit: 0, credit: amount },
      ]);
    } else {
      addJournalEntry(refNo, cleanDesc, [
        { accountId: txFromAccount, debit: amount, credit: 0 },
        { accountId: txToAccount, debit: 0, credit: amount },
      ]);
    }
    setTxAmount("");
    setTxDesc("");
    setTxToAccount("");
    setTxFromAccount("");
  };

  const filteredCashTransactions = cashTransactions.filter(tx => 
    (txFilterType === "ALL" || tx.type === txFilterType) &&
    (tx.description && tx.description.toLowerCase().includes(txSearch.toLowerCase()))
  );

  return (
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Jenis Transaksi
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTxType("CASH_IN")} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${ txType === "CASH_IN" ? "bg-emerald-550 border-emerald-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50" }`}>
                ?? Kas Masuk (Pemasukan)
              </button>
              <button type="button" onClick={() => setTxType("CASH_OUT")} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${ txType === "CASH_OUT" ? "bg-rose-600 border-rose-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50" }`}>
                ?? Kas Keluar (Pengeluaran)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Jumlah Nominal (IDR)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                Rp
              </div>
              <input type="number" required min="100" placeholder="Contoh: 150000" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Deskripsi Transaksi
            </label>
            <input type="text" required placeholder="Masukkan rincian keterangan..." value={txDesc} onChange={(e) => setTxDesc(e.target.value)} className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Akun Debit (Sumber)
              </label>
              <select value={txToAccount} onChange={(e) => setTxToAccount(e.target.value)} className="block w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white">
                <option value="">Pilih Akun...</option>
                {tenantAccounts.map((acc) => (
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
              <select value={txFromAccount} onChange={(e) => setTxFromAccount(e.target.value)} className="block w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white">
                <option value="">Pilih Akun...</option>
                {tenantAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className={`w-full py-2.5 text-xs font-bold rounded-lg transition-all text-white shadow flex items-center justify-center gap-1.5 cursor-pointer ${ txType === "CASH_IN" ? "bg-slate-900 hover:bg-slate-850" : "bg-slate-900 hover:bg-slate-850" }`}>
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
            <input type="text" placeholder="Cari transaksi..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-slate-50 w-36 sm:w-44" />
            <select value={txFilterType} onChange={(e: any) => setTxFilterType(e.target.value)} className="px-2 py-1 text-[10px] border border-slate-200 rounded-lg focus:outline-none bg-slate-50">
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
                <th className="px-3 py-2 text-center">Akun Debit/Kredit</th>
                <th className="px-3 py-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {filteredCashTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                    Tidak ada transaksi kas yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredCashTransactions.map((tx) => {
                  const dateString = new Date(tx.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                  const debName = tenantAccounts.find((a) => a.id === tx.toAccountId)?.name || "Debit";
                  const credName = tenantAccounts.find((a) => a.id === tx.fromAccountId)?.name || "Kredit";

                  return (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800 font-mono text-[9px]">{tx.id}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">{dateString}</div>
                      </td>
                      <td className="px-3 py-2.5 max-w-[180px] truncate">
                        <div className="font-medium text-slate-800">{tx.description}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">Oleh: {tx.operator}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="text-[10px] text-slate-700 font-medium">D: {debName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">K: {credName}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">
                        <span className={ tx.type === "CASH_IN" ? "text-emerald-600" : "text-rose-600" }>
                          {tx.type === "CASH_IN" ? "+" : "-"} Rp {tx.amount.toLocaleString("id-ID")}
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
  );
};
