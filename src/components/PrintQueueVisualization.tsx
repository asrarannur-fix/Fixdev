import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { getAllJobs, clearFailedJobs } from '../utils/offlinePrintQueue';

interface QueueJob {
  id: string;
  title: string;
  documentType?: string;
  documentId?: string;
  branchId?: string;
  createdAt: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

interface PrintQueueProps {
  onRefresh?: () => void;
}

const STATUS_META: Record<
  string,
  { bg: string; text: string; icon: React.FC<any>; label: string }
> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Menunggu' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertTriangle, label: 'Diproses' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Gagal' },
};

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

export const PrintQueueVisualization: React.FC<PrintQueueProps> = ({ onRefresh }) => {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = React.useState(false);

  const refresh = useCallback(async () => {
    try {
      const all = await getAllJobs();
      setJobs(
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch {
      setJobs([]);
    }
    setLoading(false);
    onRefresh?.();
  }, [onRefresh]);

  const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');

  useEffect(() => {
    void refresh();
    const iv = setInterval(refresh, hasActive ? 3000 : 15000);
    return () => clearInterval(iv);
  }, [refresh, hasActive]);

  const handleClearFailed = async () => {
    setClearing(true);
    try {
      await clearFailedJobs();
      setJobs((prev) => prev.filter((j) => j.status !== 'failed'));
    } finally {
      setClearing(false);
    }
  };

  const pending = jobs.filter((j) => j.status === 'pending');
  const processing = jobs.filter((j) => j.status === 'processing');
  const failed = jobs.filter((j) => j.status === 'failed');

  if (loading) {
    return <div className="text-center py-6 text-gray-500 text-sm">Memuat antrian...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Antrian Cetak (Live)
        </h4>
        <div className="flex items-center gap-2">
          {failed.length > 0 && (
            <button
              onClick={handleClearFailed}
              disabled={clearing}
              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Hapus Gagal ({failed.length})
            </button>
          )}
          <button
            onClick={refresh}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">Tidak ada antrian cetak</div>
      )}

      {pending.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Menunggu ({pending.length})
          </h5>
          <div className="space-y-1">
            {pending.map((j) => (
              <QueueRow key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {processing.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Diproses ({processing.length})
          </h5>
          <div className="space-y-1">
            {processing.map((j) => (
              <QueueRow key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Gagal ({failed.length})
          </h5>
          <div className="space-y-1">
            {failed.map((j) => (
              <QueueRow key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const QueueRow: React.FC<{ job: QueueJob }> = ({ job }) => {
  const meta = STATUS_META[job.status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`${meta.bg} ${meta.text} px-1.5 py-0.5 rounded-full flex items-center gap-1`}
        >
          <Icon className="w-3 h-3" /> {meta.label}
        </span>
        <span className="truncate text-gray-700">{job.title || 'Tanpa judul'}</span>
        {job.documentType && <span className="text-gray-400">({job.documentType})</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-gray-400">{formatTime(job.createdAt)}</span>
        {job.retries > 0 && <span className="text-red-400">x{job.retries}</span>}
      </div>
    </div>
  );
};
