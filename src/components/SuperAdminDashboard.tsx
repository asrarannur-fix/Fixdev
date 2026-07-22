/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { SubscriptionTier, TenantStatus } from "../types";
import SaaSSubscription from "./SaaSSubscription";

// Import refactored components
import { DashboardOverview } from "./superadmin/DashboardOverview";
import { TenantsManager } from "./superadmin/TenantsManager";
import { AuditRecovery } from "./superadmin/AuditRecovery";
import { InfrastructureConfigModal } from "./superadmin/InfrastructureConfigModal";
import OperationsCenter from "./superadmin/OperationsCenter";

export const SuperAdminDashboard: React.FC<{ activeTab?: string; onSetTab?: (tab: string, filter?: string) => void }> = ({
  activeTab,
  onSetTab,
}) => {
  const {
    tenants,
    addTenant,
    addUser,
    updateTenantStatus,
    impersonateTenant,
    auditLogs,
    triggerBackup,
    restoreBackup,
    updateTenant,
    branches = [],
    warehouses = [],
    users = [],
    products = [],
    services = [],
    shifts = [],
    transactions = [],
    accounts = [],
    journals = [],
    workflows = [],
    offlineQueue = [],
    apiFetch,
  } = useSaaS();

  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const [readOnlyMode, setReadOnlyMode] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("saas_superadmin_console_session") || "null");
      return !session || session.mode !== "EDIT" || new Date(session.expiresAt).getTime() <= Date.now();
    } catch { return true; }
  });
  const [sessionLoading, setSessionLoading] = useState(false);

  const createConsoleSession = async (mode: "READ_ONLY" | "EDIT") => {
    setSessionLoading(true);
    try {
      const response = await apiFetch("/api/superadmin/sessions", {
        method: "POST",
        body: JSON.stringify({ mode, durationMinutes: 60 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sesi konsol gagal dibuat.");
      localStorage.setItem("saas_superadmin_console_session", JSON.stringify(result.session));
      setReadOnlyMode(mode !== "EDIT");
    } catch (err: any) {
      showToast(err.message || "Sesi konsol gagal dibuat.", "error");
    } finally { setSessionLoading(false); }
  };

  useEffect(() => {
    let session: any = null;
    try { session = JSON.parse(localStorage.getItem("saas_superadmin_console_session") || "null"); } catch {}
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) void createConsoleSession("READ_ONLY");
    const timer = window.setInterval(() => {
      try {
        const active = JSON.parse(localStorage.getItem("saas_superadmin_console_session") || "null");
        if (!active || new Date(active.expiresAt).getTime() <= Date.now()) {
          localStorage.removeItem("saas_superadmin_console_session");
          setReadOnlyMode(true);
        }
      } catch { setReadOnlyMode(true); }
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Tenant Infrastructure Configuration States
  const [selectedTenantForConfig, setSelectedTenantForConfig] = useState<
    string | null
  >(null);
  const [configSubdomain, setConfigSubdomain] = useState("");
  const [configCustomDomain, setConfigCustomDomain] = useState("");
  const [configStorageMode, setConfigStorageMode] = useState("SYSTEM");
  const [configBucketName, setConfigBucketName] = useState("");
  const [configStorageLimitMb, setConfigStorageLimitMb] = useState(1024);
  const [configUserLimit, setConfigUserLimit] = useState(3);
  const [configBranchLimit, setConfigBranchLimit] = useState(1);
  const [configFeatures, setConfigFeatures] = useState<string[]>([]);
  const [configName, setConfigName] = useState("");
  const [configTier, setConfigTier] = useState<SubscriptionTier>(
    SubscriptionTier.PRO,
  );
  const [configStatus, setConfigStatus] = useState<TenantStatus>(
    TenantStatus.ACTIVE,
  );

  // Global calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(
    (t) => t.status === TenantStatus.ACTIVE,
  ).length;
  const trialTenants = tenants.filter(
    (t) => t.status === TenantStatus.TRIAL,
  ).length;
  const suspendedTenants = tenants.filter(
    (t) => t.status === TenantStatus.SUSPENDED,
  ).length;

  const mrr = tenants.reduce((sum, t) => {
    if (t.status === TenantStatus.ACTIVE || t.status === TenantStatus.TRIAL) {
      if (t.tier === SubscriptionTier.BASIC) return sum + 100000;
      if (t.tier === SubscriptionTier.PRO) return sum + 250000;
      if (t.tier === SubscriptionTier.ENTERPRISE) return sum + 1500000;
    }
    return sum;
  }, 0);

  const arr = mrr * 12;

  // Active Storage Providers Count
  const systemStorageCount = tenants.filter(
    (t) =>
      !(t.settings as any)?.storageSettings ||
      (t.settings as any).storageSettings.mode === "SYSTEM",
  ).length;
  const s3StorageCount = tenants.filter(
    (t) => (t.settings as any)?.storageSettings?.mode === "S3",
  ).length;
  const r2StorageCount = tenants.filter(
    (t) => (t.settings as any)?.storageSettings?.mode === "R2",
  ).length;
  const gcsStorageCount = tenants.filter(
    (t) => (t.settings as any)?.storageSettings?.mode === "GCS",
  ).length;

  const handleExportBackup = () => {
    const data = triggerBackup();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(data));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `SaaS_Platform_Backup_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onerror = () => {
      showToast("Gagal membaca berkas snapshot.", "error");
    };
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          if (readOnlyMode) {
            showToast("Read-only mode aktif. Restore backup diblokir.", "error");
            return;
          }
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Snapshot harus berupa object JSON.");
          }

          const requiredCollections = ["tenants", "users", "branches"];
          const missing = requiredCollections.filter((key) => !Array.isArray((parsed as any)[key]));
          if (missing.length > 0) {
            throw new Error(`Snapshot tidak lengkap: ${missing.join(", ")}`);
          }
          if ((parsed as any).tenants.some((tenant: any) => !tenant?.id || !tenant?.name)) {
            throw new Error("Data tenant pada snapshot tidak valid.");
          }

          const summary = Object.entries(parsed)
            .filter(([, value]) => Array.isArray(value))
            .slice(0, 8)
            .map(([key, value]) => `${key}: ${(value as unknown[]).length}`)
            .join(" · ");

          const approved = await showConfirm({
            title: "Konfirmasi Restore Backup",
            message: `Preview snapshot: ${summary}. Restore akan mengganti state aplikasi saat ini. Lanjutkan?`,
            confirmLabel: "Restore Snapshot",
            cancelLabel: "Batal",
            type: "danger",
          });
          if (!approved) {
            showToast("Restore dibatalkan. Tidak ada data yang diubah.", "success");
            return;
          }

          restoreBackup(parsed);
          showToast("Restorasi data database SaaS berhasil disinkronkan!", "success");
        } catch (err: any) {
          showToast(err?.message || "File backup tidak valid atau rusak.", "error");
        } finally {
          e.target.value = "";
        }
      };
    }
  };

  const selectedTenant = selectedTenantForConfig
    ? tenants.find((t) => t.id === selectedTenantForConfig)
    : null;
  const currentTab = activeTab || "saas-dashboard";

  return (
    <div className="space-y-6" id="super-admin-root">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold text-slate-800 dark:text-white tracking-tight"
            id="sa-heading"
          >
            {currentTab === "saas-billing"
              ? "SaaS Billing & QRIS Langganan"
              : currentTab === "saas-tenants"
                ? "SaaS Tenant & Registrasi Hub"
                : currentTab === "saas-operations"
                ? "Operasional Platform & Antrean"
                : currentTab === "saas-audits"
                  ? "SaaS Keamanan & Recovery Console"
                  : "Global SaaS & Multi-Tenant Management"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
            Super Admin Console · Cluster Node Running Online
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void createConsoleSession(readOnlyMode ? "EDIT" : "READ_ONLY")}
            disabled={sessionLoading}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              readOnlyMode
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/50"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
            }`}
            id="sa-readonly-toggle-btn"
          >
            {readOnlyMode ? "🔒 Read-Only ON" : "🔓 Edit Mode"}
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            Live Database
          </span>
        </div>
      </div>

      {readOnlyMode && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 px-4 py-3 text-xs font-bold" id="sa-readonly-banner">
          READ-ONLY MODE aktif. Aksi tulis super admin diblokir di UI.
        </div>
      )}

      {/* 1. Langganan & QRIS Billing Tab */}
      {currentTab === "saas-billing" && <SaaSSubscription readOnlyMode={readOnlyMode} />}

      {/* 2. Global Dashboard Analytics / overview */}
      {(currentTab === "saas-dashboard" || !currentTab) && (
        <DashboardOverview
          mrr={mrr}
          arr={arr}
          totalTenants={totalTenants}
          activeTenants={activeTenants}
          trialTenants={trialTenants}
          suspendedTenants={suspendedTenants}
          systemStorageCount={systemStorageCount}
          s3StorageCount={s3StorageCount}
          r2StorageCount={r2StorageCount}
          gcsStorageCount={gcsStorageCount}
          offlineQueueLength={offlineQueue.length}
          tenants={tenants}
          readOnlyMode={readOnlyMode}
          onNavigate={onSetTab}
        />
      )}

      {/* 3. Tenants List & Registration */}
      {currentTab === "saas-tenants" && (
        <TenantsManager
          tenants={tenants}
          products={products}
          services={services}
          transactions={transactions}
          users={users}
          branches={branches}
          addTenant={addTenant}
          addUser={addUser}
          updateTenantStatus={updateTenantStatus}
          impersonateTenant={impersonateTenant}
          showConfirm={showConfirm}
          setSelectedTenantForConfig={setSelectedTenantForConfig}
          setConfigSubdomain={setConfigSubdomain}
          setConfigCustomDomain={setConfigCustomDomain}
          setConfigStorageMode={setConfigStorageMode}
          setConfigBucketName={setConfigBucketName}
          setConfigStorageLimitMb={setConfigStorageLimitMb}
          setConfigUserLimit={setConfigUserLimit}
          setConfigBranchLimit={setConfigBranchLimit}
          setConfigFeatures={setConfigFeatures}
          setConfigName={setConfigName}
          setConfigTier={setConfigTier}
          setConfigStatus={setConfigStatus}
          readOnlyMode={readOnlyMode}
        />
      )}

      {/* Operations & Queues */}
      {currentTab === "saas-operations" && <OperationsCenter readOnlyMode={readOnlyMode} />}

      {/* 4. Audits & Disaster Recovery */}
      {currentTab === "saas-audits" && (
        <AuditRecovery
          auditLogs={auditLogs}
          handleExportBackup={handleExportBackup}
          handleImportBackup={handleImportBackup}
          readOnlyMode={readOnlyMode}
        />
      )}

      {/* Infrastructure Configuration Modal */}
      {selectedTenantForConfig && selectedTenant && (
        <InfrastructureConfigModal
          tenant={selectedTenant}
          selectedTenantForConfig={selectedTenantForConfig}
          setSelectedTenantForConfig={setSelectedTenantForConfig}
          configSubdomain={configSubdomain}
          setConfigSubdomain={setConfigSubdomain}
          configCustomDomain={configCustomDomain}
          setConfigCustomDomain={setConfigCustomDomain}
          configStorageMode={configStorageMode}
          setConfigStorageMode={setConfigStorageMode}
          configBucketName={configBucketName}
          setConfigBucketName={setConfigBucketName}
          configStorageLimitMb={configStorageLimitMb}
          setConfigStorageLimitMb={setConfigStorageLimitMb}
          configUserLimit={configUserLimit}
          setConfigUserLimit={setConfigUserLimit}
          configBranchLimit={configBranchLimit}
          setConfigBranchLimit={setConfigBranchLimit}
          configFeatures={configFeatures}
          setConfigFeatures={setConfigFeatures}
          configName={configName}
          setConfigName={setConfigName}
          configTier={configTier}
          setConfigTier={setConfigTier}
          configStatus={configStatus}
          setConfigStatus={setConfigStatus}
          updateTenant={updateTenant}
          showToast={showToast}
          readOnlyMode={readOnlyMode}
        />
      )}
    </div>
  );
};
