import React, { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Database, Download, RefreshCw, ShieldAlert } from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { readJsonResponse } from "../../utils/apiResponse";
import RolePermissionMatrix from "./RolePermissionMatrix";

interface AuditRecoveryProps {
  auditLogs: any[];
  handleExportBackup: () => void;
  handleImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnlyMode?: boolean;
}

export const AuditRecovery: React.FC<AuditRecoveryProps> = ({ auditLogs, handleExportBackup, handleImportBackup, readOnlyMode = false }) => {
  const { apiFetch } = useSaaS();
  const [auditSearch, setAuditSearch] = useState("");
  const [outcome, setOutcome] = useState("");
  const [auditItems, setAuditItems] = useState<any[]>(auditLogs);
  const [backupJobs, setBackupJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"audit" | "backup" | "roles">("audit");

  const loadOperations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (auditSearch.trim()) params.set("search", auditSearch.trim());
      if (outcome) params.set("outcome", outcome);
      const [auditResponse, backupResponse] = await Promise.all([
        apiFetch(`/api/superadmin/audit?${params.toString()}`),
        apiFetch("/api/superadmin/backups"),
      ]);
      const auditData = await readJsonResponse<any>(auditResponse, "Audit Super Admin");
      const backupData = await readJsonResponse<any>(backupResponse, "Riwayat snapshot");
      setAuditItems(auditData.items || []);
      setBackupJobs(backupData.jobs || []);
    } catch {
      setAuditItems(auditLogs);
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(loadOperations, 250); return () => window.clearTimeout(timer); }, [auditSearch, outcome]);

  const displayedAudit = useMemo(() => auditItems.filter((log) => !auditSearch || JSON.stringify(log).toLowerCase().includes(auditSearch.toLowerCase())), [auditItems, auditSearch]);

  const exportAudit = (format: "json" | "csv") => {
    const content = format === "json" ? JSON.stringify(displayedAudit, null, 2) : ["timestamp,actor,tenant,action,outcome,resource,correlationId", ...displayedAudit.map((log) => [log.created_at || log.timestamp, log.actor_name || log.userName, log.tenant_name || log.tenantId, log.action, log.outcome || "SUCCESS", log.resource_id || "", log.correlation_id || ""].map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: format === "json" ? "application/json" : "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `superadmin-audit-${new Date().toISOString().slice(0, 10)}.${format}`; anchor.click(); URL.revokeObjectURL(url);
  };

  const recordSnapshot = async () => {
    const response = await apiFetch("/api/superadmin/backups", { method: "POST", headers: { "X-SuperAdmin-Mode": readOnlyMode ? "read-only" : "edit" }, body: JSON.stringify({ mode: "SNAPSHOT", fileName: `application-snapshot-${new Date().toISOString().slice(0, 10)}.json`, schemaVersion: 1, summary: { source: "superadmin-console" } }) });
    await readJsonResponse(response, "Metadata snapshot");
    handleExportBackup();
    await loadOperations();
  };

  return <div className="space-y-6" id="sa-bottom-infrastructure">
    <nav className="flex flex-wrap gap-2" aria-label="Keamanan dan recovery">{([['audit','Audit'],['backup','Backup & Recovery'],['roles','Role & Permission']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setActiveSection(id)} className={`rounded-xl px-4 py-2 text-xs font-bold ${activeSection === id ? 'bg-accent text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>{label}</button>)}</nav>
    {activeSection === "backup" && <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Database className="h-4 w-4" /> Snapshot Aplikasi & Pemulihan</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">Snapshot JSON hanya untuk ekspor data aplikasi. Restore database belum tersedia dan harus dilakukan melalui prosedur terkelola.</p>
        <button type="button" disabled={readOnlyMode} onClick={recordSnapshot} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-bold text-white disabled:opacity-40"><Download className="h-4 w-4" /> Catat & unduh snapshot</button>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 dark:border-zinc-700">Restore snapshot dinonaktifkan sampai endpoint restore database transaksional tersedia.</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><ArchiveRestore className="h-4 w-4" /> Riwayat Snapshot</h3><button type="button" onClick={loadOperations} className="rounded-lg border border-slate-200 p-2 dark:border-zinc-700" aria-label="Muat ulang"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{backupJobs.length ? backupJobs.map((job) => <div key={job.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-800"><span><b>{job.job_type}</b><br/><span className="text-slate-500">{job.file_name || job.source}</span></span><span className="text-right font-bold">{job.status}<br/><span className="font-normal text-slate-400">{new Date(job.created_at).toLocaleString("id-ID")}</span></span></div>) : <p className="py-10 text-center text-sm text-slate-500">Belum ada riwayat snapshot.</p>}</div>
      </article>
    </section>}

    {activeSection === "audit" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-zinc-800"><div><h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><ShieldAlert className="h-4 w-4 text-rose-500" /> Audit Super Admin</h3><p className="mt-1 text-xs text-slate-500">Actor, tenant, outcome, resource, IP, correlation ID, dan perubahan state.</p></div><div className="flex flex-wrap gap-2"><input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder="Cari audit..." className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"/><select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"><option value="">Semua outcome</option><option value="SUCCESS">Success</option><option value="DENIED">Denied</option><option value="FAILED">Failed</option></select><button type="button" onClick={() => exportAudit("csv")} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">CSV</button><button type="button" onClick={() => exportAudit("json")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-zinc-700">JSON</button></div></div>
      <div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">{displayedAudit.length ? displayedAudit.map((log) => <details key={log.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-800"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><span><b>{log.action}</b> · {log.actor_name || log.userName || "System"}<br/><span className="text-slate-500">{log.tenant_name || log.effective_tenant_id || "Platform"} · {log.resource_type || log.category}</span></span><span className="text-right font-bold">{log.outcome || log.riskLevel || "SUCCESS"}<br/><span className="font-normal text-slate-400">{new Date(log.created_at || log.timestamp).toLocaleString("id-ID")}</span></span></div></summary><pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] dark:bg-zinc-950">{JSON.stringify({ correlationId: log.correlation_id, clientIp: log.client_ip || log.ipAddress, resourceId: log.resource_id, before: log.before_state, after: log.after_state, metadata: log.metadata, details: log.details }, null, 2)}</pre></details>) : <p className="py-12 text-center text-sm text-slate-500">Tidak ada audit yang cocok.</p>}</div>
    </section>}
    {activeSection === "roles" && <RolePermissionMatrix readOnlyMode={readOnlyMode} />}
  </div>;
};
