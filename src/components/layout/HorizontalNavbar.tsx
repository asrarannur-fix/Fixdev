import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSaaS, DEFAULT_ROLE_PERMISSIONS } from "../../context/SaaSContext";
import { UserRole } from "../../types";
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Package,
  BookOpen,
  UserCheck,
  Megaphone,
  Settings,
  AlertTriangle,
  Lock,
  Sliders,
  ChevronDown,
  ChevronRight,
  Monitor,
  Sidebar as SidebarIcon,
  Columns,
  Layers,
  CheckSquare,
  History,
  Globe,
  PlusCircle,
  Truck,
  Smartphone,
  ArrowRightLeft,
  Search,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  DollarSign,
  Users,
  Send,
  MessageSquare,
  GitBranch,
  Key,
  Printer,
  ShieldCheck,
  Eye,
  Trophy,
  FolderLock,
  Database,
  Code,
  Activity,
} from "lucide-react";

import { OPERATIONAL_MODULES } from "../../config/nav.config";
import { getEffectiveFeatures, getRequiredTierForModule, isModuleLocked as isFeatureLocked } from "../../lib/featureUtils";

interface HorizontalNavbarProps {
  activeTab: string;
  activeSubTab: string;
  onSetTab: (tab: string, subTab?: string) => void;
  setActiveSubTab: (subTab: string) => void;
  navigationMode: "sidebar" | "horizontal";
  setNavigationMode: (mode: "sidebar" | "horizontal") => void;
}

export const HorizontalNavbar: React.FC<HorizontalNavbarProps> = ({
  activeTab,
  activeSubTab,
  onSetTab,
  setActiveSubTab,
  navigationMode,
  setNavigationMode,
}) => {
  const { currentUser, tenants, currentTenantId } = useSaaS();
  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isOwner = currentUser.role === UserRole.OWNER;

  const [lockedFeatureInfo, setLockedFeatureInfo] = useState<{
    moduleName: string;
    featureName: string;
    requiredTier: "PRO" | "ENTERPRISE";
    description: string;
  } | null>(null);

  const isModuleLocked = (modId: string) =>
    !isSuperAdmin && isFeatureLocked(modId, activeTenant || {});

  const getLockedDescription = (modId: string) => {
    switch (modId) {
      case "accounting":
        return "Modul Keuangan & Buku membantu Anda melacak COA (Chart of Accounts), melihat jurnal umum & buku besar secara real-time, serta menyusun Laporan Laba Rugi dan Neraca otomatis.";
      case "hr":
        return "Modul Staff & Payroll memudahkan Anda melacak log absensi karyawan, memproses slip gaji (payroll) otomatis, serta mendistribusikan komisi pengerjaan teknisi.";
      case "crm":
        return "Modul CRM & Promosi membantu Anda melakukan segmentasi pelanggan, mengelola penawaran B2B, serta menyebarkan voucher promo via WhatsApp Broadcast.";
      case "fraud":
        return "Modul Keamanan & Audit mendeteksi keanehan transaksi void kasir dan melacak histori audit trail secara ketat.";
      default:
        return "Tingkatkan produktivitas bisnis Anda dengan mengaktifkan modul premium.";
    }
  };

  // Modules definition with matching icons
  // ponytail: Modules sourced centrally from nav.config.ts. Edit there.
  const modules = useMemo(
    () => OPERATIONAL_MODULES.map((mod) => ({
      ...mod,
      color: mod.color || "hover:text-accent",
      activeColor: mod.activeColor || "bg-accent text-white dark:bg-accent shadow-accent/10",
      subtabs: mod.subtabs || [],
    })),
    [],
  );

  const superAdminModules = useMemo(
    () => [
      {
        id: "saas-dashboard",
        label: "Ringkasan",
        desc: "KPI & Tindakan",
        icon: LayoutDashboard,
        color: "hover:text-blue-500",
        activeColor:
          "bg-blue-500 text-white dark:bg-blue-600 shadow-blue-500/10",
        subtabs: [
          {
            id: "saas-dashboard",
            label: "Dashboard Global",
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: "saas-tenants",
        label: "Tenant",
        desc: "Lifecycle Tenant",
        icon: Users,
        color: "hover:text-purple-500",
        activeColor:
          "bg-purple-600 text-white dark:bg-purple-500 shadow-purple-500/10",
        subtabs: [{ id: "saas-tenants", label: "Daftar Tenant", icon: Users }],
      },
      {
        id: "saas-billing",
        label: "Billing",
        desc: "Invoice & Verifikasi",
        icon: CreditCard,
        color: "hover:text-emerald-500",
        activeColor:
          "bg-emerald-600 text-white dark:bg-emerald-500 shadow-emerald-500/10",
        subtabs: [
          { id: "saas-billing", label: "Billing & QRIS", icon: CreditCard },
        ],
      },
      {
        id: "saas-operations",
        label: "Operasional",
        desc: "Health & Queue",
        icon: Activity,
        color: "hover:text-sky-500",
        activeColor: "bg-sky-600 text-white dark:bg-sky-500 shadow-sky-500/10",
        subtabs: [{ id: "saas-operations", label: "Health & Queue", icon: Activity }],
      },
      {
        id: "saas-audits",
        label: "Keamanan",
        desc: "Audit & Pemulihan",
        icon: FolderLock,
        color: "hover:text-amber-500",
        activeColor:
          "bg-amber-500 text-white dark:bg-amber-600 shadow-amber-500/10",
        subtabs: [
          { id: "saas-audits", label: "Audit Trails", icon: FolderLock },
        ],
      },
    ],
    [],
  );

  const userPermissions = useMemo(() => {
    if (isSuperAdmin) {
      return [];
    }
    const currentTenant = tenants.find((t) => t.id === currentTenantId);
    if (
      currentTenant?.rbacMatrix &&
      currentTenant.rbacMatrix[currentUser.role]
    ) {
      return currentTenant.rbacMatrix[currentUser.role];
    }
    return DEFAULT_ROLE_PERMISSIONS[currentUser.role] || [];
  }, [tenants, currentTenantId, currentUser.role, isSuperAdmin, isOwner]);


  const isSubmenuAllowed = (modId: string, subId: string) => {
    if (isSuperAdmin) return false;

    // Tier-based feature gating untuk settings subtabs
    if (modId === "settings") {
      const tenantFeatures = getEffectiveFeatures(activeTenant || {});

      // Settings subtab gating by tier features
      if (subId === "whatsapp" && !tenantFeatures.includes("WHATSAPP"))
        return false;
      if (
        subId === "notifications" &&
        !tenantFeatures.includes("WHATSAPP") &&
        !tenantFeatures.includes("TELEGRAM")
      )
        return false;
      if (subId === "workflows" && !tenantFeatures.includes("MARKETPLACE"))
        return false;
      if (subId === "developer-api" && !tenantFeatures.includes("SECURITY"))
        return false;

      if (
        isOwner ||
        currentUser.role === "ADMIN" ||
        currentUser.role === "SUPER_ADMIN"
      ) {
        return true;
      }
    }

    // Check specific fine-grained actions that correspond to submenus
    if (modId === "pos" && subId === "history") {
      return (
        userPermissions.includes("action-pos-invoice-view") ||
        userPermissions.includes("pos-history")
      );
    }
    if (modId === "hr" && subId === "payroll") {
      return (
        userPermissions.includes("action-hr-salary-edit") ||
        userPermissions.includes("action-hr-payroll-approve") ||
        userPermissions.includes("hr-payroll")
      );
    }
    if (modId === "hr" && subId === "kasbon") {
      return (
        userPermissions.includes("hr-kasbon") ||
        userPermissions.includes("hr-payroll") ||
        currentUser.role === "ADMIN" ||
        currentUser.role === "OWNER" ||
        currentUser.role === "MANAGER" ||
        currentUser.role === "HR"
      );
    }
    if (modId === "inventory" && subId === "trade-in") {
      return (
        userPermissions.includes("action-inventory-tradein-approve") ||
        userPermissions.includes("inventory-tradein")
      );
    }
    if (modId === "inventory" && subId === "cannibal") {
      return (
        userPermissions.includes("action-inventory-cannibal-scrap") ||
        userPermissions.includes("inventory-cannibal")
      );
    }

    if (modId === "services" && subId === "rental") {
      return true;
    }
    if (modId === "services" && subId === "warranty-claims") {
      return true;
    }
    if (modId === "inventory" && subId === "small-parts") {
      return true;
    }

    if (subId === "whatsapp") {
      return (
        userPermissions.includes("settings-whatsapp") ||
        userPermissions.includes("crm-whatsapp") ||
        userPermissions.includes(modId)
      );
    }

    let permKey = `${modId}-${subId}`;
    if (subId === "audit-log") permKey = "settings-audit";
    if (subId === "fraud-alert") permKey = "settings-fraud";
    return userPermissions.includes(permKey) || userPermissions.includes(modId);
  };

  // Filter modules to matching permissions
  const allowedModules = useMemo(() => {
    if (isSuperAdmin) {
      return [
        ...superAdminModules,
        {
          id: "customer-portal",
          label: "Customer Portal",
          desc: "Portal Hub",
          icon: Wrench,
          color: "hover:text-accent",
          activeColor:
            "bg-accent text-white dark:bg-indigo-500 shadow-accent/10",
          subtabs: [],
        },
        {
          id: "mobile-sim",
          label: "Mobile App",
          desc: "Mobile Version",
          icon: Smartphone,
          color: "hover:text-slate-500",
          activeColor:
            "bg-slate-700 text-white dark:bg-slate-600 shadow-slate-500/10",
          subtabs: [],
        },
      ];
    }

    // Filter regular tenant modules by what user is allowed to access
    const filtered = modules.filter(
      (mod) =>
        userPermissions.includes(mod.id) ||
        userPermissions.some(
          (perm) => perm === mod.id || perm.startsWith(mod.id + "-"),
        ),
    );

    const common = [
      {
        id: "customer-portal",
        label: "Customer Portal",
        desc: "Portal Hub",
        icon: Wrench,
        color: "hover:text-accent",
        activeColor:
          "bg-accent text-white dark:bg-indigo-500 shadow-accent/10",
        subtabs: [],
      },
      {
        id: "mobile-sim",
        label: "Mobile App",
        desc: "Mobile Version",
        icon: Smartphone,
        color: "hover:text-slate-500",
        activeColor:
          "bg-slate-700 text-white dark:bg-slate-600 shadow-slate-500/10",
        subtabs: [],
      },
    ];

    return [...filtered, ...common];
  }, [modules, superAdminModules, isSuperAdmin, userPermissions]);

  const activeModule = useMemo(() => {
    return allowedModules.find((m) => m.id === activeTab);
  }, [allowedModules, activeTab]);

  return (
    <div
      className="bg-white/80 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-900/60 shadow-xs px-6 py-2.5 flex flex-col gap-2 shrink-0 animate-fadeIn relative z-20"
      id="horizontal-navigation-ribbon"
    >
      {/* Level 1: Primary Module Switcher (Horizontal Scrolling Grid) */}
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex-grow flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1"
          id="horizontal-modules-scroll"
        >
          {allowedModules
            .map((mod) => {
              const Icon = mod.icon;
              const locked = isModuleLocked(mod.id);
              const requiredTier = getRequiredTierForModule(mod.id);
              const isActive = !locked && activeTab === mod.id;

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (locked) {
                      setLockedFeatureInfo({
                        moduleName: mod.label,
                        featureName: requiredTier,
                        requiredTier: requiredTier as "PRO" | "ENTERPRISE",
                        description: getLockedDescription(mod.id),
                      });
                      return;
                    }
                    onSetTab(mod.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 border select-none ${
                    locked
                      ? "bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                      : isActive
                        ? `${mod.activeColor} border-transparent shadow-md`
                        : `bg-slate-100/40 hover:bg-slate-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 border-slate-200/35 dark:border-zinc-800/40 text-slate-600 dark:text-slate-400 ${mod.color}`
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : ""} ${locked ? "text-amber-600 dark:text-amber-400" : ""}`}
                  />
                  <span>{mod.label}</span>
                  {locked && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/40 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      <Lock className="w-2.5 h-2.5" />
                      {requiredTier}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

      </div>

      {/* Level 2: Secondary Dynamic Sub-navigation Tabstrip */}
      {activeModule &&
        activeModule.subtabs &&
        Array.isArray(activeModule.subtabs) &&
        activeModule.subtabs.length > 0 && (
          <div
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 border-t border-slate-100 dark:border-zinc-900/60 pt-2"
            id="horizontal-subtabs-scroll"
          >
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none shrink-0 mr-1 flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-indigo-500" />
              Navigasi:
            </span>
            {activeModule.subtabs
              .filter((sub) => isSubmenuAllowed(activeModule.id, sub.id))
              .map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeSubTab === sub.id;

                return (
                  <button
                    key={sub.id}
                    onClick={() => onSetTab(activeTab, sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none ${
                      isSubActive
                        ? "bg-accent/10 text-accent dark:bg-indigo-500/10 dark:text-accent border border-accent/20 shadow-xs"
                        : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900 border border-transparent hover:border-slate-200/40 dark:hover:border-zinc-800/50"
                    }`}
                  >
                    <SubIcon className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
          </div>
        )}

      {/* Modern High-Fidelity Subscription Upgrade Dialog */}
      {lockedFeatureInfo && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          id="premium-upgrade-modal-horizontal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden transform scale-100 transition-all">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header Lock Icon */}
            <div className="flex items-center gap-4 mb-5 border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 tracking-wide uppercase">
                  Premium Module
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-tight">
                  {lockedFeatureInfo.moduleName} Terkunci
                </h4>
              </div>
            </div>

            {/* Feature Description */}
            <div className="space-y-4 mb-6">
              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                {lockedFeatureInfo.description}
              </p>

              {/* Requirement Alert Badge */}
              <div className="bg-indigo-500/10 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-accent dark:text-accent shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
                    Syarat Upgrade Paket
                  </h5>
                  <p className="text-[10px] text-accent/80 dark:text-accent/80 mt-0.5 leading-relaxed">
                    Fitur ini memerlukan paket langganan minimal{" "}
                    <strong className="text-accent dark:text-accent">
                      {lockedFeatureInfo.requiredTier}
                    </strong>{" "}
                    atau lebih tinggi. Status paket Anda saat ini adalah{" "}
                    <strong className="uppercase">
                      {activeTenant?.tier || "BASIC"}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setLockedFeatureInfo(null);
                  onSetTab("settings", "subscription");
                }}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-lg shadow-accent/15 hover:shadow-accent/25 transition-all duration-200 transform hover:scale-[1.01] active:scale-95 text-center cursor-pointer"
              >
                Tingkatkan Paket Sekarang &rarr;
              </button>
              <button
                onClick={() => setLockedFeatureInfo(null)}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700/80 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all duration-200 text-center cursor-pointer border border-transparent dark:border-zinc-800/40"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
