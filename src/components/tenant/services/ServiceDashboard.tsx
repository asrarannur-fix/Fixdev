import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Bell,
} from 'lucide-react';

// Notification system
interface ServiceNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

const useServiceNotifications = (tickets: any[]) => {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);

  useEffect(() => {
    if (!tickets || tickets.length === 0) return;

    // Check for new completed tickets
    const completedTickets = tickets.filter(t => t.status === 'SELESAI');
    const newCompleted = completedTickets.filter(t => !t._notified);

    newCompleted.forEach(ticket => {
      setNotifications(prev => [
        ...prev,
        {
          id: ticket.id,
          message: `Tiket #${ticket.id} telah selesai`,
          type: 'success',
          timestamp: Date.now(),
        },
      ]);
    });

    // Auto-remove notifications after 5s
    notifications.forEach(n => {
      if (Date.now() - n.timestamp > 5000) {
        setNotifications(prev => prev.filter(x => x.id !== n.id));
      }
    });
  }, [tickets]);

  return notifications;
};

const STATUS_COLORS: Record<string, string> = {
  DITERIMA: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  DIAGNOSA: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  MENUGGU_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  SEDANG_DIKERJAKAN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  SELESAI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  DIAMBIL: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  DIBATALKAN: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
};

interface ServiceDashboardProps {
  tickets: any[];
}

export const ServiceDashboard: React.FC<ServiceDashboardProps> = ({ tickets }) => {
  const total = tickets.length;
  const open = tickets.filter((t) =>
    [
      'DITERIMA',
      'DIAGNOSA',
      'ANTRIAN',
      'MENUGGU_APPROVAL',
      'SEDANG_DIKERJAKAN',
      'MENUGGU_SPAREPART',
    ].includes(t.status)
  ).length;
  const completed = tickets.filter((t) => t.status === 'SELESAI').length;
  const cancelled = tickets.filter((t) => t.status === 'DIBATALKAN').length;
  const warrantyClaims = tickets.filter((t) => t.status === 'KLAIM_GARANSI').length;

  const totalCost = tickets.reduce((sum, t) => sum + (Number(t.estimatedCost) || 0), 0);
  const avgCost = total > 0 ? Math.round(totalCost / total) : 0;

  const byStatus = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const priorityCounts = { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0 };
  tickets.forEach((t) => {
    if (t.priority in priorityCounts) priorityCounts[t.priority as keyof typeof priorityCounts]++;
  });

  const kpiCards = [
    {
      label: 'Total Tiket',
      value: total,
      icon: BarChart3,
      color: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      label: 'Terbuka',
      value: open,
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-950/30',
    },
    {
      label: 'Selesai',
      value: completed,
      icon: CheckCircle2,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    },
    {
      label: 'Dibatalkan',
      value: cancelled,
      icon: AlertTriangle,
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-950/30',
    },
    {
      label: 'Klaim Garansi',
      value: warrantyClaims,
      icon: Wallet,
      color: 'text-violet-700 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-950/30',
    },
    {
      label: 'Est. Biaya (Total)',
      value: `Rp ${totalCost.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10 dark:bg-accent/20',
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`${bg} rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </div>
            <div className={`text-lg font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Status Distribution + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Distribusi Status
          </h3>
          <div className="space-y-3">
            {byStatus.map(([status, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {status}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Prioritas
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(priorityCounts).map(([level, count]) => (
              <div key={level} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                    {count}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  {level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm p-5">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Ringkasan Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-black text-accent">
              {total > 0 ? Math.round((completed / total) * 100) : 0}%
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">
              Selesai
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {total > 0 ? Math.round((open / total) * 100) : 0}%
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">
              Terbuka
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
              {avgCost.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">
              Est. Biaya Rata-rata
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-violet-700 dark:text-violet-400">
              {warrantyClaims}
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">
              Klaim Garansi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
