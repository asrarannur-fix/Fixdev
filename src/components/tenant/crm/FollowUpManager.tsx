import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { FollowUp } from "../../../types";
import { Clock, Plus, Trash2, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

export const FollowUpManager: React.FC = () => {
  const { followUps, addFollowUp, updateFollowUp, deleteFollowUp, customers, currentTenantId, users } = useSaaS();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);
  const tenantFollowUps = followUps
    .filter((f) => f.tenantId === currentTenantId)
    .filter((f) => statusFilter === "ALL" || f.status === statusFilter)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handleCreate = () => {
    if (!formCustomerId || !formTitle || !formDueDate) {
      showToast("Isi pelanggan, judul, dan tanggal jatuh tempo", "error");
      return;
    }
    addFollowUp({
      customerId: formCustomerId,
      title: formTitle,
      description: formDescription,
      dueDate: formDueDate,
      status: "PENDING",
      assignedTo: formAssignedTo || undefined,
    });
    showToast("Follow-up berhasil dibuat", "success");
    setShowForm(false);
    setFormTitle("");
    setFormDescription("");
    setFormDueDate("");
  };

  const handleComplete = (f: FollowUp) => {
    updateFollowUp(f.id, { status: "COMPLETED", completedAt: new Date().toISOString() });
    showToast("Follow-up diselesaikan", "success");
  };

  const getCustomerName = (customerId: string) => {
    return tenantCustomers.find((c) => c.id === customerId)?.name || "Unknown";
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700";
      case "OVERDUE": return "bg-red-100 text-red-700";
      case "CANCELLED": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const isOverdue = (f: FollowUp) => {
    return f.status === "PENDING" && new Date(f.dueDate) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Follow-Up Pelanggan</h3>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus className="w-3 h-3" /> Follow-Up Baru
          </button>
        </div>

        {showForm && (
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Pelanggan</label>
                <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none cursor-pointer">
                  <option value="">Pilih Pelanggan</option>
                  {tenantCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Jatuh Tempo</label>
                <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Judul</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Contoh: Telepon balik soal servis" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Deskripsi</label>
              <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg">Batal</button>
              <button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">Simpan</button>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
          {["ALL", "PENDING", "COMPLETED", "OVERDUE"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusFilter === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s === "ALL" ? "Semua" : s}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {tenantFollowUps.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada follow-up</div>
          ) : (
            tenantFollowUps.map((f) => (
              <div key={f.id} className={`px-5 py-3 flex items-center gap-4 ${isOverdue(f) ? "bg-red-50/50" : ""}`}>
                <div className="flex-shrink-0">
                  {f.status === "COMPLETED" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : isOverdue(f) ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Calendar className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-slate-800 truncate">{f.title}</p>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${statusColor(isOverdue(f) ? "OVERDUE" : f.status)}`}>
                      {isOverdue(f) ? "OVERDUE" : f.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{f.description}</p>
                  <p className="text-[10px] text-slate-400">
                    {getCustomerName(f.customerId)} · Jatuh tempo: {f.dueDate}
                  </p>
                </div>
                <div className="flex-shrink-0 flex gap-1">
                  {f.status === "PENDING" && (
                    <button onClick={() => handleComplete(f)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">
                      Selesai
                    </button>
                  )}
                  <button onClick={() => {
                    deleteFollowUp(f.id);
                    showToast("Follow-up dihapus", "success");
                  }} className="p-1 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
