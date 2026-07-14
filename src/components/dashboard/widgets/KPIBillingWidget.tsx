import React from "react";
import { Banknote, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const fmtRupiah = (n: number) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

export const KPIBillingWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-emerald-100/60 dark:bg-emerald-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
            <Banknote className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            data.activeSubscription ? "bg-emerald-200 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-200 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
          }`}>
            {data.activeSubscription ? "AKTIF" : "TRIAL"}
          </span>
        </div>
        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Status Langganan</p>
        <p className="text-lg font-black text-emerald-800 dark:text-emerald-200">{data.subscriptionTier}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 rounded-2xl p-3 border border-teal-100 dark:border-teal-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-teal-100/60 dark:bg-teal-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-teal-500 flex items-center justify-center mb-2 shadow-sm shadow-teal-200 dark:shadow-teal-900/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-0.5">Pembayaran SaaS</p>
        <p className="text-lg font-black text-teal-800 dark:text-teal-200">{fmtRupiah(data.totalBillingPaid)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-2xl p-3 border border-orange-100 dark:border-orange-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-orange-100/60 dark:bg-orange-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center mb-2 shadow-sm shadow-orange-200 dark:shadow-orange-900/30">
          <Clock className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-0.5">Tagihan Belum Dibayar</p>
        <p className="text-lg font-black text-orange-800 dark:text-orange-200">{fmtRupiah(data.totalBillingUnpaid)}</p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-2xl p-3 border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-red-100/60 dark:bg-red-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-red-500 flex items-center justify-center mb-2 shadow-sm shadow-red-200 dark:shadow-red-900/30">
          <AlertTriangle className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">Biaya Operasional</p>
        <p className="text-lg font-black text-red-800 dark:text-red-200">{fmtRupiah(data.totalPayroll + data.totalBillingPaid)}</p>
      </div>
    </div>
  </div>
);