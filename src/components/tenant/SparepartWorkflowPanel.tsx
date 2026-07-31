import React, { useMemo, useState } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { AlertCircle, CheckCircle, Package } from "lucide-react";

export const SparepartWorkflowPanel: React.FC = () => {
  const { services, products, currentTenantId } = useSaaS();
  const { showToast: toast } = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const ticketsWithSpareparts = useMemo(() => services.filter((ticket) => ticket.tenantId === currentTenantId && ticket.partsRequested && ticket.partsRequested.length > 0), [services, currentTenantId]);
  const selectedTicket = useMemo(() => ticketsWithSpareparts.find((t) => t.id === selectedTicketId) || null, [ticketsWithSpareparts, selectedTicketId]);
  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-1 text-base font-black text-slate-900 dark:text-white">Workflow Pengambilan Sparepart</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400">Kelola permintaan, persetujuan, dan issuance sparepart untuk tiket servis</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-zinc-300">Pilih Tiket Servis dengan Permintaan Sparepart:</label>
        <select value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <option value="">-- Pilih Tiket Servis --</option>
          {ticketsWithSpareparts.map((ticket) => <option key={ticket.id} value={ticket.id}>#{ticket.ticketNo} - {ticket.deviceName} ({ticket.status})</option>)}
        </select>
      </div>
      {selectedTicket ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h4 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-zinc-200"><Package className="h-5 w-5 text-indigo-600" /> Daftar Permintaan</h4>
            {selectedTicket.partsRequested.map((req: any, idx: number) => {
              const product = products.find((p) => p.id === req.sparepartId);
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1"><h5 className="font-bold text-slate-800 dark:text-zinc-200">{product?.name || "Unknown"}</h5><p className="text-xs text-slate-500 dark:text-zinc-400">SKU: {product?.sku}</p></div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${req.status === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-700" : req.status === "APPROVED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{req.status}</span>
                  </div>
                  <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                    <div><p className="mb-1 text-xs text-slate-400">Diminta</p><p className="font-bold">{req.qty} unit</p></div>
                    <div><p className="mb-1 text-xs text-slate-400">Harga</p><p className="font-bold">{formatRupiah(product?.sellPrice || 0)}</p></div>
                    <div><p className="mb-1 text-xs text-slate-400">Total</p><p className="font-bold text-indigo-600">{formatRupiah(req.qty * (product?.sellPrice || 0))}</p></div>
                  </div>
                  {req.status === "PENDING" && <div className="flex gap-2"><button type="button" onClick={() => toast("Gunakan workflow service API untuk permintaan sparepart.", "error")} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> Setujui</button><button type="button" onClick={() => toast("Gunakan workflow service API untuk permintaan sparepart.", "error")} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700"><AlertCircle className="h-3.5 w-3.5" /> Tolak</button></div>}
                  {req.status === "APPROVED" && <button type="button" onClick={() => toast("Stok sparepart dipotong saat handover melalui workflow service API.", "error")} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-black text-white hover:bg-blue-700"><Package className="h-3.5 w-3.5" /> Issue ke Teknisi</button>}
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h5 className="mb-3 font-bold text-slate-800 dark:text-zinc-200">Detail Tiket</h5>
              <div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Tiket:</span><span className="font-mono font-bold">#{selectedTicket.ticketNo}</span></div><div className="flex justify-between"><span className="text-slate-500">Perangkat:</span><span className="font-medium">{selectedTicket.deviceName}</span></div><div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="font-medium">{selectedTicket.status}</span></div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950/50"><Package className="mx-auto mb-3 h-12 w-12 text-slate-400 dark:text-zinc-600" /><p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Belum ada tiket dengan permintaan sparepart</p></div>
      )}
    </div>
  );
};
