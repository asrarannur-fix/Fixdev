import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Accent = "primary" | "success" | "warning" | "danger" | "info";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Percentage change vs previous period. Positive = up. */
  delta?: number;
  icon?: React.ReactNode;
  accent?: Accent;
  /** Small trend series rendered as a sparkline. */
  spark?: number[];
  className?: string;
}

const ACCENT: Record<Accent, { icon: string; value: string; ring: string }> = {
  primary: {
    icon: "text-accent dark:text-accent",
    value: "text-slate-800 dark:text-zinc-100",
    ring: "bg-accent-lighter dark:bg-indigo-950/40",
  },
  success: {
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
    ring: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
    ring: "bg-amber-50 dark:bg-amber-950/40",
  },
  danger: {
    icon: "text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-300",
    ring: "bg-rose-50 dark:bg-rose-950/40",
  },
  info: {
    icon: "text-sky-600 dark:text-sky-400",
    value: "text-sky-700 dark:text-sky-300",
    ring: "bg-sky-50 dark:bg-sky-950/40",
  },
};

const Sparkline: React.FC<{ data: number[]; className: string }> = ({
  data,
  className,
}) => {
  if (data.length < 2) return null;
  const w = 80;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Compact KPI card used across all dashboards/reports. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  accent = "primary",
  spark,
  className = "",
}) => {
  const a = ACCENT[accent];
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm flex items-start justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
          {label}
        </p>
        <p className={`text-xl sm:text-2xl font-black ${a.value}`}>{value}</p>
        {delta !== undefined && (
          <p
            className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${
              up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {up ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {up ? "+" : ""}
            {delta}%
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {icon && (
          <div className={`p-2.5 rounded-xl ${a.ring} ${a.icon}`}>{icon}</div>
        )}
        {spark && <Sparkline data={spark} className={`w-20 h-7 ${a.icon}`} />}
      </div>
    </div>
  );
};
