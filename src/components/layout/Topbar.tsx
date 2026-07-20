/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useSaaS } from "../../context/SaaSContext";
import { UserRole } from "../../types";
import {
  Search,
  Globe,
  Building2,
  Sun,
  Moon,
  Menu,
  Settings,
  LogOut,
  ChevronDown,
  Key,
  Database,
  Monitor,
  PanelLeft,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { RoleAvatar } from "../ui";
import { PasswordChangeModal } from "../ui/PasswordChangeModal";
import { SETTINGS_MODULES } from "../../config/nav.config";

interface TopbarProps {
  onSetTab?: (tab: string, subTab?: string) => void;
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  navigationMode?: "sidebar" | "horizontal";
  setNavigationMode?: (mode: "sidebar" | "horizontal") => void;
  activeTab?: string;
  activeSubTab?: string;
}

// Standalone Settings dropdown in topbar
const SettingsDropdown: React.FC<{ onSetTab?: (tab: string, subTab?: string) => void }> = ({ onSetTab }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Pengaturan Sistem"
        title="Pengaturan Sistem"
        className={`p-1.5 sm:p-2 rounded-lg border transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 shrink-0 ${
          open
            ? "bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400"
            : "bg-slate-100/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/40 dark:border-slate-800/80"
        }`}
        id="settings-trigger-btn"
      >
        <Settings className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl animate-fadeIn z-50 overflow-hidden"
          role="menu"
        >
          <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800">
            <Settings className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[10px] font-black text-slate-600 dark:text-zinc-300 uppercase tracking-widest">Pengaturan Sistem</span>
          </div>
          <div className="p-1.5 grid grid-cols-2 gap-1">
            {SETTINGS_MODULES.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setOpen(false); onSetTab && onSetTab("settings", item.id); }}
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  role="menuitem"
                >
                  <ItemIcon className={`w-4 h-4 ${item.iconColor}`} />
                  <span className="truncate max-w-full text-center leading-tight">{item.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onSetTab,
  navigationMode,
  setNavigationMode,
  activeTab,
  activeSubTab,
}) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    tenants,
    currentTenantId,
    currentBranchId,
    currentUser,
    branches,
    switchTenant,
    switchBranch,
    theme,
    toggleTheme,
    logoutUser,
    supabaseConfig,
    platformHealth,
    refreshPlatformHealth,
    refreshData,
    apiFetch,
  } = useSaaS();

  const loadNotifications = React.useCallback(async () => {
    if (currentUser.role !== UserRole.SUPER_ADMIN) return;
    try {
      const response = await apiFetch("/api/superadmin/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      }
    } catch { setNotifications([]); }
  }, [apiFetch, currentUser.role]);

  React.useEffect(() => { loadNotifications(); const timer = window.setInterval(loadNotifications, 60_000); return () => window.clearInterval(timer); }, [loadNotifications]);
  const unreadNotifications = notifications.filter((item) => !item.read_at);

  // Filter branches belonging to the current tenant (active only)
  const tenantBranches = React.useMemo(() => {
    let filtered = branches.filter((b) => b.tenantId === currentTenantId && b.isActive);
    if (currentUser && currentUser.branchIds && currentUser.branchIds.length > 0) {
      filtered = filtered.filter((b) => currentUser.branchIds.includes(b.id));
    }
    return filtered;
  }, [branches, currentTenantId, currentUser]);

  React.useEffect(() => {
    if (tenantBranches.length > 0 && !tenantBranches.find((b) => b.id === currentBranchId)) {
      switchBranch(tenantBranches[0].id);
    }
  }, [tenantBranches, currentBranchId, switchBranch]);

  const roleLabel = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.OWNER]: "Owner",
    [UserRole.ADMIN]: "Admin",
    [UserRole.MANAGER]: "Manager",
    [UserRole.KASIR]: "Kasir",
    [UserRole.TEKNISI]: "Teknisi",
  }[currentUser.role] ?? currentUser.role;

  const cloudStatus = currentUser.role === UserRole.SUPER_ADMIN
    ? platformHealth.status
    : supabaseConfig.isConfigured
      ? "ok"
      : "local";
  const cloudActive = cloudStatus === "ok";
  const cloudChecking = cloudStatus === "checking";
  const cloudLabel = cloudChecking
    ? "Memeriksa"
    : cloudActive
      ? "Cloud Aktif"
      : cloudStatus === "local"
        ? "Lokal"
        : cloudStatus === "degraded"
          ? "Terganggu"
          : "Offline";
  const cloudTone = cloudActive
    ? "bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
    : cloudChecking
      ? "bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400"
      : "bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400";

  const formatNavLabel = (value?: string) =>
    value
      ? value
          .split("-")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Dashboard";

  const pageTitle = formatNavLabel(activeTab);
  const pageSubtitle = activeSubTab ? formatNavLabel(activeSubTab) : null;

  return (
    <header
      className="h-14 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 gap-2 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)]"
      id="topbar-container"
    >
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-2 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="lg:hidden p-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer active:scale-95 shrink-0"
            id="mobile-hamburger-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="hidden sm:flex items-center gap-2 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/80 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-sm focus:outline-none transition-all duration-200 cursor-pointer shrink-0 text-xs h-8"
          id="top-search-trigger-btn"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
          <span className="text-slate-400/70 dark:text-slate-500/70">Cari...</span>
          <kbd className="ml-2 text-[9px] bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-mono shadow-inner">⌘K</kbd>
        </button>

        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="sm:hidden p-2 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none transition-all duration-200 cursor-pointer shrink-0"
          id="top-search-trigger-btn-mobile"
        >
          <Search className="w-5 h-5" />
        </button>


      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {/* scrollable icon row (no dropdowns) — overflow isolated here so the profile/notif/settings dropdowns aren't clipped on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* DB status — premium badge */}
        <button
          type="button"
          onClick={() => refreshPlatformHealth()}
          className={`relative flex items-center gap-1.5 border rounded-lg px-2.5 py-1 transition-all duration-300 text-[10px] sm:text-xs font-semibold select-none shrink-0 cursor-pointer ${cloudTone}`}
          title={platformHealth.message || `Status runtime: ${cloudLabel}`}
          id="db-sync-status-btn"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {cloudActive && <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-emerald-400" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${cloudActive ? "bg-emerald-500" : cloudChecking ? "bg-blue-500" : "bg-amber-500"}`} />
          </span>
          <Database className="w-3 h-3 hidden sm:block" />
          <span className="hidden sm:inline tracking-wide">{cloudLabel}</span>
        </button>

        {/* Sync / Refresh button */}
        <button
          onClick={refreshData}
          title="Segarkan data dari database"
          aria-label="Refresh data"
          id="topbar-refresh-btn"
          className="p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:text-accent dark:hover:text-indigo-400 transition-all cursor-pointer active:scale-95 shrink-0 hidden sm:inline-flex"
        >
          <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 16h5v5"/>
          </svg>
        </button>

        {/* Tenant Switcher - Super Admin only */}
        {currentUser.role === UserRole.SUPER_ADMIN && (
          <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/80 rounded-lg px-1.5 sm:px-2 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-all shrink-0">
            <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block" />
            <select
              value={currentTenantId}
              onChange={(e) => switchTenant(e.target.value)}
              className="text-[10px] sm:text-xs font-bold bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 cursor-pointer pr-1 max-w-[100px] sm:max-w-[160px] truncate [&>option]:bg-white dark:[&>option]:bg-slate-900 [&>option]:text-slate-800 dark:[&>option]:text-slate-100"
              id="tenant-switcher-select"
              aria-label="Switch tenant"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Branch Switcher */}
        {currentUser.role !== UserRole.SUPER_ADMIN && tenantBranches.length > 0 && (
          <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/80 rounded-lg px-1.5 sm:px-2 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-all shrink-0">
            <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block" />
            <select
              value={currentBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="text-[10px] sm:text-xs font-bold bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 cursor-pointer pr-1 max-w-[100px] sm:max-w-[160px] truncate [&>option]:bg-white dark:[&>option]:bg-slate-900 [&>option]:text-slate-800 dark:[&>option]:text-slate-100"
              id="branch-switcher-select"
              aria-label="Switch branch"
            >
              {tenantBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Mode Switcher */}
        {setNavigationMode && (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/70 bg-slate-100/50 dark:bg-slate-900/50 p-0.5 shrink-0 hidden md:flex" id="topbar-nav-mode-switcher">
            {([
              { id: "sidebar" as const, icon: PanelLeft, label: "Side" },
              { id: "horizontal" as const, icon: Monitor, label: "Top" },
            ]).map((m) => {
              const MIcon = m.icon;
              const active = navigationMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setNavigationMode(m.id)}
                  title={m.label === "Side" ? "Sidebar Navigation" : "Horizontal Navigation"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                  id={`topbar-nav-${m.id}-btn`}
                >
                  <MIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        )}

        </div>

        {currentUser.role === UserRole.SUPER_ADMIN && (
          <div className="relative">
            <button type="button" onClick={() => setIsNotificationsOpen((open) => !open)} aria-label="Notifikasi Super Admin" className="relative rounded-lg border border-slate-200/40 bg-slate-100/50 p-2 text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400" id="superadmin-notifications-btn"><Bell className="h-4 w-4" />{unreadNotifications.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white">{Math.min(99, unreadNotifications.length)}</span>}</button>
            {isNotificationsOpen && <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-zinc-800"><b className="text-xs text-slate-900 dark:text-white">Notifikasi Operasional</b><span className="text-[10px] text-slate-400">{unreadNotifications.length} belum dibaca</span></div><div className="max-h-80 overflow-y-auto p-2">{notifications.length ? notifications.map((item) => <button key={item.id} type="button" onClick={async () => { if (!item.read_at) await apiFetch(`/api/superadmin/notifications/${item.id}/read`, { method: "POST" }); await loadNotifications(); }} className="mb-1 w-full rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-950"><span className="flex items-start gap-2">{item.read_at ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-300" /> : <Bell className="mt-0.5 h-4 w-4 text-indigo-500" />}<span><b className="block text-xs text-slate-800 dark:text-zinc-200">{item.title}</b><span className="mt-1 block text-[11px] text-slate-500">{item.message}</span><span className="mt-1 block text-[9px] text-slate-400">{new Date(item.created_at).toLocaleString("id-ID")}</span></span></span></button>) : <p className="py-8 text-center text-xs text-slate-500">Belum ada notifikasi.</p>}</div></div>}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-100/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/80 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
          id="theme-toggle-btn"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Settings Center Trigger & Dropdown */}
        <SettingsDropdown onSetTab={onSetTab} />

      {/* Right side group separator before profile */}
        <div className="hidden sm:block w-px h-6 bg-slate-200/60 dark:bg-zinc-800/60 shrink-0" />

        {/* Profile Card & Dropdown */}
        <div
          className="relative shrink-0"
          ref={profileRef}
        >
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 cursor-pointer outline-none hover:opacity-90 transition-all text-left relative"
          >
            <div className="relative shrink-0">
              <div className="absolute -inset-[1.5px] bg-gradient-to-tr from-indigo-400 to-blue-500 rounded-full opacity-60" />
              <RoleAvatar
                role={currentUser.role}
                name={currentUser.name}
                size="sm"
              />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">
                {currentUser.name}
              </p>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                {roleLabel}
              </p>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform hidden lg:block ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isProfileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl animate-fadeIn z-50 overflow-hidden"
              role="menu"
            >
              {/* Mobile: show name/role */}
              <div className="p-3 border-b border-slate-100 dark:border-zinc-800 lg:hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{roleLabel}</p>
              </div>

              {/* Account section */}
              <div className="p-1.5">
                <button
                  onClick={() => { setIsProfileOpen(false); setShowPasswordChangeModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <Key className="w-4 h-4 text-slate-400" />
                  Ganti Password
                </button>
              </div>

              {/* Logout section */}
              <div className="p-1 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => { setIsProfileOpen(false); logoutUser(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4 text-red-500/70" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordChangeModal && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={() => setShowPasswordChangeModal(false)}
        />
      )}
    </header>
  );
};
