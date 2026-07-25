import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  Clock3,
  CreditCard,
  TrendingUp,
  Wrench,
  ShoppingBag,
  Package,
  BookOpen,
  Users,
  Megaphone,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';
import type { SuperAdminOverview, Tenant } from '../../types';
import {
  fetchSuperAdminOverview,
  fetchAggregatedOperationalSummary,
} from '../../services/superadminApi';
import HealthCenter from './HealthCenter';

interface DashboardOverviewProps {
  mrr: number;
  arr: number;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  systemStorageCount: number;
  s3StorageCount: number;
  r2StorageCount: number;
  gcsStorageCount: number;
  offlineQueueLength: number;
  tenants: Tenant[];
  readOnlyMode?: boolean;
  onNavigate?: (tab: string, filter?: string) => void;
}

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;

interface ModuleKPI {
  label: string;
  value: string | number;
  meta: string;
  icon: any;
  color: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  mrr,
  arr,
  totalTenants,
  activeTenants,
  trialTenants,
  suspendedTenants,
  systemStorageCount,
  s3StorageCount,
  r2StorageCount,
  gcsStorageCount,
  offlineQueueLength,
  tenants,
  readOnlyMode,
  onNavigate,
}) => {
  const { apiFetch } = useSaaS();
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [aggregatedSummary, setAggregatedSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchSuperAdminOverview(apiFetch, Boolean(readOnlyMode)),
      fetchAggregatedOperationalSummary(apiFetch, Boolean(readOnlyMode)),
    ])
      .then(([overviewData, aggData]) => {
        if (active) {
          setOverview(overviewData);
          setAggregatedSummary(aggData);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Data operasional belum tersedia.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, readOnlyMode]);

  const metrics = overview?.metrics || {
    mrr,
    arr,
    receivedThisMonth: 0,
    outstanding: 0,
    overdueInvoices: 0,
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    pendingManualPayments: 0,
    trialExpiring: tenants.filter(
      (tenant) =>
        tenant.status === 'TRIAL' &&
        tenant.trialEndsAt &&
        new Date(tenant.trialEndsAt).getTime() <= Date.now() + 7 * 86400000
    ).length,
    unreadNotifications: 0,
  };

  const trialRows = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.status === 'TRIAL' && tenant.trialEndsAt)
        .map((tenant) => ({
          tenant,
          days: Math.max(
            0,
            Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000)
          ),
        }))
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [tenants]
  );

  const cards = [
    {
      label: 'MRR Terbayar',
      value: rupiah(metrics.mrr),
      meta: `ARR ${rupiah(metrics.arr)}`,
      icon: TrendingUp,
      tab: 'saas-billing',
      filter: 'paid',
    },
    {
      label: 'Diterima Bulan Ini',
      value: rupiah(metrics.receivedThisMonth),
      meta: 'Settlement terverifikasi',
      icon: Banknote,
      tab: 'saas-billing',
      filter: 'paid-this-month',
    },
    {
      label: 'Piutang Terbuka',
      value: rupiah(metrics.outstanding),
      meta: `${metrics.overdueInvoices} invoice overdue`,
      icon: CreditCard,
      tab: 'saas-billing',
      filter: 'overdue',
    },
    {
      label: 'Tenant Aktif',
      value: String(metrics.activeTenants),
      meta: `${metrics.totalTenants} tenant terdaftar`,
      icon: Building2,
      tab: 'saas-tenants',
      filter: 'active',
    },
  ];

  const moduleKPIs: ModuleKPI[] = useMemo(() => {
    if (!aggregatedSummary?.summaries) return [];
    const agg = aggregatedSummary.aggregate;
    const totalOpenTickets = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.service?.open_tickets || 0),
      0
    );
    const totalVoid = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.pos?.void_count || 0),
      0
    );
    const totalOutOfStock = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.inventory?.out_of_stock || 0),
      0
    );
    const totalLowStock = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.inventory?.low_stock || 0),
      0
    );
    const totalJournalUnbalanced = aggregatedSummary.summaries.reduce((sum: number, s: any) => {
      const m = s.modules.accounting;
      return sum + ((m?.total_debit || 0) !== (m?.total_credit || 0) ? 1 : 0);
    }, 0);
    const totalEmployees = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.hr?.employee_count || 0),
      0
    );
    const totalDeals = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.crm?.active_deals || 0),
      0
    );
    const totalPipelineValue = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.crm?.pipeline_value || 0),
      0
    );
    const totalSupportOpen = aggregatedSummary.summaries.reduce(
      (sum: number, s: any) => sum + (s.modules.support?.open_tickets || 0),
      0
    );

    return [
      {
        label: 'Tiket Servis Terbuka',
        value: totalOpenTickets,
        meta: `dari ${aggregatedSummary.tenantCount} tenant`,
        icon: Wrench,
        color: totalOpenTickets > 0 ? 'text-amber-600' : 'text-emerald-600',
      },
      {
        label: 'Void Nota Hari Ini',
        value: totalVoid,
        meta: 'transaksi POS',
        icon: ShoppingBag,
        color: totalVoid > 0 ? 'text-amber-600' : 'text-emerald-600',
      },
      {
        label: 'Stok Habis',
        value: totalOutOfStock,
        meta: `low stock: ${totalLowStock}`,
        icon: Package,
        color: totalOutOfStock > 0 ? 'text-rose-600' : 'text-emerald-600',
      },
      {
        label: 'Jurnal Belum Balance',
        value: totalJournalUnbalanced,
        meta: 'tenant bermasalah',
        icon: BookOpen,
        color: totalJournalUnbalanced > 0 ? 'text-rose-600' : 'text-emerald-600',
      },
      {
        label: 'Karyawan Aktif',
        value: totalEmployees,
        meta: 'total karyawan',
        icon: Users,
        color: totalEmployees === 0 ? 'text-amber-600' : 'text-emerald-600',
      },
      {
        label: 'Deal CRM Aktif',
        value: totalDeals,
        meta: `pipeline: Rp ${totalPipelineValue.toLocaleString('id-ID')}`,
        icon: Megaphone,
        color: totalDeals > 0 ? 'text-blue-600' : 'text-slate-400',
      },
      {
        label: 'Support Ticket Terbuka',
        value: totalSupportOpen,
        meta: 'support lintas tenant',
        icon: MessageSquare,
        color: totalSupportOpen > 0 ? 'text-amber-600' : 'text-emerald-600',
      },
    ];
  }, [aggregatedSummary]);

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
        >
          API ringkasan belum dapat digunakan; angka fallback ditampilkan. {error}
        </div>
      )}
      <section aria-labelledby="kpi-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="kpi-heading" className="text-sm font-extrabold text-slate-900 dark:text-white">
            Ringkasan Bisnis
          </h3>
          {loading && <span className="text-xs text-slate-400">Memuat data database…</span>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, meta, icon: Icon, tab, filter }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate?.(tab, filter)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-accent/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                </div>
                <span className="rounded-xl bg-accent-lighter p-2 text-accent dark:bg-indigo-950/30 dark:text-indigo-300">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                <span>{meta}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Module KPIs */}
      {!loading && moduleKPIs.length > 0 && (
        <section aria-labelledby="module-kpi-heading">
          <div className="mb-3 flex items-center justify-between">
            <h3
              id="module-kpi-heading"
              className="text-sm font-extrabold text-slate-900 dark:text-white"
            >
              KPI Operasional Per Modul
            </h3>
            <span className="text-xs text-slate-400">Ringkasan lintas tenant</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {moduleKPIs.map(({ label, value, meta, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                    {label}
                  </span>
                </div>
                <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
                <p className="mt-1 text-[10px] text-slate-400">{meta}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        aria-labelledby="attention-heading"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3
              id="attention-heading"
              className="text-sm font-extrabold text-slate-900 dark:text-white"
            >
              Butuh Perhatian
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Prioritas operasional berdasarkan data terbaru.
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="mt-4 space-y-2">
          {overview?.actions.length ? (
            overview.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate?.(action.targetTab, action.targetFilter)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-950"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`grid h-8 min-w-8 place-items-center rounded-lg text-xs font-black ${action.severity === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}
                  >
                    {action.count}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                    {action.label}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
              Tidak ada tindakan mendesak yang terdeteksi.
            </div>
          )}
        </div>
      </section>

      <HealthCenter />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Status Tenant</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ['Trial', metrics.trialTenants],
              ['Suspend', metrics.suspendedTenants],
              ['Segera berakhir', metrics.trialExpiring],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl bg-slate-50 p-3 text-center dark:bg-zinc-950"
              >
                <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Trial Terdekat</h3>
          <div className="mt-3 space-y-2">
            {trialRows.length ? (
              trialRows.map(({ tenant, days }) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => onNavigate?.('saas-tenants', 'trial-warning')}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-950"
                >
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-zinc-200">
                      {tenant.name}
                    </span>
                    <span className="text-xs text-slate-400">{tenant.tier}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Clock3 className="h-3.5 w-3.5" /> {days} hari
                  </span>
                </button>
              ))
            ) : (
              <p className="py-5 text-center text-sm text-slate-500">Tidak ada trial aktif.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
