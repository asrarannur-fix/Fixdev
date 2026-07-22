/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSaaS, DEFAULT_ROLE_PERMISSIONS } from "../../context/SaaSContext";
import { UserRole } from "../../types";
import { OPERATIONAL_MODULES } from "../../config/nav.config";
import { getEffectiveFeatures, getRequiredTierForModule, isModuleLocked as isFeatureLocked, isTrialActive } from "../../lib/featureUtils";
import { RoleAvatar } from "../ui";
import { PasswordChangeModal } from "../ui/PasswordChangeModal";
import { WhiteLabelGate } from "../ui/WhiteLabelGate";
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
  UserCheck,
  Smartphone,
  HelpCircle,
  History,
  AlertTriangle,
  FolderLock,
  PlusCircle,
  Truck,
  CheckSquare,
  ArrowRightLeft,
  Sparkles,
  FileSpreadsheet,
  TrendingUp,
  Sliders,
  CreditCard,
  DollarSign,
  ChevronDown,
  Search,
  X,
  Globe,
  Layers,
  Key,
  GitBranch,
  QrCode,
  Printer,
  Database,
  Lock,
  Code,
  Activity,
  Building2,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

const getModuleColorClass = (modId: string) => {
  switch (modId) {
    case "overview":
    case "saas-dashboard":
      return "text-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400";
    case "services":
      return "text-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400";
    case "pos":
    case "saas-billing":
      return "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400";
    case "inventory":
    case "saas-audits":
      return "text-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400";
    case "accounting":
      return "text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400";
    case "hr":
      return "text-sky-500 bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400";
    case "crm":
    case "saas-tenants":
      return "text-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400";
    case "settings":
      return "text-teal-500 bg-teal-50 dark:bg-teal-950/20 dark:text-teal-400";
    case "fraud":
      return "text-slate-500 bg-slate-100 dark:bg-zinc-900/80 dark:text-slate-400";
    case "customer-portal":
      return "text-accent bg-accent-lighter dark:bg-indigo-950/20 dark:text-accent";
    case "mobile-sim":
      return "text-slate-500 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-400";
    default:
      return "text-slate-500 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-400";
  }
};

interface SidebarProps {
  activeTab: string;
  activeSubTab: string;
  onSetTab: (tab: string, subTab?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSearch?: () => void;
  navigationMode?: "sidebar" | "horizontal";
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeSubTab,
  onSetTab,
  isOpen = false,
  onClose,
  onOpenSearch,
  navigationMode = "sidebar",
}) => {
  const {
    currentUser,
    tenants,
    currentTenantId,
    branches,
    currentBranchId,
    switchBranch,
    theme,
    toggleTheme,
    logoutUser,
  } = useSaaS();
  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isOwner = currentUser.role === UserRole.OWNER;

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const tenantBranches = useMemo(() => {
    let filtered = branches.filter((b: any) => b.tenantId === currentTenantId);
    if (currentUser && (currentUser as any).branchIds && (currentUser as any).branchIds.length > 0) {
      filtered = filtered.filter((b: any) => (currentUser as any).branchIds.includes(b.id));
    }
    return filtered;
  }, [branches, currentTenantId, currentUser]);

  const roleLabel =
    {
      [UserRole.SUPER_ADMIN]: "Super Admin",
      [UserRole.OWNER]: "Owner",
      [UserRole.ADMIN]: "Admin",
      [UserRole.MANAGER]: "Manager",
      [UserRole.KASIR]: "Kasir",
      [UserRole.TEKNISI]: "Teknisi",
    }[currentUser.role] ?? currentUser.role;

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
        return "Modul Keuangan & Buku membantu Anda melacak COA (Chart of Accounts), melihat jurnal umum & buku besar secara real-time, serta menyusun Laporan Laba Rugi dan Neraca otomatis untuk bisnis reparasi Anda.";
      case "hr":
        return "Modul Staff & Payroll memudahkan Anda melacak log absensi karyawan, memproses slip gaji (payroll) otomatis, mendistribusikan komisi pengerjaan teknisi, serta mengelola pengajuan kasbon staff secara terintegrasi.";
      case "crm":
        return "Modul CRM & Promosi membantu Anda melakukan segmentasi pelanggan, mengelola penawaran B2B sales pipeline, serta menyebarkan voucher promo via WhatsApp Broadcast secara massal.";
      case "fraud":
        return "Modul Keamanan & Audit (AI Fraud Detector) menggunakan analitik real-time untuk mendeteksi keanehan transaksi void kasir, melacak histori audit trail serta meminimalkan kerugian akibat kebocoran keuangan.";
      default:
        return "Tingkatkan produktivitas bisnis Anda dengan mengaktifkan modul premium.";
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  // Categories definition – ordered for service business workflow
  const categories = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        modules: ["overview"],
      },
      {
        id: "operations",
        label: "Operasional",
        icon: Layers,
        modules: ["services", "pos"],
      },
      {
        id: "inventory",
        label: "Stok & Pengadaan",
        icon: Package,
        modules: ["inventory"],
      },
      {
        id: "finance",
        label: "Keuangan",
        icon: TrendingUp,
        modules: ["accounting"],
      },
      {
        id: "crm",
        label: "Pelanggan & Penjualan",
        icon: Megaphone,
        modules: ["crm"],
      },
      {
        id: "administration",
        label: "Administrasi",
        icon: Users,
        modules: ["hr"],
      },
      {
        id: "security",
        label: "Keamanan",
        icon: ShieldCheck,
        modules: ["fraud"],
      },
      {
        id: "data",
        label: "Data Manager",
        icon: Database,
        modules: ["data-explorer"],
      },
    ],
    [],
  );

  // ponytail: Modules now sourced from nav.config.ts. Add new modules there.
  const tenantModules = useMemo(
    () => OPERATIONAL_MODULES.map((mod) => ({
      ...mod,
      submenus: mod.subtabs, // nav.config uses "subtabs", sidebar uses "submenus"
    })),
    [],
  );

  // Dynamic user permissions based on tenant custom RBAC or system default
  const userPermissions = useMemo(() => {
    if (isSuperAdmin) {
      return DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN;
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

  const allowedTenantModules = useMemo(() => {
    return tenantModules.filter(
      (mod) =>
        userPermissions.includes(mod.id) ||
        userPermissions.some(
          (perm) => perm === mod.id || perm.startsWith(mod.id + "-"),
        ),
    );
  }, [tenantModules, userPermissions]);

  // Keep premium modules visible so users understand which package unlocks them.
  const visibleTenantModules = useMemo(
    () => allowedTenantModules,
    [allowedTenantModules],
  );



  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visibleTenantModules;
    return visibleTenantModules.filter((mod) => {
      const moduleMatches =
        mod.label.toLowerCase().includes(query) ||
        (mod.desc?.toLowerCase().includes(query) ?? false) ||
        mod.submenus?.some((sub) => sub.label.toLowerCase().includes(query));
      return moduleMatches;
    });
  }, [visibleTenantModules, searchQuery]);

  const isSubmenuAllowed = (modId: string, subId: string) => {
    if (isSuperAdmin || isOwner) return true;

    // Tier-based feature gating untuk settings subtabs
    if (modId === "settings") {
      const tenantFeatures = getEffectiveFeatures(activeTenant || {});

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
      return true; // accessible to any user who can view services
    }
    if (modId === "services" && subId === "warranty-claims") {
      return true; // accessible to any user who can view services
    }
    if (modId === "inventory" && subId === "small-parts") {
      return true; // accessible to any user who can view inventory
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

  const moduleMap = useMemo(() => {
    return new Map(visibleTenantModules.map((m) => [m.id, m]));
  }, [visibleTenantModules]);

  const superAdminMenus = [
    {
      id: "saas-dashboard",
      label: "Dashboard Global",
      icon: LayoutDashboard,
      color: "text-blue-500 bg-blue-50",
    },
    {
      id: "saas-tenants",
      label: "Kelola Tenant",
      icon: Users,
      color: "text-purple-500 bg-purple-50",
    },
    {
      id: "saas-billing",
      label: "Langganan & QRIS",
      icon: CreditCard,
      color: "text-emerald-500 bg-emerald-50",
    },
    {
      id: "saas-operations",
      label: "Operasional Platform",
      icon: Activity,
      color: "text-sky-500 bg-sky-50",
    },
    {
      id: "saas-audits",
      label: "Audit & Keamanan",
      icon: FolderLock,
      color: "text-amber-500 bg-amber-50",
    },
  ];

  const commonMenus = [
    { id: "customer-portal", label: "Portal Pelanggan", icon: HelpCircle },
  ];

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 flex flex-col h-screen border-r border-slate-200/65 dark:border-zinc-900 select-none transition-all duration-300 ease-in-out group lg:hover:w-52 lg:focus-within:w-52 ${
          isOpen
            ? "translate-x-0 shadow-2xl w-52"
            : "-translate-x-full w-52 lg:translate-x-0 lg:w-[64px] overflow-hidden"
        }`}
        id="sidebar-container"
      >
        <div className="w-52 flex flex-col h-full shrink-0">
          {/* 1. Header with Brand Launcher */}
          <div className="p-5 border-b border-slate-200/40 dark:border-zinc-900 flex items-center justify-between bg-white dark:bg-zinc-900/20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative group shrink-0">
                <WhiteLabelGate>
                   <div className="absolute -inset-1 rounded-xl opacity-75 blur-xs group-hover:opacity-100 transition duration-300 animate-pulse" style={{ background: activeTenant?.branding?.primaryColor || "var(--accent)" }} />
                </WhiteLabelGate>
                <div className="relative w-8 h-8 rounded-xl bg-slate-950 dark:bg-zinc-900 flex items-center justify-center text-white font-syne font-black text-sm shadow-md cursor-pointer transform group-hover:scale-105 transition-all duration-200">
                  {activeTenant?.branding?.logoUrl ? (
                    <img src={activeTenant.branding.logoUrl} alt="Logo" className="w-6 h-6 rounded" onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }} />
                  ) : (
                    <span className="hidden">
                      {(activeTenant?.name || "S").substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <div className="flex items-center gap-1">
                  <h3 className="font-syne font-black text-[13px] tracking-tight truncate uppercase leading-tight" style={{ color: activeTenant?.branding?.primaryColor || "#1e293b" }}>
                    {activeTenant?.name || "Komputer Makassar"}
                  </h3>
                </div>
                <span className="text-[8px] font-mono rounded-full px-2 py-0.5 font-extrabold flex items-center gap-1 mt-1 w-max shadow-xs transition-all duration-200" style={{ 
                   color: activeTenant?.branding?.primaryColor || "var(--accent)",
                  backgroundColor: activeTenant?.branding?.whiteLabelEnabled ? "#f3f4f6" : (activeTenant?.branding?.secondaryColor ? activeTenant.branding.secondaryColor + '20' : "#dbeafe"),
                  borderColor: activeTenant?.branding?.whiteLabelEnabled ? "#e5e7eb" : (activeTenant?.branding?.secondaryColor ? activeTenant.branding.secondaryColor + '40' : "#93c5fd")
                }}
                >
                   <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeTenant?.branding?.primaryColor || "var(--accent)" }} />
                  {activeTenant?.branding?.whiteLabelEnabled ? "CUSTOM" : "CRM INTEGRATED"}
                </span>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden min-h-11 min-w-11 p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-300 transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center"
                id="close-sidebar-mobile-btn"
                aria-label="Tutup sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-3 pt-3 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="sidebar-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari menu..."
                className="w-full rounded-2xl border border-slate-200 bg-white/90 py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/30 dark:border-zinc-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-accent/60 dark:focus:ring-accent/90"
              />
            </div>
          </div>

          {/* 3. Navigation Tree Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4.5 custom-scrollbar bg-slate-50/30 dark:bg-zinc-950/10">
            {/* If Super Admin role */}
            {isSuperAdmin && (
              <div className="space-y-1">
                <div className="text-[9.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-3 pt-1 pb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-sm shadow-accent/50 animate-pulse" />
                  <span className="whitespace-nowrap transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                    Super Admin Console
                  </span>
                </div>
                {superAdminMenus.map((menu) => {
                  const Icon = menu.icon;
                  const isActive = activeTab === menu.id;
                  return (
                    <button
                      key={menu.id}
                      id={`sidebar-${menu.id}-btn`}
                      onClick={() => onSetTab(menu.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black transition-all border text-left cursor-pointer transform hover:translate-x-1 ${
                        isActive
                          ? "bg-gradient-to-r from-accent to-blue-600 dark:from-accent dark:to-cyan-500 text-white border-accent/60 shadow-lg shadow-accent/20 animate-fadeIn"
                          : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-slate-50 shadow-none"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/15 dark:bg-slate-950/20 text-white dark:text-slate-950" : getModuleColorClass(menu.id)}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="whitespace-nowrap transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        {menu.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Regular Tenant Admin/Karyawan list */}
            {!isSuperAdmin && (
              <>
                {searchQuery.trim() ? (
                  // Search Results view
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="text-[9.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-3 pt-1 pb-2 font-mono flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                      <span className="whitespace-nowrap transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        Hasil Pencarian
                      </span>
                    </div>
                    {filteredModules.map((mod) => {
                        const Icon = mod.icon;
                        const isActive = activeTab === mod.id;
                        return (
                          <div key={mod.id} className="space-y-1">
                            <button
                              onClick={() => onSetTab(mod.id)}
                              className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-xs font-black transition-all border text-left cursor-pointer transform hover:translate-x-1 ${
                                isActive
                                  ? "bg-gradient-to-r from-accent to-blue-600 dark:from-accent dark:to-cyan-500 text-white border-accent/60 shadow-lg shadow-accent/20 animate-fadeIn"
                                  : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-slate-50 shadow-none"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/15 dark:bg-slate-950/20 text-white dark:text-slate-950" : getModuleColorClass(mod.id)}`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <div className="truncate">
                                  <span className="block truncate font-black leading-tight tracking-tight transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                    {mod.label}
                                  </span>
                                  <span
                                    className={`text-[9.5px] font-normal block truncate leading-none mt-1 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 ${isActive ? "text-slate-300 dark:text-slate-600/80" : "text-slate-400 dark:text-zinc-500"}`}
                                  >
                                    {mod.desc}
                                  </span>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    {filteredModules.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-xs font-black text-slate-400 dark:text-zinc-500">
                          Tidak ada hasil yang cocok
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">
                          Coba kata kunci pencarian yang lain
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Categorized Accordion Tree View
                  categories.map((cat) => {
                    const catModules = cat.modules
                      .map((id) => moduleMap.get(id))
                      .filter((m): m is NonNullable<typeof m> => !!m);

                    const safeCatModules = Array.isArray(catModules) ? catModules : [];
                    if (safeCatModules.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-2 pt-1">
                        {/* Category Label */}
                        <div className="text-[9.5px] font-black text-slate-400/90 dark:text-zinc-500 uppercase tracking-widest px-3 pt-1 pb-1 flex items-center gap-2.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-800" />
                          <span className="whitespace-nowrap transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                            {cat.label}
                          </span>
                        </div>

                        {/* Modules under Category */}
                        <div className="space-y-1.5">
                          {catModules.map((mod) => {
                              const Icon = mod.icon;
                              const locked = isModuleLocked(mod.id);
                              const requiredTier = getRequiredTierForModule(mod.id);
                              const isModActive = !locked && activeTab === mod.id;

                              return (
                                <div key={mod.id} className="relative">
                                  {/* Accent Line on active tab */}
                                  {isModActive && (
                                    <div className="absolute left-0 top-3 w-1.2 h-6 bg-accent dark:bg-accent rounded-r-full z-10" />
                                  )}

                                  {/* Module Header Button */}
                                  <button
                                    type="button"
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
                                      onSetTab(mod.id, mod.submenus?.[0]?.id);
                                    }}
                                    aria-expanded={isModActive}
                                    aria-controls={`sidebar-${mod.id}-submenus`}
                                    aria-label={locked ? `${mod.label}, memerlukan paket ${requiredTier}` : `${mod.label}${isModActive ? ", terbuka" : ", buka menu"}`}
                                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-xs font-black transition-all border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
                                      locked
                                        ? "cursor-pointer bg-amber-50/70 dark:bg-amber-950/15 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                                        : isModActive
                                          ? "cursor-pointer transform hover:translate-x-1 bg-gradient-to-r from-accent to-accent dark:from-accent dark:to-accent text-white border-accent/60/60 shadow-lg shadow-accent/20 animate-fadeIn"
                                          : "cursor-pointer transform hover:translate-x-1 bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-slate-50 shadow-none"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div
                                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${isModActive ? "bg-white/15 dark:bg-slate-950/20 text-white dark:text-slate-950" : getModuleColorClass(mod.id)}`}
                                      >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                      </div>
                                      <div className="truncate">
                                        <span className="block truncate font-black leading-tight tracking-tight transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                          {mod.label}
                                        </span>
                                        <span
                                          className={`text-[9.5px] font-normal block truncate leading-none mt-1 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 ${isModActive ? "text-slate-300 dark:text-slate-600/80" : "text-slate-400 dark:text-zinc-500"}`}
                                        >
                                          {mod.desc}
                                        </span>
                                      </div>
                                      {locked && (
                                        <span className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-200/80 dark:bg-amber-900/40 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                          <Lock className="w-2.5 h-2.5" />
                                          {requiredTier}
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {/* Submenus List under Active Module */}
                                  {isModActive && mod.submenus && Array.isArray(mod.submenus) && mod.submenus.length > 0 && (
                                    <div id={`sidebar-${mod.id}-submenus`} className="ml-7 mt-1 space-y-0.5 border-l-2 border-indigo-200 dark:border-indigo-900/40 pl-2.5 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                      {mod.submenus
                                        .filter((sub) => isSubmenuAllowed(mod.id, sub.id))
                                        .map((sub) => {
                                          const SubIcon = sub.icon;
                                          const isSubActive = activeSubTab === sub.id;
                                          return (
                                            <button
                                              key={sub.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSetTab(mod.id, sub.id);
                                              }}
                                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left transition-all cursor-pointer ${
                                                isSubActive
                                                  ? "bg-accent-lighter dark:bg-indigo-950/40 text-accent dark:text-accent font-extrabold"
                                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                                              }`}
                                            >
                                              <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? "text-accent dark:text-accent" : "text-slate-400"}`} />
                                              <span className="truncate">{sub.label}</span>
                                            </button>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

          </div>

          {/* Mobile Account & System Controls */}
          <div className="lg:hidden border-t border-slate-200/40 dark:border-zinc-900 p-3 space-y-2.5 bg-white dark:bg-zinc-900/20 shrink-0">
            {currentUser.role !== UserRole.SUPER_ADMIN && tenantBranches.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-zinc-800 rounded-xl px-3 py-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={currentBranchId}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label="Ganti cabang"
                >
                  {tenantBranches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-zinc-800 rounded-xl py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === "light" ? "Gelap" : "Terang"}
              </button>
              <button
                onClick={() => onSetTab("settings", "branding")}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-zinc-800 rounded-xl py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Pengaturan
              </button>
            </div>
            <div className="flex items-center gap-3 bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-zinc-800 rounded-xl px-3 py-2">
              <RoleAvatar role={currentUser.role} name={currentUser.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{roleLabel}</p>
              </div>
              <button onClick={() => setShowPasswordModal(true)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 cursor-pointer" title="Ganti Password" aria-label="Ganti Password">
                <Key className="w-4 h-4" />
              </button>
              <button onClick={logoutUser} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 cursor-pointer" title="Keluar" aria-label="Keluar">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {commonMenus.length > 0 && (
          <div className="px-3 pb-3.5 border-t border-slate-200/40 dark:border-zinc-900">
            {commonMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = activeTab === menu.id;

              return (
                <button
                  key={menu.id}
                  onClick={() => onSetTab(menu.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all border text-left cursor-pointer ${
                    isActive
                      ? "border-accent bg-accent text-white shadow-lg shadow-accent/10"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-slate-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 ${isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-slate-300"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{menu.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {showPasswordModal && (
        <PasswordChangeModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Modern High-Fidelity Subscription Upgrade Dialog */}
      {lockedFeatureInfo && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          id="premium-upgrade-modal"
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
                <Sparkles className="w-4 h-4 text-accent dark:text-accent shrink-0 mt-0.5" />
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
                  onSetTab(
                    isSuperAdmin ? "saas-billing" : "settings",
                    isSuperAdmin ? undefined : "subscription",
                  );
                }}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-lg shadow-accent/15 hover:shadow-accent/25 transition-all duration-200 transform hover:scale-[1.01] active:scale-95 text-center cursor-pointer"
              >
                Tingkatkan Paket Sekarang &rarr;
              </button>
              <button
                onClick={() => setLockedFeatureInfo(null)}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700/80 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all duration-150 text-center cursor-pointer border border-transparent dark:border-zinc-800/40"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
