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
}> = ({ repairs, setSelectedTicketIdForEdit, searchQuery, statusFilter }) => {
  
  const filtered = repairs.filter(r => {
    const matchesSearch = !searchQuery ||
      r.ticketNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'MASUK') matchesStatus = ['DITERIMA', 'DIAGNOSA'].includes(r.status);
    else if (statusFilter === 'PROSES') matchesStatus = ['MENUGGU_APPROVAL', 'SEDANG_DIKERJAKAN'].includes(r.status);
    else if (statusFilter === 'QC') matchesStatus = r.status === 'SELESAI';
    else if (statusFilter === 'BAYAR') matchesStatus = r.status === 'DIAMBIL';
    else if (statusFilter) matchesStatus = r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 font-bold">Tiket</th>
              <th className="px-6 py-4 font-bold">Pelanggan</th>
              <th className="px-6 py-4 font-bold">Perangkat</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-700">
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors" onClick={() => setSelectedTicketIdForEdit(ticket.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTicketIdForEdit(ticket.id); } }} tabIndex={0} role="row" aria-label={`Pilih tiket ${ticket.ticketNo}`}><td className="px-6 py-4 font-mono font-bold text-accent dark:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">#{ticket.ticketNo}</td>
                <td className="px-6 py-4 font-mono font-bold text-accent dark:text-accent">#{ticket.ticketNo}</td>
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{ticket.customerName}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{ticket.deviceName}</td>
                <td className="px-6 py-4"><Pill tone={(STATUS_TONE[ticket.status] || 'slate') as any}>{ticket.status}</Pill></td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-accent"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
