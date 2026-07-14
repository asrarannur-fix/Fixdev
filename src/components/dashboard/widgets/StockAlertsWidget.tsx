import React from "react";
import { AlertTriangle, Package, Users } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

export const StockAlertsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 rounded-2xl p-3 border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-rose-100/60 dark:bg-rose-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-rose-500 flex items-center justify-center shadow-sm shadow-rose-200 dark:shadow-rose-900/30">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            {data.lowStockCount} Produk
          </span>
        </div>
        <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">Stok Menipis</p>
        {data.lowStockItems.length === 0 ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Stok aman semua ✓</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {data.lowStockItems.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-[10px] bg-white/60 dark:bg-zinc-800/60 rounded-lg px-2 py-1.5">
                <span className="text-slate-600 dark:text-zinc-300 truncate w-2/3 font-medium">{item.name}</span>
                <span className="font-black text-rose-600 dark:text-rose-400">{item.stockQty} {item.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-2xl p-3 border border-slate-200 dark:border-zinc-700 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-slate-100/60 dark:bg-zinc-700/60 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-slate-500 flex items-center justify-center mb-2 shadow-sm shadow-slate-200 dark:shadow-zinc-700">
          <Package className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">Total Produk</p>
        <p className="text-lg font-black text-slate-800 dark:text-zinc-100">
          {data.totalProducts} <span className="text-sm font-medium text-rose-400">/ {data.deadStock} mati</span>
        </p>
      </div>
    </div>

    <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 rounded-2xl p-3 border border-sky-100 dark:border-sky-900/30 shadow-sm relative overflow-hidden">
      <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-sky-100/60 dark:bg-sky-900/30 -mr-3 -mt-3" />
      <div className="relative">
        <div className="w-7 h-7 rounded-xl bg-sky-500 flex items-center justify-center mb-2 shadow-sm shadow-sky-200 dark:shadow-sky-900/30">
          <Users className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-0.5">Total Pelanggan</p>
        <p className="text-lg font-black text-sky-800 dark:text-sky-200">{data.totalCustomers}</p>
      </div>
    </div>
  </div>
);