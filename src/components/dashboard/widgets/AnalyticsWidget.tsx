import React from "react";
import { WidgetProps } from "../widgetTypes";
import { ServiceStatus } from "../../../types";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const AnalyticsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="bg-white dark:bg-zinc-950 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-zinc-800">
    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200 mb-3">Analitik Transaksi & Operasional</h4>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-2.5 border border-emerald-100 dark:border-emerald-900/30">
        <h5 className="font-black text-[11px] text-emerald-700 dark:text-emerald-400 mb-2">Transaksi Terakhir (POS)</h5>
        <div className="space-y-1.5">
          {data.transactions.slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex justify-between items-center text-[10px] py-1 bg-white/60 dark:bg-zinc-800/60 rounded-lg px-2.5">
              <div>
                <p className="font-bold text-slate-700 dark:text-zinc-200">{t.invoiceNo}</p>
                <p className="text-slate-400 dark:text-zinc-500 text-[9px]">{new Date(t.timestamp).toLocaleDateString("id-ID")}</p>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{fmtRupiah(t.grandTotal)}</span>
            </div>
          ))}
          {data.transactions.length === 0 && <p className="text-[10px] text-slate-400 italic">Belum ada transaksi.</p>}
        </div>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl p-2.5 border border-violet-100 dark:border-violet-900/30">
        <h5 className="font-black text-[11px] text-violet-700 dark:text-violet-400 mb-2">Status Pengerjaan Servis</h5>
        <div className="space-y-1.5">
          {data.services.slice(0, 5).map((s: any) => {
            const isDone = s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL;
            return (
              <div key={s.id} className="flex justify-between items-center text-[10px] py-1 bg-white/60 dark:bg-zinc-800/60 rounded-lg px-2.5">
                <div>
                  <p className="font-bold text-slate-700 dark:text-zinc-200">#{s.ticketNo} - {s.deviceName}</p>
                  <p className="text-slate-400 dark:text-zinc-500 text-[9px]">{s.deviceBrandModel}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full font-black text-[9px] ${
                  isDone ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                }`}>
                  {s.status}
                </span>
              </div>
            );
          })}
          {data.services.length === 0 && <p className="text-[10px] text-slate-400 italic">Belum ada tiket servis.</p>}
        </div>
      </div>
    </div>
  </div>
);