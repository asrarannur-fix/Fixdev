import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { Download } from "lucide-react";

export const SystemBackup: React.FC = () => {
  const {
    currentTenantId,
    tenants,
    branches,
    warehouses,
    customers,
    products,
    services,
    shifts,
    transactions,
    accounts,
    journals,
    employees,
    vouchers,
    supportTickets,
    tasks,
    auditLogs,
    fraudAlerts,
    addLog,
  } = useSaaS();
  const { showToast: toast } = useToast();
  const [isPerformingBackup, setIsPerformingBackup] = useState(false);

  const backupHistory: Array<{ id: string; timestamp: string; duration: number; size: number; status: string; fileCount: number }> = [];

  const formatSize = (mb: number) => `${mb} MB`;

  const performBackup = async () => {
    if (!currentTenantId) {
      toast("Tenant aktif tidak ditemukan", "error");
      return;
    }
    setIsPerformingBackup(true);
    try {
      const tenantData = {
        backupVersion: "1.0",
        timestamp: new Date().toISOString(),
        tenantId: currentTenantId,
        tenant: tenants.find((t) => t.id === currentTenantId),
        branches: (branches || []).filter((b) => b.tenantId === currentTenantId),
        warehouses: (warehouses || []).filter((w) => w.tenantId === currentTenantId),
        customers: (customers || []).filter((c) => c.tenantId === currentTenantId),
        products: (products || []).filter((p) => p.tenantId === currentTenantId),
        services: (services || []).filter((s) => s.tenantId === currentTenantId),
        shifts: (shifts || []).filter((s) => s.tenantId === currentTenantId),
        transactions: (transactions || []).filter((t) => t.tenantId === currentTenantId),
        accounts: (accounts || []).filter((a) => a.tenantId === currentTenantId),
        journals: (journals || []).filter((j) => j.tenantId === currentTenantId),
        employees: (employees || []).filter((e) => e.tenantId === currentTenantId),
        vouchers: (vouchers || []).filter((v) => v.tenantId === currentTenantId),
        supportTickets: (supportTickets || []).filter((t) => t.tenantId === currentTenantId),
        tasks: (tasks || []).filter((t) => t.tenantId === currentTenantId),
        auditLogs: (auditLogs || []).filter((l) => l.tenantId === currentTenantId),
        fraudAlerts: (fraudAlerts || []).filter((a) => a.tenantId === currentTenantId),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tenantData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const safeTenantId = currentTenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadAnchor.setAttribute("download", `fixflow_backup_${safeTenantId}_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addLog("System Backup", `Mengekspor cadangan data tenant ${currentTenantId}`, "SYSTEM");
      toast("Cadangan data berhasil diunduh!", "success");
    } catch {
      toast("Gagal melakukan backup", "error");
    } finally {
      setIsPerformingBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-orange-900 dark:text-orange-100 mb-2">Sistem Backup & Recovery</h3>
        <p className="text-sm text-orange-700 dark:text-orange-300">Jadwal backup harian otomatis, pemantauan status, dan pemulihan sistem</p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-black">Kontrol Backup</h4>
          <button
            onClick={performBackup}
            disabled={isPerformingBackup}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-5 h-5" />
            {isPerformingBackup ? "Melakukan Backup..." : "Lakukan Backup Sekarang"}
          </button>
        </div>

        <div className="space-y-3">
          {backupHistory.map((backup) => (
            <div key={backup.id} className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">
                    {new Date(backup.timestamp).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {backup.fileCount} file - {formatSize(backup.size)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {backup.status}
                  </span>
                  <span className="text-xs text-slate-400">Durasi: {backup.duration} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6">
        <h4 className="text-lg font-black mb-4">Tentang Backup Harian</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-400 mb-2">FREKUENSI BACKUP</p>
            <p className="text-lg font-black text-blue-600">HARIAN</p>
            <p className="text-xs text-slate-500 mt-1">Setiap pukul 09.00 WIB</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-400 mb-2">TEMPAT PENYIMPANAN</p>
            <p className="text-lg font-black text-blue-600">/backups/[tanggal]</p>
            <p className="text-xs text-slate-500 mt-1">Format: tenant_backup_YYYY-MM-DD.zip</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-400 mb-2">PEMULIHAN DATA</p>
            <p className="text-lg font-black text-blue-600">JSON</p>
            <p className="text-xs text-slate-500 mt-1">Cadangan lokal siap diunduh</p>
          </div>
        </div>
      </div>
    </div>
  );
};
