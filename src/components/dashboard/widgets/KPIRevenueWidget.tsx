import React from "react";
import { TrendingUp, Banknote, Wrench, ShoppingBag, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

const DeltaBadge: React.FC<{ delta: string | null; good?: boolean }> = ({ delta, good = true }) => {
  if (!delta || delta === "0") return null;
  const num = parseFloat(delta);
  if (num === 0) return null;
  const isUp = num > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
      isUp ? (good ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400")
      : (good ? "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400")
    }`}>
      {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {isUp ? "+" : ""}{delta}%
    </span>
  );
};

export const KPIRevenueWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-emerald-100/60 dark:bg-emerald-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
            <Banknote className="w-3.5 h-3.5 text-white" />
          </div>
          <DeltaBadge delta={data.revenueDelta} />
        </div>
        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Total Pendapatan</p>
        <p className="text-lg font-black text-emerald-800 dark:text-emerald-200">{fmtRupiah(data.totalRevenue)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-blue-100/60 dark:bg-blue-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center mb-2 shadow-sm shadow-blue-200 dark:shadow-blue-900/30">
          <ShoppingBag className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Pendapatan POS</p>
        <p className="text-lg font-black text-blue-800 dark:text-blue-200">{fmtRupiah(data.posRevenue)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-2xl p-3 border border-violet-100 dark:border-violet-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-violet-100/60 dark:bg-violet-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-200 dark:shadow-violet-900/30">
            <Wrench className="w-3.5 h-3.5 text-white" />
          </div>
          <DeltaBadge delta={data.serviceDelta} />
        </div>
        <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">Pendapatan Servis</p>
        <p className="text-lg font-black text-violet-800 dark:text-violet-200">{fmtRupiah(data.serviceRevenue)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-amber-100/60 dark:bg-amber-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center mb-2 shadow-sm shadow-amber-200 dark:shadow-amber-900/30">
          <TrendingUp className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Laba Kotor</p>
        <p className="text-lg font-black text-amber-800 dark:text-amber-200">{fmtRupiah(data.grossProfit)}</p>
        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Margin: {data.profitMargin}%</span>
      </div>
    </div>
  </div>
);
