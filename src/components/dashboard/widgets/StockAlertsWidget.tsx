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

export const StockAlertsWidget: React.FC<WidgetProps> = ({ data }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <GradientCard gradient="from-rose-500 via-red-500 to-orange-500 dark:from-rose-600 dark:via-red-600 dark:to-orange-600">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Stok Menipis</p>
        {data.lowStockCount > 0 && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/20 text-white animate-pulse">
            {data.lowStockCount}
          </span>
        )}
      </div>
      {data.lowStockItems.length === 0 ? (
        <p className="text-sm text-white font-bold">Stok aman semua</p>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
          {data.lowStockItems.slice(0, 4).map((item: any) => (
            <div key={item.id} className="flex justify-between items-center text-[10px] bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
              <span className="text-white/90 truncate w-2/3 font-medium">{item.name}</span>
              <span className="font-black text-white bg-white/20 px-1.5 py-0.5 rounded">{item.stockQty} {item.unit}</span>
            </div>
          ))}
        </div>
      )}
    </GradientCard>

    <GradientCard gradient="from-slate-500 via-gray-500 to-zinc-500 dark:from-slate-600 dark:via-gray-600 dark:to-zinc-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Total Produk</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">{data.totalProducts}</p>
      {data.deadStock > 0 && (
        <p className="text-[10px] font-bold text-white/70 mt-1">{data.deadStock} mati</p>
      )}
    </GradientCard>

    <GradientCard gradient="from-sky-500 via-blue-500 to-indigo-500 dark:from-sky-600 dark:via-blue-600 dark:to-indigo-600">
      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Transfer Stok</p>
      <p className="text-xl font-black text-white drop-shadow-sm tracking-tight">0</p>
    </GradientCard>
  </div>
);
