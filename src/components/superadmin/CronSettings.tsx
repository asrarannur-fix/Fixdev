// CronSettings — Superadmin cron notification settings UI
import React, { useState, useEffect } from "react";

interface CronLog {
  id?: string;
  jobName: string;
  status: "success" | "error" | "running";
  message: string;
  executedAt: string;
  tenantCount?: number;
  logs?: string[];
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const CRON_JOBS = [
  { id: "notify-due-reminders", label: "Kirim Pengingat Jatuh Tempo", desc: "Kirim notifikasi H-7, H-3, H-1 ke tenant dengan invoice unpaid" },
  { id: "notify-overdue-alerts", label: "Kirim Alert Overdue", desc: "Kirim peringatan ke tenant dengan invoice overdue" },
  { id: "notify-overdue-deep", label: "Alert Overdue lanjutan (>3 hari)", desc: "Kirim email ke tenant dengan invoice >3 hari overdue" },
  { id: "notify-trial-expiring", label: "Alert Trial Berakhir (<7 hari)", desc: "Kirim notifikasi ke tenant trial yang akan berakhir" },
  { id: "notify-payment-confirmation", label: "Konfirmasi Pembayaran", desc: "Kirim notifikasi pembayaran dikonfirmasi ke tenant" },
  { id: "simulate-recurring-cron", label: "Auto-Renew Subscription", desc: "Buat invoice renewal untuk langganan bulanan/tahunan yang expired" },
  { id: "simulate-trial-expiry", label: "Proses Trial Berakhir", desc: "Flip TRIAL→EXPIRED + tier→BASIC untuk trial yang expired" },
];

const STATUS_ICONS = {
  success: "✅",
  error: "❌",
  running: "⏳",
};

export const CronSettings: React.FC = () => {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCron = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch(`/api/billing/${jobId}`, { method: "POST" });
      setLogs((prev) => [
        {
          jobName: jobId,
          status: "success",
          message: result?.message || "Berhasil",
          executedAt: new Date().toISOString(),
          logs: result?.logs || [],
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLogs((prev) => [
        {
          jobName: jobId,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
          executedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setRunningJob(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Cron Scheduler & Notifikasi</h3>
        <span className="text-xs text-slate-400 font-mono">{CRON_JOBS.length} job tersedia</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {CRON_JOBS.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-sm transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 dark:text-white text-sm">{job.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{job.desc}</div>
              <code className="text-[10px] font-mono text-slate-400 mt-1 block">POST /api/billing/{job.id}</code>
            </div>
            <button
              onClick={() => runCron(job.id)}
              disabled={loading || runningJob === job.id}
              className={`ml-4 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                loading || runningJob === job.id
                  ? "bg-slate-200 text-slate-500 cursor-wait"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {loading && runningJob === job.id ? "⏳…" : "▶ Jalankan"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Log Eksekusi</h4>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">Belum ada eksekusi cron</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{STATUS_ICONS[log.status]}</span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.jobName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{new Date(log.executedAt).toLocaleString("id-ID")}</span>
                    {log.logs && log.logs.length > 0 && (
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.jobName + i ? null : log.jobName + i)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
                      >
                        {expandedLog === log.jobName + i ? "▲ Sembunyikan" : "▼ Detail"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{log.message}</div>
                {expandedLog === log.jobName + i && log.logs && (
                  <pre className="mt-2 text-xs font-mono text-slate-500 bg-white dark:bg-slate-700 rounded-lg p-3 overflow-x-auto max-h-40">
                    {log.logs.join("\n")}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
