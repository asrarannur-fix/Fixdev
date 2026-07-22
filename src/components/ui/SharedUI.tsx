import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  accent?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick, hover = false, accent = false }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-zinc-950 border ${
      accent ? "border-indigo-200 dark:border-indigo-800" : "border-slate-200 dark:border-zinc-800"
    } rounded-2xl p-4 shadow-sm ${
      hover ? "hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200" : ""
    } ${onClick ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </div>
);

export interface SectionCardProps extends CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, icon, action, children, className = "", ...rest }) => (
  <Card className={`space-y-4 ${className}`} {...rest}>
    {(title || icon) && (
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            {title && <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-200">{title}</h3>}
            {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    )}
    {children}
  </Card>
);

export interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "tight" | "normal" | "relaxed" | "loose";
  className?: string;
}

export const Grid: React.FC<GridProps> = ({ children, cols = 2, gap = "normal", className = "" }) => {
  const gapClass = { tight: "gap-2", normal: "gap-3", relaxed: "gap-4", loose: "gap-6" }[gap];
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  }[cols];
  return <div className={`grid ${colClass} ${gapClass} ${className}`}>{children}</div>;
};

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", type = "button" }) => {
  const base = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";
  const sizes = { sm: "px-3 py-1.5 text-[10px]", md: "px-4 py-2", lg: "px-5 py-2.5" };
  const styles = {
    primary: "bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-md",
    secondary: "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800",
    danger: "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200",
    ghost: "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${styles} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", className = "" }) => {
  const styles = {
    success: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30",
    warning: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30",
    danger: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30",
    info: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/30",
    neutral: "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ label, error, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>}
    <input className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${className}`} {...props} />
    {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }> = ({ label, error, children, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>}
    <select className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent ${className}`} {...props}>
      {children}
    </select>
    {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}
  </div>
);

export const Divider: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`border-t border-slate-100 dark:border-zinc-800 ${className}`} />
);

export const Spacer: React.FC<{ size?: "sm" | "md" | "lg" | "xl" }> = ({ size = "md" }) => (
  <div className={{ sm: "h-2", md: "h-4", lg: "h-6", xl: "h-8" }[size]} />
);

export const Loading: React.FC<{ text?: string }> = ({ text = "Memuat..." }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">{text}</p>
  </div>
);

export const EmptyState: React.FC<{ title?: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({
  title = "Tidak ada data",
  description = "Belum ada data untuk ditampilkan.",
  icon,
  action,
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center space-y-3">
    {icon && <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">{icon}</div>}
    <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">{title}</p>
    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">{description}</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);
