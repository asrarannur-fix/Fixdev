import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { FileSpreadsheet } from "lucide-react";

interface CommissionPanelProps {
  activeSubTab: string;
}

export const CommissionPanel: React.FC<CommissionPanelProps> = ({
  activeSubTab,
}) => {
  const { scopedCommissions, employees } = useSaaS();
  const { showToast } = useToast();
  const [filterTech, setFilterTech] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  if (activeSubTab !== "commission") return null;

  const filtered = scopedCommissions.filter((c) => {
    const ts = new Date(c.timestamp);
    const ym = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}`;
    if (filterMonth && ym !== filterMonth) return false;
    if (filterTech && c.employeeId !== filterTech) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, c) => s + c.amount, 0);
  const pendingCount = filtered.filter((c) => c.status === "PENDING").length;
  const paidCount = filtered.filter((c) => c.status === "PAID").length;
  const uniqueTechs = new Set(filtered.map((c) => c.employeeId)).size;

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    return emp?.name || empId;
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      SERVICE: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
      SALES: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
      FIELD: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${map[type] || "bg-slate-100 text-slate-600"}`}>
        {type}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
      PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${map[status] || "bg-slate-100 text-slate-600"}`}>
        {status}
      </span>
    );
  };

  const techList = Array.from(new Set(filtered.map((c) => c.employeeId)));

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Komisi",
            value: `Rp ${totalAmount.toLocaleString("id-ID")}`,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Pending",
            value: String(pendingCount),
            color: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Paid",
            value: String(paidCount),
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Total Teknisi",
            value: String(uniqueTechs),
            color: "text-purple-600 dark:text-purple-400",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-zinc-950 dark:border-zinc-800"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              {kpi.label}
            </p>
            <p className={`text-lg font-extrabold font-mono ${kpi.color}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Periode
          </label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Teknisi
          </label>
          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          >
            <option value="">Semua Teknisi</option>
            {techList.map((empId) => (
              <option key={empId} value={empId}>
                {getEmployeeName(empId)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
            Buku Komisi Perbaikan Teknisi
          </h3>
          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            {filtered.length} transaksi
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
              Belum ada data komisi untuk periode ini.
            </p>
            <p className="text-[10px] text-slate-300 dark:text-zinc-600 mt-1">
              Komisi akan muncul setelah ada transaksi servis atau penjualan yang diselesaikan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Teknisi</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-zinc-400">
                      {new Date(c.timestamp).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-200">
                      {getEmployeeName(c.employeeId)}
                    </td>
                    <td className="px-4 py-3">{typeBadge(c.type)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {c.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
