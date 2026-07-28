import React from "react";
import { ClipboardList, MapPin, Award, Clock } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

export const OperationsOverviewWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-indigo-100/60 dark:bg-indigo-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            (data.shifts || []).length > 0
              ? "bg-emerald-200 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400"
          }`}>
            {(data.shifts || []).filter((s: any) => s.status === 'OPEN').length} Aktif
          </span>
        </div>
        <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Shift POS</p>
        {(data.shifts || []).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Belum ada shift hari ini</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {(data.shifts || []).slice(0, 4).map((s: any) => (
              <div key={s.id} className="flex justify-between items-center text-[10px] bg-white/60 dark:bg-zinc-800/60 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-slate-600 dark:text-zinc-300 font-medium">
                    {new Date(s.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full font-black text-[9px] ${
                  s.status === "OPEN"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                }`}>
                  {s.status === "OPEN" ? "Aktif" : "Selesai"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-2xl p-3 border border-orange-100 dark:border-orange-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-orange-100/60 dark:bg-orange-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-200 dark:shadow-orange-900/30">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {(data.fieldVisits || []).length} Kunjungan
          </span>
        </div>
        <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">Kunjungan Lapangan</p>
        {(data.fieldVisits || []).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Belum ada kunjungan</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {(data.fieldVisits || []).slice(0, 4).map((v: any) => (
              <div key={v.id} className="flex justify-between items-center text-[10px] bg-white/60 dark:bg-zinc-800/60 rounded-lg px-2 py-1.5">
                <div>
                  <span className="text-slate-600 dark:text-zinc-300 font-medium">{v.technicianName || "Teknisi"}</span>
                  {v.issue && <p className="text-slate-400 dark:text-zinc-500 text-[9px] truncate w-32">{v.issue}</p>}
                </div>
                <span className={`px-1.5 py-0.5 rounded-full font-black text-[9px] ${
                  v.checkInTime
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                }`}>
                  {v.checkInTime ? "Check-in" : "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-amber-100/60 dark:bg-amber-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center mb-2 shadow-sm shadow-amber-200 dark:shadow-amber-900/30">
          <Award className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Total Poin Loyalitas</p>
        <p className="text-lg font-black text-amber-800 dark:text-amber-200">{(data.totalLoyaltyPoints || 0).toLocaleString()}</p>
        <p className="text-[9px] text-amber-500 dark:text-amber-400 mt-0.5">{data.totalCustomers || 0} pelanggan terdaftar</p>
      </div>
    </div>
  </div>
);
