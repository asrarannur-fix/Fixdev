import React from "react";

interface AppShellProps {
  /** Left navigation (sidebar + spacer) — hidden in horizontal mode. */
  sidebar?: React.ReactNode;
  /** Persistent top bar (tenant/branch switcher, search, profile). */
  topbar: React.ReactNode;
  /** Optional secondary horizontal navigation ribbon (modules/subtabs). */
  horizontalNav?: React.ReactNode;
  /** Thin status footer (tenant · branch · user · sync). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified application frame for RepairHub ERP.
 * Centralizes the outer layout so every module shares the same shell:
 * sidebar | (topbar + horizontalNav + scrollable content + status footer).
 */
export const AppShell: React.FC<AppShellProps> = ({
  sidebar,
  topbar,
  horizontalNav,
  footer,
  children,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col min-h-screen text-slate-800 dark:text-slate-200 relative overflow-x-hidden ${className}`}
      id="app-shell"
    >
      <div className="flex flex-1 min-h-0 w-full relative">
        {sidebar}
        <div
          className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden"
          id="content-pane-container"
        >
          {topbar}
          {horizontalNav}
          <main
            className="flex-1 overflow-y-auto p-3 sm:p-6"
            id="canvas-main-area"
          >
            {children}
          </main>
          {footer}
        </div>
      </div>
    </div>
  );
};
