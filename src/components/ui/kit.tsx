import React from "react";

/* ==========================================================================
   Modern UI Kit — primitif bersama untuk tampilan seragam & kontemporer.
   Semua komponen mengambil token dari index.css (.ui-*) sehingga konsisten
   dengan light/dark mode dan mudah diselaraskan bila desain Figma ditambahkan.
   ========================================================================== */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export const Panel: React.FC<DivProps> = ({ className = "", children, ...rest }) => (
  <div className={`ui-card p-5 sm:p-6 ${className}`} {...rest}>
    {children}
  </div>
);

export const PanelHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  iconClass?: string;
}> = ({ icon, title, subtitle, right, iconClass = "bg-blue-100 dark:bg-blue-950/40 text-blue-600" }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-2.5">
      {icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
      )}
      <div>
        <h4 className="ui-section-title">{title}</h4>
        {subtitle && <p className="ui-section-sub">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, error, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
      {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">{error}</p>
    )}
  </div>
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className = "", invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={`ui-field ${invalid ? "ui-field--error" : ""} ${className}`}
      {...rest}
    />
  )
);
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className = "", invalid, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={`ui-field resize-none ${invalid ? "ui-field--error" : ""} ${className}`}
      {...rest}
    />
  )
);
TextArea.displayName = "TextArea";

export const SelectInput = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className = "", invalid, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={`ui-field cursor-pointer ${invalid ? "ui-field--error" : ""} ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
);
SelectInput.displayName = "SelectInput";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
};

export const Button: React.FC<BtnProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}) => (
  <button
    className={`ui-btn ui-btn--${variant} ${size === "lg" ? "ui-btn--lg" : ""} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export type PillTone = "blue" | "purple" | "amber" | "emerald" | "teal" | "rose" | "slate" | "indigo" | "sky";

const PILL_TONES: Record<PillTone, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  indigo: "bg-accent-lighter text-accent border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  teal: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50",
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
};

export const Pill: React.FC<{
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = "slate", children, className = "" }) => (
  <span className={`ui-pill ${PILL_TONES[tone]} ${className}`}>{children}</span>
);

export const SectionGrid: React.FC<DivProps> = ({ className = "", children, ...rest }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`} {...rest}>
    {children}
  </div>
);
