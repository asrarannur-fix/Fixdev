import React from 'react';
import { ListChecks, Clock } from 'lucide-react';
import { ServiceStatus } from '../../../types';
import { SERVICE_STATUS_META } from '../../../domain/serviceWorkflow';
import { Pill } from '../../ui/kit';

const STATUS_TONE: Record<string, string> = {
  [ServiceStatus.DITERIMA]: 'blue',
  [ServiceStatus.DIAGNOSA]: 'purple',
  [ServiceStatus.MENUGGU_APPROVAL]: 'amber',
  [ServiceStatus.SEDANG_DIKERJAKAN]: 'indigo',
  [ServiceStatus.SELESAI]: 'emerald',
  [ServiceStatus.DIAMBIL]: 'teal',
  [ServiceStatus.RUSAK]: 'rose',
};

// Fallback ke SERVICE_STATUS_META agar semua status punya tone + label
const toneFor = (status: string): string =>
  STATUS_TONE[status] || SERVICE_STATUS_META[status as ServiceStatus]?.tone || 'slate';
const labelFor = (status: string): string =>
  SERVICE_STATUS_META[status as ServiceStatus]?.label || status;

export const QueuePanel: React.FC<{
  repairs?: any[];
  selectedBranchId?: string;
  setSelectedTicketIdForEdit?: (id: string | null) => void;
  setActiveTab?: (tab: string) => void;
}> = ({ repairs = [], setSelectedTicketIdForEdit, setActiveTab }) => {
  const queueTickets = repairs.filter(r =>
    r.status !== ServiceStatus.SELESAI &&
    r.status !== ServiceStatus.DIAMBIL &&
    r.status !== ServiceStatus.DIBATALKAN
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-accent dark:text-accent" />
          </div>
          <div>
            <p className="text-xs text-slate-500">{queueTickets.length} tiket aktif dalam pengerjaan.</p>
          </div>
        </div>
        <button onClick={() => setActiveTab?.('main-tickets')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">
          Kembali
        </button>
      </div>

      {queueTickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white">Antrian Kosong</h3>
          <p className="text-sm text-slate-500 mt-1">Tidak ada tiket dalam antrian saat ini.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queueTickets.map((ticket, i) => (
            <div key={ticket.id} onClick={() => setSelectedTicketIdForEdit?.(ticket.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTicketIdForEdit?.(ticket.id); } }} role="button" tabIndex={0} aria-label={`Buka tiket ${ticket.ticketNo}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-500">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">#{ticket.ticketNo}</span>
                  <Pill tone={(toneFor(ticket.status) || 'slate') as any}>{labelFor(ticket.status) || ticket.status}</Pill>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ticket.deviceName} - {ticket.customerName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
