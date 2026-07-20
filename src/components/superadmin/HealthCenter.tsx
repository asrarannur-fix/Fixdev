import React from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CreditCard,
  Database,
  RefreshCw,
  Server,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";

const statusStyle: Record<string, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300",
  degraded: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300",
  down: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300",
  unknown: "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
};

export default function HealthCenter() {
  const { platformHealth, refreshPlatformHealth } = useSaaS();
  const components = platformHealth.components || {};
  const cards = [
    { key: "api", label: "API", icon: Server, data: components.api, detail: components.api?.latencyMs != null ? `${components.api.latencyMs} ms` : "Latency belum tersedia" },
    { key: "database", label: "Database", icon: Database, data: components.database, detail: components.database?.latencyMs != null ? `${components.database.latencyMs} ms` : "Belum diukur" },
    { key: "billing", label: "Billing", icon: CreditCard, data: components.billing, detail: `${components.billing?.overdue || 0} overdue` },
    { key: "outbox", label: "Antrean Notifikasi", icon: BellRing, data: components.notificationOutbox, detail: `${components.notificationOutbox?.pending || 0} pending · ${components.notificationOutbox?.failed || 0} gagal` },
    { key: "backup", label: "Snapshot", icon: RefreshCw, data: components.backup, detail: components.backup?.lastJobAt ? new Date(components.backup.lastJobAt).toLocaleString("id-ID") : components.backup?.message || "Belum ada riwayat" },
    { key: "incidents", label: "Insiden", icon: AlertTriangle, data: components.incidents, detail: `${components.incidents?.open || 0} terbuka · ${components.incidents?.critical || 0} kritis` },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="health-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-lighter text-accent dark:bg-indigo-950/30 dark:text-indigo-300"><Activity className="h-5 w-5" /></div>
          <div>
            <h3 id="health-heading" className="text-base font-extrabold text-slate-900 dark:text-white">Kesehatan Platform</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Status berasal dari pemeriksaan runtime, bukan nilai statis.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[platformHealth.status] || statusStyle.unknown}`}>
            {platformHealth.status === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {platformHealth.status.toUpperCase()}
          </span>
          <button type="button" onClick={() => refreshPlatformHealth()} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <RefreshCw className={`h-3.5 w-3.5 ${platformHealth.status === "checking" ? "animate-spin" : ""}`} /> Periksa ulang
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ key, label, icon: Icon, data, detail }) => {
          const state = data?.status || "unknown";
          return (
            <article key={key} className={`rounded-xl border p-4 ${statusStyle[state] || statusStyle.unknown}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="text-sm font-bold">{label}</span></div>
                <span className="text-xs font-black uppercase">{state}</span>
              </div>
              <p className="mt-2 text-xs opacity-80">{detail}</p>
            </article>
          );
        })}
      </div>
      {platformHealth.checkedAt && <p className="mt-3 text-right text-xs text-slate-400">Diperiksa {new Date(platformHealth.checkedAt).toLocaleString("id-ID")}</p>}
    </section>
  );
}
