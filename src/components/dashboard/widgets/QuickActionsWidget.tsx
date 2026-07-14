import React from "react";
import { Wrench, ShoppingBag, Package, BarChart3, Users, ShieldAlert, Zap } from "lucide-react";
import { WidgetProps } from "../widgetTypes";

const ACTIONS = [
  { label: "Servis Baru", icon: Wrench, tab: "services", sub: "new-ticket", color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" },
  { label: "Transaksi POS", icon: ShoppingBag, tab: "pos", sub: "cashier", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  { label: "Transfer Stok", icon: Package, tab: "inventory", sub: "stock-transfer", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  { label: "Jurnal Akuntansi", icon: BarChart3, tab: "accounting", sub: "ledger", color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
  { label: "Pelanggan", icon: Users, tab: "crm", sub: "customers", color: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
  { label: "Keamanan", icon: ShieldAlert, tab: "fraud", sub: "audit-log", color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
];

export const QuickActionsWidget: React.FC<WidgetProps> = ({ onSetTab }) => (
  <div className="bg-white dark:bg-zinc-950 rounded-2xl p-3 shadow-sm border border-pink-100 dark:border-pink-900/30">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
        <Zap className="w-3 h-3 text-white" />
      </div>
      <h2 className="text-xs font-extrabold text-slate-800 dark:text-zinc-100">Aksi Cepat</h2>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onSetTab?.(action.tab, action.sub)}
          className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 px-2 py-2 text-center transition-all hover:shadow-sm group"
        >
          <div className={`w-7 h-7 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <action.icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  </div>
);