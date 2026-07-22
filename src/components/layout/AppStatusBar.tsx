import React from "react";
import { useSaaS } from "../../context/SaaSContext";
import { UserRole } from "../../types";

const roleLabel: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.OWNER]: "Owner",
  [UserRole.ADMIN]: "Admin",
  [UserRole.MANAGER]: "Manager",
  [UserRole.KASIR]: "Kasir",
  [UserRole.TEKNISI]: "Teknisi",
};

/** Thin global status bar shown at the bottom of the App Shell. */
export const AppStatusBar: React.FC = () => {
  const {
    currentUser,
    currentTenantId,
    currentBranchId,
    tenants,
    branches,
    platformHealth,
  } = useSaaS();

  const tenant = tenants.find((t) => t.id === currentTenantId);
  const branch = branches.find((b) => b.id === currentBranchId);
  const role = roleLabel[currentUser.role] ?? currentUser.role;

  const isHealthy = platformHealth.status === "ok";

  return (
    <footer
      className="hidden sm:flex items-center justify-between gap-3 px-4 sm:px-6 py-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm shrink-0"
      id="app-status-bar"
    >
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <span className="truncate">
          <span className="text-slate-500 dark:text-slate-400">Tenant:</span>{" "}
          {tenant?.name ?? "-"}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 shrink-0" />
        <span className="truncate">
          <span className="text-slate-500 dark:text-slate-400">Cabang:</span>{" "}
          {branch?.name ?? "-"}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 shrink-0" />
        <span className="truncate">
          <span className="text-slate-500 dark:text-slate-400">User:</span>{" "}
          {currentUser.name} · {role}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isHealthy ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        {isHealthy ? "Online" : "Offline"}
      </div>
    </footer>
  );
};
