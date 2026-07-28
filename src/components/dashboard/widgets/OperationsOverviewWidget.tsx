import React from "react";
import { Clock, MapPin, Award } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

export const OperationsOverviewWidget: React.FC<WidgetProps> = ({ data, onSetTab }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all" onClick={() => onSetTab?.('pos', 'shift')}>
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-amber-100/60 dark:bg-amber-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-200 dark:shadow-amber-900/30">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          {data.activeShifts > 0 && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
              {data.activeShifts} aktif
            </span>
          )}
        </div>
        <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Shift Hari Ini</p>
        <p className="text-lg font-black text-amber-800 dark:text-amber-200">{data.todayShifts}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 rounded-2xl p-3 border border-teal-100 dark:border-teal-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-teal-100/60 dark:bg-teal-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-teal-500 flex items-center justify-center mb-2 shadow-sm shadow-teal-200 dark:shadow-teal-900/30">
          <MapPin className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-0.5">Kunjungan Lapangan</p>
        <p className="text-lg font-black text-teal-800 dark:text-teal-200">{data.fieldVisitsToday}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-2xl p-3 border border-violet-100 dark:border-violet-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-violet-100/60 dark:bg-violet-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center mb-2 shadow-sm shadow-violet-200 dark:shadow-violet-900/30">
          <Award className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">Total Loyalty Points</p>
        <p className="text-lg font-black text-violet-800 dark:text-violet-200">{data.totalLoyaltyPoints.toLocaleString('id-ID')}</p>
      </div>
    </div>
  </div>
);
