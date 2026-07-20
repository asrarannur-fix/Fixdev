import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Copy, Database, Eye, EyeOff, RefreshCw, Server, Trash2 } from "lucide-react";
import { Tenant } from "../../types";

interface SupabaseSettingsProps {
  supabaseConfig: any;
  updateSupabaseConfig: (cfg: any) => void;
  testSupabaseConnection: (cfg: any) => Promise<any>;
  runSupabaseMigration: () => Promise<any>;
  showToast: (msg: string, type: "success" | "error") => void;
  readOnlyMode?: boolean;
  tenants: Tenant[];
  branches: any[];
  warehouses: any[];
  users: any[];
  products: any[];
  services: any[];
  shifts: any[];
  transactions: any[];
  accounts: any[];
  journals: any[];
  workflows: any[];
  auditLogs: any[];
}

type EnvStatus = {
  url: string;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  hasDbUrl: boolean;
  dbHost: string;
};

export const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({
  supabaseConfig,
  updateSupabaseConfig,
  testSupabaseConnection,
  runSupabaseMigration,
  showToast,
  readOnlyMode = false,
  tenants,
  branches,
  warehouses,
  users,
  products,
  services,
  shifts,
  transactions,
  accounts,
  journals,
  workflows,
  auditLogs,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.url || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(supabaseConfig.anonKey || "");
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [envLoading, setEnvLoading] = useState(true);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const fetchEnvStatus = async () => {
    setEnvLoading(true);
    try {
      const response = await fetch("/api/supabase/env-status");
      if (response.ok) setEnvStatus(await response.json());
    } finally {
      setEnvLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvStatus();
  }, []);

  useEffect(() => {
    if (!envStatus?.url || supabaseUrl.startsWith("http")) return;
    setSupabaseUrl(envStatus.url);
    updateSupabaseConfig({ url: envStatus.url });
  }, [envStatus, supabaseUrl, updateSupabaseConfig]);

  const saveConfig = () => {
    const cleanUrl = supabaseUrl.trim();
    const cleanAnonKey = supabaseAnonKey.trim();
    if (cleanUrl && !/^https?:\/\//.test(cleanUrl)) {
      showToast("URL Supabase harus diawali http:// atau https://.", "error");
      return;
    }
    updateSupabaseConfig({
      url: cleanUrl,
      anonKey: cleanAnonKey,
    });
    setSupabaseUrl(cleanUrl);
    setSupabaseAnonKey(cleanAnonKey);
    showToast("Konfigurasi Supabase disimpan di browser.", "success");
  };

  const syncFromEnv = () => {
    if (!envStatus?.url) return;
    setSupabaseUrl(envStatus.url);
    updateSupabaseConfig({ url: envStatus.url });
    showToast("URL Supabase dari Docker .env disalin ke UI.", "success");
  };

  const clearBrowserConfig = () => {
    localStorage.removeItem("saas_supabase_config");
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    updateSupabaseConfig({ url: "", anonKey: "" });
    showToast("Config browser dihapus. Refresh untuk membaca ENV lagi.", "success");
  };

  const testConnection = async () => {
    setIsTestingConn(true);
    setTestResult(null);
    const cleanUrl = supabaseUrl.trim();
    const cleanAnonKey = supabaseAnonKey.trim();
    if (cleanUrl && !/^https?:\/\//.test(cleanUrl)) {
      setTestResult({ success: false, message: "URL Supabase harus diawali http:// atau https://." });
      setIsTestingConn(false);
      return;
    }
    try {
      setTestResult(await testSupabaseConnection({ url: cleanUrl, anonKey: cleanAnonKey }));
    } catch (error: any) {
      setTestResult({ success: false, message: "Koneksi terputus.", details: error.message });
    } finally {
      setIsTestingConn(false);
    }
  };

  const tableStats = [
    ["tenants", tenants.length],
    ["branches", branches.length],
    ["warehouses", warehouses.length],
    ["users", users.length],
    ["products", products.length],
    ["services", services.length],
    ["shifts", shifts.length],
    ["transactions", transactions.length],
    ["coa_accounts", accounts.length],
    ["journal_entries", journals.length],
    ["workflows", workflows.length],
    ["audit_logs", auditLogs.length],
  ];

  return (
    <div className="space-y-6 animate-fadeIn" id="saas-supabase-panel">
      <section className="rounded-3xl border border-teal-200/60 bg-gradient-to-r from-teal-50 via-emerald-50 to-white p-6 dark:border-teal-900/40 dark:from-teal-950/20 dark:via-emerald-950/10 dark:to-zinc-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600"><Database className="h-6 w-6" /></div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">Supabase Control Center</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">UI dipisah jelas: Docker/server ENV adalah sumber aktif produksi; form browser hanya override lokal untuk testing.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black dark:border-zinc-800 dark:bg-zinc-900">
            {supabaseConfig.isConfigured ? "🟢 Browser Config Ready" : "🟡 Browser Config Empty"}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200"><Server className="h-4 w-4 text-indigo-500" /> Docker ENV aktif</h4>
          <button onClick={fetchEnvStatus} className="flex items-center gap-1 text-[10px] font-bold text-accent"><RefreshCw className={`h-3 w-3 ${envLoading ? "animate-spin" : ""}`} /> Periksa ulang</button>
        </div>
        {envStatus ? (
          <div className="grid gap-3 md:grid-cols-5">
            <StatusTile label="URL" value={envStatus.url || "Kosong"} ok={Boolean(envStatus.url)} />
            <StatusTile label="Anon Key" value={envStatus.hasAnonKey ? "Terpasang" : "Kosong"} ok={envStatus.hasAnonKey} />
            <StatusTile label="Service Key" value={envStatus.hasServiceRoleKey ? "Terpasang" : "Kosong"} ok={envStatus.hasServiceRoleKey} />
            <StatusTile label="DB URL" value={envStatus.hasDbUrl ? "Terpasang" : "Kosong"} ok={envStatus.hasDbUrl} />
            <StatusTile label="DB Host" value={envStatus.dbHost || "-"} ok={Boolean(envStatus.dbHost)} />
          </div>
        ) : (
          <p className="text-xs text-amber-500">Belum bisa membaca `/api/supabase/env-status`.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Kredensial Browser Override</h4>
            <div className="flex gap-2">
              <button id="sa-supabase-sync-btn" onClick={syncFromEnv} disabled={!envStatus?.url || readOnlyMode} className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-accent-lighter px-3 py-1.5 text-[10px] font-bold text-accent disabled:opacity-40"><Copy className="h-3 w-3" /> Sync ENV</button>
              <button onClick={clearBrowserConfig} disabled={readOnlyMode} className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Clear Browser</button>
            </div>
          </div>

          <Field label="URL Proyek Supabase" suffix="public" value={supabaseUrl} onChange={setSupabaseUrl} placeholder="https://project.supabase.co" />
          <SecretField label="Anon Key" suffix="public" value={supabaseAnonKey} onChange={setSupabaseAnonKey} show={showAnonKey} setShow={setShowAnonKey} />

          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button onClick={saveConfig} disabled={readOnlyMode} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200">Simpan Lokal</button>
            <div className="flex flex-wrap gap-2">
              <button id="sa-supabase-migrate-btn" onClick={async () => { const result = await runSupabaseMigration(); showToast(result?.success ? "Migrasi Supabase selesai." : "Migrasi Supabase gagal.", result?.success ? "success" : "error"); }} disabled={readOnlyMode} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Database className="h-3.5 w-3.5" /> Jalankan Migrasi</button>
              <button id="sa-supabase-test-btn" onClick={testConnection} disabled={isTestingConn || readOnlyMode} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Activity className="h-3.5 w-3.5" /> {isTestingConn ? "Menguji..." : "Simpan & Uji"}</button>
            </div>
          </div>

          {testResult && (
            <div className={`rounded-2xl border p-4 text-xs ${testResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              <div className="flex items-center gap-2 font-black">{testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {testResult.success ? "Koneksi OK" : "Koneksi gagal"}</div>
              <p className="mt-1">{testResult.message}</p>
              {testResult.details && <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-100">{testResult.details}</pre>}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Skema Database ERP</h4>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {tableStats.map(([name, count]) => (
              <div key={String(name)} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-zinc-900 dark:bg-zinc-950">
                <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">{name}</span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">{count} baris</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const StatusTile = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-900 dark:bg-zinc-950">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-1 truncate text-[11px] font-bold ${ok ? "text-teal-600" : "text-amber-500"}`}>{ok ? "✓ " : "✗ "}{value}</p>
  </div>
);

const Field = ({ label, suffix, value, onChange, placeholder }: { label: string; suffix: string; value: string; onChange: (value: string) => void; placeholder: string }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">{label} <em className="not-italic text-teal-500">({suffix})</em></span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950" />
  </label>
);

const SecretField = ({ label, suffix, value, onChange, show, setShow }: { label: string; suffix: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (value: boolean) => void }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">{label} <em className="not-italic text-rose-500">({suffix})</em></span>
    <span className="relative block">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 font-mono text-xs outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
    </span>
  </label>
);
