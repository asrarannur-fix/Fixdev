import React from "react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

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

export const KPIBillingWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <GradientCard gradient="from-orange-500 via-amber-500 to-yellow-500 dark:from-orange-600 dark:via-amber-600 dark:to-yellow-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Tagihan Belum Dibayar</p>
        {data.totalBillingUnpaid > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Perlu ditindak
          </span>
        )}
      </div>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.totalBillingUnpaid)}</p>
    </GradientCard>

    <GradientCard gradient="from-red-500 via-rose-500 to-pink-500 dark:from-red-600 dark:via-rose-600 dark:to-pink-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Biaya Operasional</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.totalPayroll + data.totalBillingPaid)}</p>
    </GradientCard>
  </div>
);
