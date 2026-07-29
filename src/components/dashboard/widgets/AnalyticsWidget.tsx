import React from "react";
import { WidgetProps } from "../widgetTypes";
import { ServiceStatus } from "../../../types";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const AnalyticsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/40 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30">
    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-white/90 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950" />
    <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-violet-400/10 to-purple-500/10 rounded-full blur-3xl" />

    <div className="relative p-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-3">Analitik Transaksi & Operasional</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 border border-white/20">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <h5 className="font-black text-[10px] text-white uppercase tracking-widest mb-2">Transaksi Terakhir (POS)</h5>
          <div className="space-y-1">
            {data.transactions.slice(0, 4).map((t: any) => (
              <div key={t.id} className="flex justify-between items-center text-[10px] py-1 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 border border-white/10">
                <div>
                  <p className="font-bold text-white">{t.invoiceNo}</p>
                  <p className="text-white/60 text-[9px]">{new Date(t.timestamp).toLocaleDateString("id-ID")}</p>
                </div>
                <span className="font-black text-white bg-white/20 px-1.5 py-0.5 rounded">{fmtRupiah(t.grandTotal)}</span>
              </div>
            ))}
            {data.transactions.length === 0 && <p className="text-[10px] text-white/60 italic text-center py-2">Belum ada transaksi</p>}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 border border-white/20">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <h5 className="font-black text-[10px] text-white uppercase tracking-widest mb-2">Status Servis</h5>
          <div className="space-y-1">
            {data.services.slice(0, 4).map((s: any) => {
              const isDone = s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL;
              return (
                <div key={s.id} className="flex justify-between items-center text-[10px] py-1 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 border border-white/10">
                  <div>
                    <p className="font-bold text-white">#{s.ticketNo} - {s.deviceName}</p>
                    <p className="text-white/60 text-[9px]">{s.deviceBrandModel}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${
                    isDone ? "bg-white/25 text-white" : "bg-white/15 text-white/80"
                  }`}>
                    {s.status}
                  </span>
                </div>
              );
            })}
            {data.services.length === 0 && <p className="text-[10px] text-white/60 italic text-center py-2">Belum ada tiket</p>}
          </div>
        </div>
      </div>
    </div>
  </div>
);
