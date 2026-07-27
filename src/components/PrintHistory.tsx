import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, Printer, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface PrintJobRecord {
  id: string;
  branch_id: string;
  user_id: string | null;
  document_type: string;
  document_id: string | null;
  printer: string | null;
  transport: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  reprint: boolean;
  reprint_reason: string | null;
  reprint_sequence: number;
  content_hash: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

interface PrintHistoryProps {
  apiFetch: (url: string, opts?: any) => Promise<any>;
  branchId: string;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; icon: React.FC<any> }> = {
  submitted: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  started: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
};

const TRANSPORT_LABEL: Record<string, string> = {
  qz: 'QZ Tray',
  browser: 'Browser',
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const PrintHistory: React.FC<PrintHistoryProps> = ({ apiFetch, branchId }) => {
  const [jobs, setJobs] = useState<PrintJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/print-jobs?limit=100');
      setJobs(res?.jobs || []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat riwayat cetak');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (branchId) fetchJobs();
  }, [branchId, fetchJobs]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Riwayat Pencetakan
            </h4>
            <p className="text-[10px] text-slate-400">
              {jobs.length} job tercatat. Memuat dari tabel print_jobs.
            </p>
          </div>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold disabled:opacity-50 flex items-center gap-1 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
        </button>
      </div>

      {error && (
        <div className="text-[10px] text-red-600 bg-red-50 rounded-xl p-3 font-mono">{error}</div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-[10px]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Memuat riwayat pencetakan...
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-[10px]">
          <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Belum ada riwayat pencetakan.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">Waktu</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">Dokumen</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">Printer</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">
                  Transport
                </th>
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">Status</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500 uppercase">Salinan</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const badge = STATUS_BADGE[job.status] || STATUS_BADGE.started;
                const BadgeIcon = badge.icon;
                return (
                  <tr
                    key={job.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-2 px-2 text-slate-600 font-mono whitespace-nowrap">
                      {formatTime(job.created_at)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="font-bold text-slate-800">{job.document_type}</span>
                      {job.document_id && (
                        <span className="text-slate-400 ml-1 font-mono">#{job.document_id}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-600 font-mono max-w-[120px] truncate">
                      {job.printer || '-'}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          job.transport === 'qz'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {TRANSPORT_LABEL[job.transport] || job.transport}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {job.status}
                      </span>
                      {job.error_code && (
                        <span className="block text-[8px] text-red-500 font-mono mt-0.5">
                          {job.error_code}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {job.reprint ? (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          #{job.reprint_sequence}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
