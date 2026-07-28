import React from 'react';

interface KPICardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ icon, label, value, trend, trendPositive }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-violet-500 dark:from-pink-600 dark:to-violet-600 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-zinc-100 mt-1">{value}</p>
      </div>
      {trend && (
        <div className="text-right">
          <span className={`text-xs font-bold ${trendPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  </div>
);