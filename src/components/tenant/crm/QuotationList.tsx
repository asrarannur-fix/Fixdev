import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { CRMQuotation } from "../../../types";
import { FileSpreadsheet, Plus, Eye, Trash2, Send, Check, X } from "lucide-react";

interface QuotationListProps {
  onEdit: (customerId: string, quotation?: CRMQuotation) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({ onEdit }) => {
  const { customers, currentTenantId } = useSaaS();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);
  const allQuotations = tenantCustomers.flatMap((c) =>
    (c.quotations || []).map((q) => ({ ...q, customerName: c.name, customerId: c.id })),
  );

  const filtered = allQuotations.filter((q) => {
    if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
    if (searchQuery && !q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) && !q.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "DRAFT": return "bg-slate-100 text-slate-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "APPROVED": return "bg-emerald-100 text-emerald-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "EXPIRED": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Daftar Penawaran</h3>
          </div>
          <button onClick={() => onEdit("")} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus className="w-3 h-3" /> Baru
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex gap-3">
          <input
            type="text"
            placeholder="Cari pelanggan atau subjek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer">
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Terkirim</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="EXPIRED">Kadaluarsa</option>
          </select>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
            <tr>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Subjek</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Berlaku Hingga</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada penawaran</td></tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{q.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{q.subject}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">Rp {q.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{q.validUntil}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${statusColor(q.status)}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    <button onClick={() => onEdit(q.customerId, q)} className="p-1 hover:bg-slate-100 rounded">
                      <Eye className="w-3 h-3 text-slate-500" />
                    </button>
                    <button onClick={() => {
                      onEdit(q.customerId, { ...q, status: "SENT", sentAt: new Date().toISOString() });
                      showToast("Penawaran ditandai sebagai terkirim", "success");
                    }} className="p-1 hover:bg-blue-50 rounded" title="Kirim">
                      <Send className="w-3 h-3 text-blue-500" />
                    </button>
                    <button onClick={() => {
                      onEdit(q.customerId, { ...q, status: "APPROVED", approvedAt: new Date().toISOString() });
                      showToast("Penawaran disetujui", "success");
                    }} className="p-1 hover:bg-emerald-50 rounded" title="Setujui">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </button>
                    <button onClick={() => {
                      onEdit(q.customerId, { ...q, status: "REJECTED", rejectedAt: new Date().toISOString() });
                      showToast("Penawaran ditolak", "warning");
                    }} className="p-1 hover:bg-red-50 rounded" title="Tolak">
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
