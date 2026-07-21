import React, { useState, useEffect, useCallback } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { Wallet, RefreshCw } from "lucide-react";

interface Payable {
  id: string;
  receiptNo: string;
  createdAt: string;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  supplierName: string;
  ageDays: number;
}
interface Buckets { current: number; d30: number; d60: number; d90: number; over90: number; }

const rp = (n: number) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;

export const PayablesReport: React.FC = () => {
  const { apiFetch } = useSaaS();
  const { showToast } = useToast();
  const { prompt: showPrompt } = useConfirm();

  const [items, setItems] = useState<Payable[]>([]);
  const [buckets, setBuckets] = useState<Buckets>({ current: 0, d30: 0, d60: 0, d90: 0, over90: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/purchasing/payables");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setItems(body.data?.items || []);
      setBuckets(body.data?.buckets || { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 });
      setTotal(body.data?.totalOutstanding || 0);
    } catch (e: any) {
      showToast(e.message || "Gagal memuat data utang.", "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => { load(); }, [load]);

  const handlePay = async (p: Payable) => {
    const input = await showPrompt({ title: `Bayar Utang ${p.receiptNo}`, message: `Sisa utang ${rp(p.outstanding)}. Masukkan nominal pembayaran:`, defaultValue: String(Math.round(p.outstanding)), confirmLabel: "Bayar" });
    if (input == null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) { showToast("Nominal tidak valid.", "error"); return; }
    try {
      const res = await apiFetch("/api/purchasing/payments", {
        method: "POST",
        body: JSON.stringify({ goodsReceiptId: p.id, amount, method: "CASH" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      showToast(`Pembayaran ${body.data?.paymentNo} tercatat.`, "success");
      await load();
    } catch (e: any) {
      showToast(e.message || "Gagal mencatat pembayaran.", "error");
    }
  };

  const bucketCards = [
    ["Belum jatuh tempo (0-30h)", buckets.current, "text-emerald-700 bg-emerald-50"],
    ["31-60 hari", buckets.d30, "text-blue-700 bg-blue-50"],
    ["61-90 hari", buckets.d60, "text-amber-700 bg-amber-50"],
    ["91-120 hari", buckets.d90, "text-orange-700 bg-orange-50"],
    ["> 120 hari", buckets.over90, "text-rose-700 bg-rose-50"],
  ] as const;

  return (
    <div className="space-y-6" id="payables-pane">
      <div className="flex justify-between items-start bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" /> Utang Dagang (AP Aging)
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sisa utang pembelian kredit per supplier, dikelompokkan umur.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Muat ulang
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {bucketCards.map(([label, val, cls]) => (
          <div key={label} className={`rounded-xl p-3 ${cls}`}>
            <p className="text-[10px] font-bold uppercase opacity-80">{label}</p>
            <p className="mt-1 text-sm font-black">{rp(val)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rincian Utang</span>
          <span className="text-xs font-black text-rose-700">Total: {rp(total)}</span>
        </div>
        {loading ? (
          <p className="text-center text-xs text-slate-400 py-8">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">Tidak ada utang tertunggak. 🎉</p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">No Terima</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Umur</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Dibayar</th>
                <th className="px-4 py-3 text-right">Sisa</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.receiptNo}</td>
                  <td className="px-4 py-3 text-slate-600">{p.supplierName}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{new Date(p.createdAt).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-slate-600">{p.ageDays}h</td>
                  <td className="px-4 py-3 text-right font-mono">{rp(p.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{rp(p.amountPaid)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">{rp(p.outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handlePay(p)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                    >
                      Bayar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
