import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean | null;
  accentColor?: string;
  sub?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, trend, trendPositive, sub }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md transition-all duration-300 p-4">
    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-black text-slate-800 dark:text-zinc-100 mt-1 truncate tracking-tight">{value}</p>
    {trend && (
      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg mt-2 ${
        trendPositive === true ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' :
        trendPositive === false ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400' :
        'text-slate-400 bg-slate-50 dark:bg-zinc-800 dark:text-zinc-500'
      }`}>
        {trend}
      </span>
    )}
    {sub && (
      <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 truncate">{sub}</p>
    )}
  </div>
);
