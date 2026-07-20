import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "primary" | "secondary" | "danger" | "success" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: React.ComponentType<any>;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-bold rounded-lg cursor-pointer transition-all select-none duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-accent hover:bg-accent-hover text-white border border-transparent shadow-xs hover:shadow-md",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-transparent",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white border border-transparent shadow-xs hover:shadow-md",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-xs hover:shadow-md",
    outline:
      "bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800",
    ghost:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 border border-transparent",
  };

  const sizes = {
    xs: "px-2 py-1 text-[10px] gap-1",
    sm: "px-2.5 py-1.5 text-[11px] gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && (
        <Icon
          className={`shrink-0 ${size === "xs" ? "w-3 h-3" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}`}
        />
      )}
      {children}
    </button>
  );
};
