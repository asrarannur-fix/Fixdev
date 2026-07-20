import React from "react";
import { BarChart3, Users, Banknote, Clock } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const KPIOperationsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-2xl p-3 border border-pink-100 dark:border-pink-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-pink-100/60 dark:bg-pink-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-pink-500 flex items-center justify-center shadow-sm shadow-pink-200 dark:shadow-pink-900/30">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          {data.svcDelta !== null && data.svcDelta !== 0 && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${Number(data.svcDelta) > 0 ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"}`}>
              {Number(data.svcDelta) > 0 ? "+" : ""}{data.svcDelta}%
            </span>
          )}
        </div>
        <p className="text-[9px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-0.5">Servis Selesai</p>
        <p className="text-lg font-black text-pink-800 dark:text-pink-200">
          {data.completedServices} <span className="text-sm font-medium text-pink-400">/ {data.activeTickets}</span>
        </p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20 rounded-2xl p-3 border border-sky-100 dark:border-sky-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-sky-100/60 dark:bg-sky-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-sky-500 flex items-center justify-center mb-2 shadow-sm shadow-sky-200 dark:shadow-sky-900/30">
          <Users className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-0.5">Total Pelanggan</p>
        <p className="text-lg font-black text-sky-800 dark:text-sky-200">{data.totalCustomers}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-indigo-100/60 dark:bg-indigo-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-indigo-500 flex items-center justify-center mb-2 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
          <Banknote className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-accent dark:text-accent uppercase tracking-wider mb-0.5">Rata-rata Transaksi</p>
        <p className="text-lg font-black text-indigo-800 dark:text-indigo-200">{fmtRupiah(data.avgTicketValue)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 rounded-2xl p-3 border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-rose-100/60 dark:bg-rose-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-rose-500 flex items-center justify-center mb-2 shadow-sm shadow-rose-200 dark:shadow-rose-900/30">
          <Clock className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-0.5">Beban Gaji</p>
        <p className="text-lg font-black text-rose-800 dark:text-rose-200">{fmtRupiah(data.totalPayroll)}</p>
      </div>
    </div>
  </div>
);