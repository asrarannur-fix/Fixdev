import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const CashFlowWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/40 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 hover:shadow-xl transition-all duration-300">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 dark:from-violet-600 dark:via-purple-600 dark:to-fuchsia-600" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
    <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

    <div className="relative p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Arus Kas</p>
          <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.cashFlow)}</p>
        </div>
        <div className="text-right space-y-1">
          <div className="inline-flex items-center gap-1 text-white bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <ArrowUpRight className="w-3 h-3" />
            {fmtRupiah(data.totalCashIn)}
          </div>
          <div className="inline-flex items-center gap-1 text-white/80 bg-white/15 px-2 py-0.5 rounded-lg text-[10px] font-bold">
            <ArrowDownRight className="w-3 h-3" />
            {fmtRupiah(data.totalCashOut)}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2 h-10 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/10">
        {[
          { label: "Masuk", value: data.totalCashIn, color: "from-emerald-300 to-emerald-400" },
          { label: "Keluar", value: data.totalCashOut, color: "from-rose-300 to-rose-400" },
          { label: "Bersih", value: Math.abs(data.cashFlow), color: data.cashFlow >= 0 ? "from-violet-300 to-purple-400" : "from-rose-300 to-red-400" },
        ].map((bar) => {
          const maxVal = Math.max(data.totalCashIn, data.totalCashOut, Math.abs(data.cashFlow), 1);
          const heightPct = (bar.value / maxVal) * 100;
          return (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 3 }}>
                <div className={`w-full h-full rounded-t-lg bg-gradient-to-t ${bar.color}`} />
              </div>
              <span className="text-[9px] font-bold text-white/80">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
