import React, { useId } from "react";

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
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
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
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`w-full min-h-10 text-sm py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 focus:border-accent dark:focus:border-accent focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent/20 rounded-xl outline-none shadow-xs transition-all duration-200 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 ${
            Icon ? "pl-9" : "px-3"
          } ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span id={errorId} role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
};
