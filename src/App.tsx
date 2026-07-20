/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { SaaSProvider, useSaaS } from "./context/SaaSContext";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { ConfirmProvider, useConfirm } from "./components/ui/ConfirmDialog";
import {
  Sidebar,
  Topbar,
  AICopilot,
  CommandPalette,
  HorizontalNavbar,
  BottomNav,
} from "./components/layout";
import { UserRole } from "./types";
import { OfflineSyncModal } from "./components/OfflineSyncModal";
import { LandingPage } from "./components/LandingPage";
import { InvitationAcceptance } from "./components/InvitationAcceptance";
import { Sparkles } from "lucide-react";
import { isTrialActive } from "./lib/featureUtils";

// Lazy-loaded components for optimal bundle chunking and code splitting
const SuperAdminDashboard = React.lazy(() =>
  import("./components/SuperAdminDashboard").then((module) => ({
    default: module.SuperAdminDashboard,
  })),
);
const TenantDashboard = React.lazy(() =>
  import("./components/TenantDashboard").then((module) => ({
    default: module.TenantDashboard,
  })),
);
const CustomerPortal = React.lazy(() =>
  import("./components/CustomerPortal").then((module) => ({
    default: module.CustomerPortal,
  })),
);

const PageLoader = () => (
  <div
    className="flex flex-col items-center justify-center h-64 space-y-3"
    id="lazy-page-loader"
  >
    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">Loading module...</p>
  </div>
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; componentStack: string }
> {
  state = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[FIXDEV_RUNTIME_ERROR]", error);
    console.error("[FIXDEV_COMPONENT_STACK]", info.componentStack);
    this.setState({ componentStack: info.componentStack || "" });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[420px] rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
        <h1 className="text-xl font-black">Modul gagal dimuat</h1>
        <p className="mt-2 text-sm opacity-80">
          Refresh halaman. Jika masih gagal, hubungi admin.
        </p>
        <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-white/70 p-4 text-xs dark:bg-black/30 whitespace-pre-wrap">
          {this.state.error.message}
        </pre>
        <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-white/70 p-4 text-xs dark:bg-black/30 whitespace-pre-wrap text-rose-700 dark:text-rose-300">
          {this.state.error.stack}
        </pre>
        {this.state.componentStack && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-bold text-rose-700 dark:text-rose-300">
              Component Stack
            </summary>
            <pre className="mt-1 max-h-48 overflow-auto rounded-xl bg-white/70 p-4 text-xs dark:bg-black/30 whitespace-pre-wrap text-rose-600 dark:text-rose-400">
              {this.state.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

const MainAppContent: React.FC = () => {
  const [invitationToken, setInvitationToken] = useState(() =>
    new URLSearchParams(window.location.search).get("invite"),
  );
  const {
    currentUser,
    apiLoading,
    apiStatus,
    isAuthenticated,
    isImpersonating,
    exitImpersonate,
    tenants,
    currentTenantId,
    apiFetch,
  } = useSaaS();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem("saas_active_tab");
    if (saved) return saved;
    return "overview";
  });
  const [activeSubTab, setActiveSubTab] = useState<string>(() => {
    const saved = localStorage.getItem("saas_active_sub_tab");
    if (saved) return saved;
    return "overview";
  });
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const impersonatedTenant = tenants.find((t) => t.id === currentTenantId);
  const activeTenant = impersonatedTenant;
  const tenantDisplay = impersonatedTenant?.name ?? currentUser.name;
  const impersonationSession = React.useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("saas_impersonation_session") || "null",
      );
    } catch {
      return null;
    }
  }, [isImpersonating]);
  React.useEffect(() => {
    if (!isImpersonating || !impersonationSession?.expiresAt) return;
    const remaining =
      new Date(impersonationSession.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      localStorage.removeItem("saas_impersonation_session");
      exitImpersonate();
      return;
    }
    const timer = window.setTimeout(() => {
      localStorage.removeItem("saas_impersonation_session");
      exitImpersonate();
      showToast("Sesi impersonasi telah berakhir otomatis.", "info");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [
    isImpersonating,
    impersonationSession?.expiresAt,
    exitImpersonate,
    showToast,
  ]);

  // 🛡️ Safety net: paksa sembunyikan loading indicator setelah 35 detik
  // Mencegah notifikasi stuck jika ada edge case yang tidak tertangani
  const [forceHideLoading, setForceHideLoading] = React.useState(false);
  React.useEffect(() => {
    if (!apiLoading) {
      setForceHideLoading(false);
      return;
    }
    const safetyTimer = setTimeout(() => {
      console.warn(
        "[Safety] apiLoading masih aktif setelah 35 detik — paksa dismiss.",
      );
      setForceHideLoading(true);
    }, 35000);
    return () => clearTimeout(safetyTimer);
  }, [apiLoading]);
  const effectiveLoading = apiLoading && !forceHideLoading;
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  // Intercept window.alert & dispatch clean toast alerts
  React.useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message: string) => {
      const msg = String(message).toLowerCase();
      let type: "success" | "error" | "info" = "info";

      if (
        msg.includes("sukses") ||
        msg.includes("berhasil") ||
        msg.includes("success") ||
        msg.includes("lunas") ||
        msg.includes("disetujui") ||
        msg.includes("verified") ||
        msg.includes("tersimpan")
      ) {
        type = "success";
      } else if (
        msg.includes("gagal") ||
        msg.includes("error") ||
        msg.includes("salah") ||
        msg.includes("ditolak") ||
        msg.includes("blocker") ||
        msg.includes("kesalahan") ||
        msg.includes("wajib") ||
        msg.includes("mohon") ||
        msg.includes("harap") ||
        msg.includes("silakan")
      ) {
        type = "error";
      }

      showToast(message, type);
    };

    const handleLiveNotification = (e: any) => {
      const detail = e.detail;
      if (detail && detail.text) {
        showToast(
          detail.title ? `${detail.title}: ${detail.text}` : detail.text,
          "info",
        );
      }
    };

    const handleCustomToast = (e: any) => {
      if (e.detail && e.detail.message) {
        showToast(e.detail.message, e.detail.type);
      }
    };

    window.addEventListener("live_notification", handleLiveNotification);
    window.addEventListener("saas-toast" as any, handleCustomToast);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener("live_notification", handleLiveNotification);
      window.removeEventListener("saas-toast" as any, handleCustomToast);
    };
  }, [showToast]);

  const [navigationMode, setNavigationMode] = useState<
    "sidebar" | "horizontal"
  >(() => {
    const stored = localStorage.getItem("fixflow-navigation-mode");
    return stored === "horizontal" ? "horizontal" : "sidebar";
  });

  React.useEffect(() => {
    localStorage.setItem("fixflow-navigation-mode", navigationMode);
  }, [navigationMode]);

  // Global Keyboard Shortcut (Ctrl+K or Cmd+K) for Command Palette
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  React.useEffect(() => {
    const handleSyncTrigger = () => {
      setShowSyncModal(true);
    };
    window.addEventListener("saas-offline-restored", handleSyncTrigger);
    return () => {
      window.removeEventListener("saas-offline-restored", handleSyncTrigger);
    };
  }, []);

  // Auto-navigate to Customer Portal if tracking ticket is in URL params on load
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get("ticket");
    const subParam = params.get("sub");
    if (ticketParam && subParam !== "warranty-claim") {
      setActiveTab("customer-portal");
      setActiveSubTab("overview");
    }
  }, []);

  // Allowed super admin tabs
  const SUPER_ADMIN_TABS = [
    "saas-dashboard",
    "saas-tenants",
    "saas-billing",
    "saas-operations",
    "saas-audits",
    "saas-supabase",
  ];

  const handleSetTab = (tab: string, subTab?: string) => {
    // Normalize SA clicks to safe known tab
    const finalTab =
      isSuperAdmin &&
      !SUPER_ADMIN_TABS.includes(tab) &&
      tab !== "customer-portal"
        ? "saas-dashboard"
        : tab;
    setActiveTab(finalTab);
    localStorage.setItem("saas_active_tab", finalTab);
    setIsMobileSidebarOpen(false);
    if (subTab) {
      setActiveSubTab(subTab);
      localStorage.setItem("saas_active_sub_tab", subTab);
    } else {
      let finalSub = "overview";
      if (finalTab === "overview") finalSub = "overview";
      else if (finalTab === "services") finalSub = "list";
      else if (finalTab === "pos") finalSub = "cashier";
      else if (finalTab === "inventory") finalSub = "stock";
      else if (finalTab === "accounting") finalSub = "coa";
      else if (finalTab === "hr") finalSub = "attendance";
      else if (finalTab === "crm") finalSub = "customers";
      else if (finalTab === "settings")
        finalSub = isSuperAdmin ? "storage" : "branding";
      else if (finalTab === "fraud") finalSub = "audit-log";

      setActiveSubTab(finalSub);
      localStorage.setItem("saas_active_sub_tab", finalSub);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get("ticket");
    const subParam = params.get("sub");
    if (ticketParam && subParam !== "warranty-claim") {
      setActiveTab("customer-portal");
      setActiveSubTab("overview");
      return;
    }

    const savedTab = localStorage.getItem("saas_active_tab");
    const savedSubTab = localStorage.getItem("saas_active_sub_tab");
    if (savedTab) {
      const isSaTab = SUPER_ADMIN_TABS.includes(savedTab);
      if (isSuperAdmin && !isSaTab && savedTab !== "customer-portal") {
        setActiveTab("saas-dashboard");
        setActiveSubTab("dashboard");
      } else if (!isSuperAdmin && isSaTab) {
        setActiveTab("overview");
        setActiveSubTab("overview");
      } else {
        setActiveTab(savedTab);
        if (savedSubTab) setActiveSubTab(savedSubTab);
        return;
      }
    } else {
      if (isSuperAdmin) {
        setActiveTab("saas-dashboard");
        setActiveSubTab("dashboard");
      } else {
        setActiveTab("overview");
        setActiveSubTab("overview");
      }
    }
  }, [currentUser.role]);

  const params = new URLSearchParams(window.location.search);
  const isPublicTicketTrack = !!(
    params.get("ticket") && params.get("sub") !== "warranty-claim"
  );

  if (invitationToken) {
    return (
      <InvitationAcceptance
        token={invitationToken}
        onComplete={() => {
          window.history.replaceState({}, "", window.location.pathname);
          setInvitationToken(null);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (activeTab === "customer-portal") {
      return (
        <div
          className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200"
          id="public-portal-container"
        >
          {/* Elegant header for public customers */}
          <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-900/60 px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-2 rounded-xl text-white shadow-md">
                {activeTenant?.branding?.logoUrl ? (
                  <img src={activeTenant.branding.logoUrl} alt="Logo" className="h-5 w-5" onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }} />
                ) : null}
                <span className={`font-bold text-sm font-syne ${activeTenant?.branding?.logoUrl ? 'hidden' : ''}`}>
                  {(activeTenant?.name || "KM").substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                  {activeTenant?.branding?.whiteLabelEnabled && activeTenant?.branding?.customDomain
                    ? activeTenant.branding.customDomain
                    : activeTenant?.name || "KM"}
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
                  Customer Portal
                </span>
              </div>
            </div>

            <button
              onClick={() => handleSetTab("overview")}
              className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer hover:shadow-accent/10 active:scale-95 animate-pulse"
            >
              Masuk Sebagai Owner / Staff &rarr;
            </button>
          </header>

          <main className="p-6">
            <Suspense fallback={<PageLoader />}>
              <CustomerPortal
                onBackToDashboard={() => handleSetTab("overview")}
              />
            </Suspense>
          </main>
        </div>
      );
    }
    return <LandingPage />;
  }

  return (
    <div
      className="flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 relative overflow-x-hidden"
      id="main-app-container"
    >
      {/* Impersonation Banner at the absolute top */}
      {/* Trial Banner */}
      {(() => {
        const isTrial = activeTenant?.status === "TRIAL" && isTrialActive(activeTenant);
        console.log("[DEBUG] TrialBanner", { status: activeTenant?.status, endsAt: activeTenant?.trialEndsAt, isTrial });
        if (!isTrial) return null;
        return (
          <div
            className="bg-accent text-white p-2 text-center text-sm font-medium flex items-center justify-center gap-2 z-[9999] shrink-0 border-b border-accent/30"
            id="trial-banner-top"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              Masa percobaan {Math.ceil((new Date(activeTenant.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} hari tersisa.
              <button
                className="ml-2 underline font-bold"
                onClick={() => {
                  showToast("Redirecting to upgrade page...", "info");
                  handleSetTab("settings", "subscription");
                }}
              >
                Upgrade Sekarang!
              </button>
            </span>
            <Sparkles className="h-4 w-4" />
          </div>
        );
      })()}

      {isImpersonating && (
        <div
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 sm:px-6 py-3 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg z-[9999] animate-fadeIn shrink-0 border-b border-amber-500/30"
          id="impersonation-banner-top"
        >
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-white/20 rounded-xl text-sm animate-pulse">
              🕵️
            </span>
            <div className="text-left">
              <p className="font-extrabold text-white text-xs flex items-center gap-1.5">
                ⚡ Mode Impersonate (Bypass Aman) Aktif
              </p>
              <p className="text-white/80 text-[10px] font-normal leading-tight mt-0.5">
                Anda saat ini mengakses sistem sebagai pemilik usaha{" "}
                <strong className="text-white underline">
                  {tenantDisplay}
                </strong>
                . Mode{" "}
                <strong>
                  {impersonationSession?.accessMode === "FULL"
                    ? "akses penuh"
                    : "hanya-baca"}
                </strong>
                {impersonationSession?.expiresAt && (
                  <>
                    {" "}
                    hingga{" "}
                    {new Date(
                      impersonationSession.expiresAt,
                    ).toLocaleTimeString("id-ID")}
                  </>
                )}
                . Semua aktivitas dicatat dengan alasan:{" "}
                {impersonationSession?.reason || "dukungan operasional"}.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (impersonationSession?.id) {
                await apiFetch(
                  `/api/superadmin/impersonation/${impersonationSession.id}/end`,
                  {
                    method: "POST",
                    body: JSON.stringify({ reason: "USER_EXIT" }),
                  },
                ).catch(() => undefined);
              }
              localStorage.removeItem("saas_impersonation_session");
              exitImpersonate();
            }}
            className="px-4 py-2 bg-white text-amber-700 hover:bg-amber-50 rounded-xl transition-all font-black cursor-pointer hover:shadow-lg active:scale-95 text-[11px] shrink-0 shadow-sm"
          >
            Selesai &amp; Kembali ke Super Admin &rarr;
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 w-full relative">
        {/* Cloud API Loader Status Indicator */}
        {effectiveLoading && (
          <div
            className="fixed top-4 right-4 z-[9999] flex items-center bg-accent dark:bg-accent text-white text-xs font-mono py-2 px-3 rounded-lg shadow-lg border border-accent/60/30 backdrop-blur-xs transition-all animate-pulse"
            id="api-loading-toast"
          >
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            <span>{apiStatus || "Sinkronisasi..."}</span>
          </div>
        )}

        {/* Mobile Sidebar Backdrop Overlay */}
        {isMobileSidebarOpen &&
          createPortal(
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
              id="sidebar-backdrop"
            />,
            document.body,
          )}

        {/* Dynamic Navigation Sidebar */}
        {(navigationMode === "sidebar" || isMobileSidebarOpen) && (
          <Sidebar
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onSetTab={handleSetTab}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            onOpenSearch={() => setIsSearchOpen(true)}
            navigationMode={navigationMode}
          />
        )}

        {/* Spacer for desktop sidebar when it's absolute */}
        {navigationMode !== "horizontal" && (
          <div className="hidden lg:block w-[84px] shrink-0 border-r border-slate-200/65 dark:border-zinc-900" />
        )}

        {/* Main Content Pane */}
        <div
          className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden"
          id="content-pane-container"
        >
          {/* Branch / Tenant / Role Switching Header */}
          <div className="hidden lg:block">
            <Topbar
              onSetTab={handleSetTab}
              onToggleSidebar={() =>
                setIsMobileSidebarOpen(!isMobileSidebarOpen)
              }
              onOpenSearch={() => setIsSearchOpen(true)}
              navigationMode={navigationMode}
              setNavigationMode={setNavigationMode}
              activeTab={activeTab}
              activeSubTab={activeSubTab}
            />
          </div>

          <BottomNav
            activeTab={activeTab}
            onSetTab={handleSetTab}
            onOpenMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          {/* Top Horizontal Module & Subtab Navigation Ribbon */}
          {navigationMode === "horizontal" &&
            !isSuperAdmin &&
            activeTab !== "customer-portal" && (
              <HorizontalNavbar
                activeTab={activeTab}
                activeSubTab={activeSubTab}
                onSetTab={handleSetTab}
                setActiveSubTab={setActiveSubTab}
                navigationMode={navigationMode}
                setNavigationMode={setNavigationMode}
              />
            )}

          {/* Dynamic Canvas Area */}
          <main
            className="flex-1 overflow-y-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 lg:pb-6"
            id="canvas-main-area"
          >
            <AppErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                {/* Render Super Admin Workspace */}
                {isSuperAdmin && (
                  <div id="sa-view-wrapper">
                    <SuperAdminDashboard
                      activeTab={
                        SUPER_ADMIN_TABS.includes(activeTab)
                          ? activeTab
                          : "saas-dashboard"
                      }
                      onSetTab={(tab, filter) => handleSetTab(tab, filter)}
                    />
                  </div>
                )}

                {/* Render Tenant ERP Workspace */}
                {!isSuperAdmin && (
                  <div id="tenant-view-wrapper">
                    {(activeTab === "overview" ||
                      activeTab === "services" ||
                      activeTab === "pos" ||
                      activeTab === "inventory" ||
                      activeTab === "accounting" ||
                      activeTab === "hr" ||
                      activeTab === "crm" ||
                      activeTab === "settings" ||
                      activeTab === "fraud") && (
                      <TenantDashboard
                        activeTab={activeTab}
                        activeSubTab={activeSubTab}
                        setActiveSubTab={setActiveSubTab}
                        onSetTab={handleSetTab}
                        navigationMode={navigationMode}
                      />
                    )}
                  </div>
                )}

                {/* Common Public/External Channels */}
                {activeTab === "customer-portal" && (
                  <CustomerPortal
                    onBackToDashboard={() => handleSetTab("overview")}
                  />
                )}
              </Suspense>
            </AppErrorBoundary>
          </main>
        </div>

        {/* Offline Sync Modal Overlay */}
        <OfflineSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
        />

        {/* Dynamic AI Copilot Assistant */}
        <AICopilot />

        {/* Omni Command & Search Center Modal */}
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSetTab={handleSetTab}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SaaSProvider>
          <MainAppContent />
        </SaaSProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
