import React from "react";

interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky bottom action bar for forms / detail screens.
 * Keeps primary actions (Save / Cancel) always visible while scrolling.
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`sticky bottom-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 mt-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-t border-slate-200 dark:border-zinc-800 flex items-center gap-3 flex-wrap shadow-[0_-4px_20px_rgba(0,0,0,0.04)] ${className}`}
  >
    {children}
  </div>
);
