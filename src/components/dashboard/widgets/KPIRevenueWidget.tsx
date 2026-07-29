import React from "react";
import { TrendingUp, Banknote, Wrench, ShoppingBag, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

const DeltaBadge: React.FC<{ delta: string | null; good?: boolean }> = ({ delta, good = true }) => {
  if (!delta || delta === "0") return null;
  const num = parseFloat(delta);
  if (num === 0) return null;
  const isUp = num > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg ${
      isUp ? (good ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400")
      : (good ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400")
    }`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? "+" : ""}{delta}%
    </span>
  );
};

const GradientCard: React.FC<{
  children: React.ReactNode;
  gradient: string;
}> = ({ children, gradient }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/40 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30 hover:shadow-xl transition-all duration-300">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
    <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
    <div className="relative p-4">{children}</div>
  </div>
);

export const KPIRevenueWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <GradientCard gradient="from-emerald-400 via-teal-400 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Total Pendapatan</p>
        <DeltaBadge delta={data.revenueDelta} />
      </div>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.totalRevenue)}</p>
    </GradientCard>

    <GradientCard gradient="from-blue-500 via-indigo-500 to-violet-500 dark:from-blue-600 dark:via-indigo-600 dark:to-violet-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Pendapatan POS</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.posRevenue)}</p>
    </GradientCard>

    <GradientCard gradient="from-violet-500 via-purple-500 to-fuchsia-500 dark:from-violet-600 dark:via-purple-600 dark:to-fuchsia-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Pendapatan Servis</p>
        <DeltaBadge delta={data.serviceDelta} />
      </div>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.serviceRevenue)}</p>
    </GradientCard>

    <GradientCard gradient="from-amber-500 via-orange-500 to-red-500 dark:from-amber-600 dark:via-orange-600 dark:to-red-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Laba Kotor</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.grossProfit)}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${Math.max(0, Math.min(Number(data.profitMargin) || 0, 100))}%` }} />
        </div>
        <span className="text-[10px] font-bold text-white/80">{data.profitMargin}%</span>
      </div>
    </GradientCard>
  </div>
);
