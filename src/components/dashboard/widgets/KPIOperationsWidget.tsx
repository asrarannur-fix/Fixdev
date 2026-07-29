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

export const KPIOperationsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <GradientCard gradient="from-pink-500 via-rose-500 to-red-500 dark:from-pink-600 dark:via-rose-600 dark:to-red-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Servis Selesai</p>
        {data.serviceDelta !== null && data.serviceDelta !== '0' && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/20 text-white">
            {Number(data.serviceDelta) > 0 ? "+" : ""}{data.serviceDelta}%
          </span>
        )}
      </div>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">
        {data.completedServices} <span className="text-sm font-medium text-white/60">/ {data.activeTickets}</span>
      </p>
    </GradientCard>

    <GradientCard gradient="from-sky-500 via-cyan-500 to-teal-500 dark:from-sky-600 dark:via-cyan-600 dark:to-teal-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Total Pelanggan</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{data.totalCustomers}</p>
    </GradientCard>

    <GradientCard gradient="from-indigo-500 via-blue-500 to-cyan-500 dark:from-indigo-600 dark:via-blue-600 dark:to-cyan-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Rata-rata Transaksi</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.avgTicketValue)}</p>
    </GradientCard>

    <GradientCard gradient="from-rose-500 via-pink-500 to-fuchsia-500 dark:from-rose-600 dark:via-pink-600 dark:to-fuchsia-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Beban Gaji</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{fmtRupiah(data.totalPayroll)}</p>
    </GradientCard>
  </div>
);
