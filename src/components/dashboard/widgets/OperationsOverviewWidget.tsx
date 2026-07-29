import React from "react";
import { WidgetProps } from "../widgetTypes";

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

export const OperationsOverviewWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <GradientCard gradient="from-indigo-500 via-blue-500 to-cyan-500 dark:from-indigo-600 dark:via-blue-600 dark:to-cyan-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Shift POS</p>
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/20 text-white">
          {(data.shifts || []).filter((s: any) => s.status === 'OPEN').length} Aktif
        </span>
      </div>
      {(data.shifts || []).length === 0 ? (
        <p className="text-sm text-white/80 font-medium">Belum ada shift</p>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
          {(data.shifts || []).slice(0, 3).map((s: any) => (
            <div key={s.id} className="flex justify-between items-center text-[10px] bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
              <span className="text-white/90 font-medium">
                {new Date(s.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${
                s.status === "OPEN" ? "bg-white/25 text-white" : "bg-white/10 text-white/60"
              }`}>
                {s.status === "OPEN" ? "Aktif" : "Selesai"}
              </span>
            </div>
          ))}
        </div>
      )}
    </GradientCard>

    <GradientCard gradient="from-orange-500 via-amber-500 to-yellow-500 dark:from-orange-600 dark:via-amber-600 dark:to-yellow-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Kunjungan Lapangan</p>
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/20 text-white">
          {(data.fieldVisits || []).length}
        </span>
      </div>
      {(data.fieldVisits || []).length === 0 ? (
        <p className="text-sm text-white/80 font-medium">Belum ada kunjungan</p>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
          {(data.fieldVisits || []).slice(0, 3).map((v: any) => (
            <div key={v.id} className="flex justify-between items-center text-[10px] bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
              <span className="text-white/90 font-medium">{v.technicianName || "Teknisi"}</span>
              <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${
                v.checkInTime ? "bg-white/25 text-white" : "bg-white/15 text-white/80"
              }`}>
                {v.checkInTime ? "Check-in" : "Scheduled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </GradientCard>

    <GradientCard gradient="from-amber-500 via-yellow-500 to-lime-500 dark:from-amber-600 dark:via-yellow-600 dark:to-lime-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Poin Loyalitas</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{(data.totalLoyaltyPoints || 0).toLocaleString()}</p>
      <p className="text-[10px] text-white/70 mt-1">{data.totalCustomers || 0} pelanggan</p>
    </GradientCard>
  </div>
);
