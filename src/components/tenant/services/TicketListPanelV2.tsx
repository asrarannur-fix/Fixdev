import React, { useState } from 'react';
import { Search, ChevronRight, Eye, Printer, MessageCircle } from 'lucide-react';
import { ServiceStatus } from '../../../types';
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

export const TicketListPanelV2: React.FC<{
  repairs: any[];
  selectedTicketIdForEdit: string | null;
  setSelectedTicketIdForEdit: (id: string | null) => void;
  searchQuery: string;
  statusFilter: string | null;
  priorityFilter: string | null;
  dateFrom: string;
  dateTo: string;
}> = ({
  repairs,
  setSelectedTicketIdForEdit,
  searchQuery,
  statusFilter,
  priorityFilter,
  dateFrom,
  dateTo,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = repairs.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.ticketNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'MASUK') matchesStatus = ['DITERIMA', 'DIAGNOSA'].includes(r.status);
    else if (statusFilter === 'PROSES')
      matchesStatus = ['MENUGGU_APPROVAL', 'SEDANG_DIKERJAKAN'].includes(r.status);
    else if (statusFilter === 'QC') matchesStatus = r.status === 'SELESAI';
    else if (statusFilter === 'BAYAR') matchesStatus = r.status === 'DIAMBIL';
    else if (statusFilter) matchesStatus = r.status === statusFilter;

    let matchesPriority = true;
    if (priorityFilter) matchesPriority = r.priority === priorityFilter;

    let matchesDate = true;
    if (dateFrom) {
      const created = new Date(r.createdAt);
      const from = new Date(dateFrom);
      if (created < from) matchesDate = false;
    }
    if (dateTo) {
      const created = new Date(r.createdAt);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (created > to) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesDate;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 font-bold">Tiket</th>
              <th className="px-6 py-4 font-bold">Pelanggan</th>
              <th className="px-6 py-4 font-bold">Perangkat</th>
              <th className="px-6 py-4 font-bold">Prioritas</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-700">
            {paged.map((ticket) => (
              <tr
                key={ticket.id}
                className="hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors"
                onClick={() => setSelectedTicketIdForEdit(ticket.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTicketIdForEdit(ticket.id);
                  }
                }}
                tabIndex={0}
                role="row"
                aria-label={`Pilih tiket ${ticket.ticketNo}`}
              >
                <td className="px-6 py-4 font-mono font-bold text-accent dark:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                  #{ticket.ticketNo}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {ticket.customerName}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {ticket.deviceName}
                </td>
                <td className="px-6 py-4">
                  {ticket.priority && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      {ticket.priority}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Pill tone={(STATUS_TONE[ticket.status] || 'slate') as any}>{ticket.status}</Pill>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-accent">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500">
            Halaman {page} dari {totalPages} ({filtered.length} tiket)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
