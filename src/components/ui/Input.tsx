import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<any>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon: Icon,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-3 text-slate-400 dark:text-zinc-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          className={`w-full text-xs py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 focus:border-accent dark:focus:border-accent focus:ring-2 focus:ring-accent/10 dark:focus:ring-accent/10 rounded-xl outline-none shadow-xs transition-all duration-150 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 ${
            Icon ? "pl-9" : "px-3"
          } ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
};
