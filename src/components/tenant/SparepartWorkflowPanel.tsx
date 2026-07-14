import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { Package, CheckCircle, AlertCircle, Clock } from "lucide-react";

export const SparepartWorkflowPanel: React.FC = () => {
  const { services, products, currentTenantId, updateServiceTicket, adjustProductStock } = useSaaS();
  const { showToast: toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "inventory" | "approvals">("requests");

  const ticketsWithSpareparts = useMemo(() => {
    return services.filter((ticket) =>
      ticket.tenantId === currentTenantId &&
      ticket.partsRequested && ticket.partsRequested.length > 0
    );
  }, [services, currentTenantId]);

  const selectedTicket = useMemo(() => {
    return ticketsWithSpareparts.find((t) => t.id === selectedTicketId) || null;
  }, [ticketsWithSpareparts, selectedTicketId]);

  const approveSparepartRequest = async (sparepartId: string, action: "approve" | "reject") => {
    if (!selectedTicket) return;
    const updatedRequests = selectedTicket.partsRequested.map((req: any) =>
      req.sparepartId === sparepartId
        ? { ...req, status: action === "approve" ? "APPROVED" : "REJECTED" }
        : req
    );
    await updateServiceTicket(selectedTicket.id, { partsRequested: updatedRequests });
    toast(`Permintaan sparepart ${action === "approve" ? "disetujui" : "ditolak"}`, "success");
  };

  const issueSparepart = async (sparepartId: string, qty: number) => {
    if (!selectedTicket) return;
    const request = selectedTicket.partsRequested.find((req: any) => req.sparepartId === sparepartId);
    if (!request || request.status !== "APPROVED") { toast("Permintaan sparepart belum disetujui", "error"); return; }
    const safeQty = Math.max(0, Math.trunc(Number(qty) || 0));
    if (safeQty <= 0) { toast("Jumlah sparepart tidak valid", "error"); return; }
    const product = products.find(p => p.id === sparepartId && p.tenantId === currentTenantId);
    if (!product) { toast("Sparepart tidak valid untuk tenant ini", "error"); return; }
    const warehouseId = Object.keys(product?.warehouseStock || {})[0] || "";
    if (!warehouseId) { toast("Gudang tidak ditemukan", "error"); return; }
    const currentStock = product?.warehouseStock?.[warehouseId] || 0;
    if (currentStock < safeQty) { toast("Stock tidak mencukupi", "error"); return; }

    await adjustProductStock(sparepartId, warehouseId, safeQty, "OUT", `Issued tiket #${selectedTicket.ticketNo}`);
    const updatedRequests = selectedTicket.partsRequested.map((req: any) =>
      req.sparepartId === sparepartId
        ? { ...req, status: "ISSUED", issuedDate: new Date().toISOString() }
        : req
    );
    await updateServiceTicket(selectedTicket.id, { partsRequested: updatedRequests });
    toast("Sparepart berhasil di-issue", "success");
  };

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100 mb-2">Workflow Pengambilan Sparepart</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Kelola permintaan, persetujuan, dan issuance sparepart untuk tiket servis</p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Pilih Tiket Servis dengan Permintaan Sparepart:</label>
        <select value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-mono">
          <option value="">-- Pilih Tiket Servis --</option>
          {ticketsWithSpareparts.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>#{ticket.ticketNo} - {ticket.deviceName} ({ticket.status})</option>
          ))}
        </select>
      </div>

      {selectedTicket ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-lg font-black text-slate-800 dark:text-zinc-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" /> Daftar Permintaan
            </h4>
            {selectedTicket.partsRequested.map((req: any, idx: number) => {
              const product = products.find((p) => p.id === req.sparepartId);
              return (
                <div key={idx} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-800 dark:text-zinc-200">{product?.name || "Unknown"}</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">SKU: {product?.sku}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${req.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" : req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Diminta</p>
                      <p className="font-bold">{req.qty} unit</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Harga</p>
                      <p className="font-bold">{formatRupiah(product?.sellPrice || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Total</p>
                      <p className="font-bold text-emerald-600">{formatRupiah(req.qty * (product?.sellPrice || 0))}</p>
                    </div>
                  </div>
                  {req.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button onClick={() => approveSparepartRequest(req.sparepartId, "approve")} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg cursor-pointer">
                        <CheckCircle className="w-3.5 h-3.5" /> Setujui
                      </button>
                      <button onClick={() => approveSparepartRequest(req.sparepartId, "reject")} className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer">
                        <AlertCircle className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </div>
                  )}
                  {req.status === "APPROVED" && (
                    <button onClick={() => issueSparepart(req.sparepartId, req.qty)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg cursor-pointer">
                      <Package className="w-3.5 h-3.5" /> Issue ke Teknisi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
              <h5 className="font-bold text-slate-800 dark:text-zinc-200 mb-3">Detail Tiket</h5>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Tiket:</span><span className="font-mono font-bold">#{selectedTicket.ticketNo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Perangkat:</span><span className="font-medium">{selectedTicket.deviceName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="font-medium">{selectedTicket.status}</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700">
          <Package className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">Belum ada tiket dengan permintaan sparepart</p>
        </div>
      )}
    </div>
  );
};
