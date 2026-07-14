import React from "react";
import { ArrowUpRight, ArrowDownRight, Banknote } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const CashFlowWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/20 rounded-2xl p-3 border border-violet-100 dark:border-violet-900/30 shadow-sm relative overflow-hidden">
    <div className="absolute top-2 right-2 w-16 h-16 rounded-full bg-violet-100/60 dark:bg-violet-900/20 -mr-4 -mt-4" />
    <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-fuchsia-100/60 dark:bg-fuchsia-900/20 -ml-3 -mb-3" />
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-200 dark:shadow-violet-900/30">
            <Banknote className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Arus Kas</p>
            <p className="text-lg font-black text-violet-800 dark:text-violet-200">{fmtRupiah(data.cashFlow)}</p>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-full">
            <ArrowUpRight className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">{fmtRupiah(data.totalCashIn)}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400 bg-white/80 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-full">
            <ArrowDownRight className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">{fmtRupiah(data.totalCashOut)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2 h-10 bg-white/40 dark:bg-zinc-800/40 rounded-xl p-2">
        {[
          { label: "Masuk", value: data.totalCashIn, color: "from-emerald-400 to-emerald-500" },
          { label: "Keluar", value: data.totalCashOut, color: "from-rose-400 to-rose-500" },
          { label: "Bersih", value: Math.abs(data.cashFlow), color: data.cashFlow >= 0 ? "from-violet-400 to-purple-500" : "from-rose-400 to-red-500" },
        ].map((bar) => {
          const maxVal = Math.max(data.totalCashIn, data.totalCashOut, Math.abs(data.cashFlow), 1);
          const heightPct = (bar.value / maxVal) * 100;
          return (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t-lg overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 3 }}>
                <div className={`w-full h-full rounded-t-lg bg-gradient-to-t ${bar.color}`} />
              </div>
              <span className="text-[8px] font-black text-violet-500 dark:text-violet-400">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);