import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  Clock,
} from 'lucide-react';

interface PrintJobRecord {
  id: string;
  document_type: string;
  document_id: string | null;
  printer: string | null;
  transport: string;
  status: string;
  error_code: string | null;
  reprint: boolean;
  created_at: string;
}

interface PrintAnalyticsProps {
  apiFetch: (url: string, opts?: any) => Promise<any>;
  branchId: string;
}

const COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
];

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const PrintAnalytics: React.FC<PrintAnalyticsProps> = ({ apiFetch, branchId }) => {
  const [jobs, setJobs] = useState<PrintJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');

  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/print-jobs?limit=500');
      setJobs(res?.jobs || []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (branchId) fetchJobs();
  }, [branchId, fetchJobs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === '24h' ? now - 86400000 : range === '7d' ? now - 604800000 : now - 2592000000;
    return jobs.filter((j) => new Date(j.created_at).getTime() >= cutoff);
  }, [jobs, range]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const submitted = filtered.filter((j) => j.status === 'submitted').length;
    const failed = filtered.filter((j) => j.status === 'failed').length;
    const reprints = filtered.filter((j) => j.reprint).length;
    const errorRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0';
    return { total, submitted, failed, reprints, errorRate };
  }, [filtered]);

  const byDocument = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((j) => {
      map[j.document_type] = (map[j.document_type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byTransport = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((j) => {
      map[j.transport] = (map[j.transport] || 0) + 1;
    });
    return Object.entries(map);
  }, [filtered]);

  const byPrinter = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((j) => {
      if (j.printer) map[j.printer] = (map[j.printer] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byHour = useMemo(() => {
    const buckets = new Array(24).fill(0);
    filtered.forEach((j) => {
      const h = new Date(j.created_at).getHours();
      buckets[h]++;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map((v, i) => ({ hour: i, count: v, pct: (v / max) * 100 }));
  }, [filtered]);

  const byDay = useMemo(() => {
    const map: Record<string, { total: number; failed: number }> = {};
    filtered.forEach((j) => {
      const d = new Date(j.created_at).toLocaleDateString('id-ID', { weekday: 'short' });
      if (!map[d]) map[d] = { total: 0, failed: 0 };
      map[d].total++;
      if (j.status === 'failed') map[d].failed++;
    });
    return Object.entries(map);
  }, [filtered]);

  const maxCount = Math.max(...byDocument.map(([, v]) => v), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Analitik Pencetakan
            </h4>
            <p className="text-[10px] text-slate-400">
              {stats.total} job dalam{' '}
              {range === '24h' ? '24 jam' : range === '7d' ? '7 hari' : '30 hari'}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${range === r ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {r === '24h' ? '24J' : r === '7d' ? '7H' : '30H'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[10px] text-red-600 bg-red-50 rounded-xl p-3 font-mono">{error}</div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-[10px]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat analitik...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Cetak',
                value: stats.total,
                icon: Printer,
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                label: 'Berhasil',
                value: stats.submitted,
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                label: 'Gagal',
                value: stats.failed,
                icon: XCircle,
                color: 'text-rose-600 bg-rose-50',
              },
              {
                label: 'Error Rate',
                value: `${stats.errorRate}%`,
                icon: AlertTriangle,
                color: 'text-amber-600 bg-amber-50',
              },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 flex items-center gap-2`}>
                <s.icon className="w-5 h-5" />
                <div>
                  <div className="text-lg font-extrabold">{s.value}</div>
                  <div className="text-[9px] font-bold opacity-70">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-100 rounded-xl p-4">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Per Dokumen</h5>
              <div className="space-y-2">
                {byDocument.map(([type, count], idx) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500 w-24 truncate">
                      {type}
                    </span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 w-6 text-right">
                      {count}
                    </span>
                  </div>
                ))}
                {byDocument.length === 0 && (
                  <p className="text-[9px] text-slate-400">Tidak ada data</p>
                )}
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-4">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Per Transport</h5>
              <div className="space-y-2">
                {byTransport.map(([transport, count]) => (
                  <div key={transport} className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${transport === 'qz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {transport === 'qz' ? 'QZ Tray' : 'Browser'}
                    </span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${transport === 'qz' ? 'bg-purple-500' : 'bg-blue-500'}`}
                        style={{ width: `${(count / Math.max(stats.total, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-4">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Per Printer</h5>
              <div className="space-y-1.5">
                {byPrinter.map(([printer, count], idx) => (
                  <div key={printer} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-600 truncate max-w-[120px]">
                      {printer}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                          style={{
                            width: `${(count / Math.max(byPrinter[0]?.[1] || 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">{count}</span>
                    </div>
                  </div>
                ))}
                {byPrinter.length === 0 && (
                  <p className="text-[9px] text-slate-400">Belum ada data printer</p>
                )}
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-4">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase mb-3">
                Distribusi Jam
              </h5>
              <div className="flex items-end gap-px h-16">
                {byHour.map(({ hour, pct }) => (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                    title={`${hour}:00 — ${byHour[hour].count} cetak`}
                  >
                    <div
                      className="w-full bg-indigo-400 rounded-t"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[7px] text-slate-400 mt-1">
                <span>0</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
            </div>
          </div>

          {byDay.length > 0 && (
            <div className="border border-slate-100 rounded-xl p-4">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Trend Harian
              </h5>
              <div className="flex items-end gap-2 h-20">
                {byDay.map(([, { total, failed }], idx) => {
                  const maxDay = Math.max(...byDay.map(([, d]) => d.total), 1);
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`${total} total, ${failed} gagal`}
                    >
                      <div
                        className="w-full relative"
                        style={{ height: `${(total / maxDay) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-emerald-400 rounded-t" />
                        {failed > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-rose-400 rounded-b"
                            style={{ height: `${(failed / total) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-1">
                {byDay.map(([day], idx) => (
                  <span key={idx}>{day}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
