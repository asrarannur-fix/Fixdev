import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds inner padding (default true). */
  padded?: boolean;
  /** Adds hover elevation + pointer cursor for clickable cards. */
  interactive?: boolean;
}

/**
 * Standard surface container used across all modules.
 * Uses the same radius/border treatment as `.premium-card` for visual parity.
 */
export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  interactive = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm ${
        padded ? "p-4 sm:p-5" : ""
      } ${
        interactive
          ? "transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
