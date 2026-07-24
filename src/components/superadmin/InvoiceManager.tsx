// InvoiceManager — Superadmin invoice management UI
import React, { useState, useEffect } from "react";

interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  date: string;
  dueDate: string;
  amount: number;
  tier: string;
  status: "PAID" | "UNPAID" | "OVERDUE" | "PENDING_VERIFICATION";
  billingCycle: "monthly" | "yearly";
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

export const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTenant, setFilterTenant] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/billing/subscription?tenantId=all");
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch {
      try {
        const tenantsRes = await apiFetch("/api/superadmin/tenants?pageSize=100");
        const tenants = (tenantsRes as any)?.rows || (tenantsRes as any)?.tenants || [];
        const allInvoices: Invoice[] = [];
        for (const t of tenants.slice(0, 50)) {
          try {
            const sub: any = await apiFetch(`/api/billing/subscription?tenantId=${t.id}`);
            if (sub?.invoices) {
              for (const inv of sub.invoices) {
                allInvoices.push({ ...inv, tenantName: t.name || t.subdomain || t.id });
              }
            }
          } catch {
            // skip tenant
          }
        }
        setInvoices(allInvoices);
      } catch {
        setError("Gagal memuat daftar invoice");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filtered = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterTenant && !(inv.tenantName || "").toLowerCase().includes(filterTenant.toLowerCase())) return false;
    if (filterDateFrom && inv.date < filterDateFrom) return false;
    if (filterDateTo && inv.date > filterDateTo) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const paidAmount = filtered.filter((i) => i.status === "PAID").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const overdueCount = filtered.filter((i) => i.status === "OVERDUE").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-xs text-slate-500">Total Terpilih</div>
          <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">{filtered.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-xs text-slate-500">Total Nilai</div>
          <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">Rp {totalAmount.toLocaleString("id-ID")}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-xs text-slate-500">Sudah Dibayar</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rp {paidAmount.toLocaleString("id-ID")}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Status</option>
          <option value="PAID">Lunas</option>
          <option value="UNPAID">Belum Lunas</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PENDING_VERIFICATION">Verifikasi</option>
        </select>
        <input
          type="text"
          placeholder="Cari tenant…"
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
        />
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-xs text-slate-400">s/d</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={loadInvoices}
          className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          🔄 Segarkan
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Invoice ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tenant</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tanggal</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Jatuh Tempo</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Paket</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Tidak ada invoice ditemukan</td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setShowDetail(true);
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.id.slice(0, 20)}…</td>
                  <td className="px-4 py-3 text-slate-800 dark:text-white font-medium">{inv.tenantName}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{inv.date}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {inv.dueDate}
                    {inv.status === "OVERDUE" && <span className="ml-2 text-red-500 text-xs">⚠️</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">Rp {Number(inv.amount).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {inv.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] || ""}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDetail && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetail(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detail Invoice</h3>
              <button onClick={() => setShowDetail(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ID</span><span className="font-mono">{selectedInvoice.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tenant</span><span>{selectedInvoice.tenantName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><span>{selectedInvoice.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Jatuh Tempo</span><span>{selectedInvoice.dueDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Paket</span><span>{selectedInvoice.tier}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cycle</span><span>{selectedInvoice.billingCycle}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold">Rp {Number(selectedInvoice.amount).toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedInvoice.status] || ""}`}>{selectedInvoice.status}</span></div>
              {selectedInvoice.paidAt && <div className="flex justify-between"><span className="text-slate-500">Dibayar</span><span>{selectedInvoice.paidAt}</span></div>}
              {selectedInvoice.periodStart && <div className="flex justify-between"><span className="text-slate-500">Periode</span><span>{selectedInvoice.periodStart} — {selectedInvoice.periodEnd}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
