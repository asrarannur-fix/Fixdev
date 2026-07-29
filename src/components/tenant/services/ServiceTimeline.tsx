import * as React from 'react';

interface TimelineEntry {
  id?: string;
  status?: string;
  timestamp?: string;
  note?: string;
  operator?: string;
}

interface ServiceTimelineProps {
  entries?: TimelineEntry[];
}

const formatTimestamp = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
};

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ entries = [] }) => (
  <section className="relative overflow-hidden rounded-2xl border border-white/40 p-3.5 shadow-md dark:border-zinc-800/40">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5" />
    <h4 className="relative flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
      Log Riwayat Perjalanan
    </h4>
    <div className="relative mt-3 space-y-3 border-l-2 border-blue-200 pl-3 text-xs dark:border-blue-800">
      {entries.length ? (
        [...entries].reverse().map((entry, index) => (
          <div key={entry.id || `${entry.timestamp}-${index}`} className="relative">
            <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-zinc-900" />
            <p className="font-mono text-[10px] font-semibold text-accent">
              {entry.status || 'UPDATE'}{' '}
              <span className="font-normal text-slate-400">| {formatTimestamp(entry.timestamp)}</span>
            </p>
            {entry.note && <p className="mt-0.5 text-slate-500 italic">{entry.note}</p>}
            <p className="text-[9px] text-slate-400">Oleh: {entry.operator || 'Sistem'}</p>
          </div>
        ))
      ) : (
        <p className="text-[11px] text-slate-400 italic">Belum ada catatan perjalanan.</p>
      )}
    </div>
  </section>
);
