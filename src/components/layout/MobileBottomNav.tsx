import React from "react";
import { useSaaS } from "../../context/SaaSContext";
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Package,
  BookOpen,
  Users,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  Monitor,
  Search,
} from "lucide-react";
import { getAvailableModules } from "../../config/nav.config";
import { getEffectiveFeatures, isModuleLocked } from "../../lib/featureUtils";

interface MobileBottomNavProps {
  activeTab: string;
  onSetTab: (tab: string) => void;
  onOpenSearch?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSetTab,
  onOpenSearch,
}) => {
  const { currentUser, tenants, currentTenantId } = useSaaS();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const tenantFeatures = getEffectiveFeatures(activeTenant || {});
  const userPermissions = currentUser.permissions || [];

  const availableModuleIds = getAvailableModules(tenantFeatures, userPermissions);

  const primaryTabs = ["overview", "pos", "services", "inventory", "crm", "settings"];
  const visibleTabs = primaryTabs.filter(
    (id) => (id === "overview" || availableModuleIds.includes(id)) &&
      (isSuperAdmin || !isModuleLocked(id, activeTenant || {})),
  );

  const getIcon = (modId: string) => {
    switch (modId) {
      case "overview":
        return <LayoutDashboard className="w-5 h-5" />;
      case "pos":
        return <ShoppingBag className="w-5 h-5" />;
      case "services":
        return <Wrench className="w-5 h-5" />;
      case "inventory":
        return <Package className="w-5 h-5" />;
      case "accounting":
        return <BookOpen className="w-5 h-5" />;
      case "hr":
        return <Users className="w-5 h-5" />;
      case "crm":
        return <Megaphone className="w-5 h-5" />;
      case "fraud":
        return <ShieldCheck className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = (modId: string) => {
    switch (modId) {
      case "overview":
        return "Dashboard";
      case "pos":
        return "Kasir";
      case "services":
        return "Servis";
      case "inventory":
        return "Stok";
      case "accounting":
        return "Akuntansi";
      case "hr":
        return "Karyawan";
      case "crm":
        return "CRM";
      case "fraud":
        return "Fraud";
      default:
        return modId;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5 safe-area-pb">
        {visibleTabs.map((modId) => {
          const isActive = activeTab === modId;
          return (
            <button
              key={modId}
              onClick={() => onSetTab(modId)}
              className={`flex flex-col items-center justify-center min-w-[64px] py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : ""
                }`}
              >
                {getIcon(modId)}
              </div>
              <span className="text-[9px] font-bold mt-0.5 truncate w-full text-center">
                {getLabel(modId)}
              </span>
            </button>
          );
        })}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center min-w-[64px] py-1.5 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-all cursor-pointer"
          >
            <div className="p-1.5 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold mt-0.5">Cari</span>
          </button>
        )}
      </div>
    </nav>
  );
};
