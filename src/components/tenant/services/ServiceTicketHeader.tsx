import * as React from 'react';
import { ServiceStatus, UserRole } from '../../../types';
import { SERVICE_STATUS_META } from '../../../domain/serviceWorkflow';
import { Wrench, Printer, FileText, ShieldCheck, X } from 'lucide-react';

interface ServiceTicketHeaderProps {
  ticket: any;
  customer: any;
  currentUserPermissions: string[];
  currentUserRole: UserRole;
  onPrintSpk: () => void;
  onPrintInvoice: () => void;
  onPrintWarranty: () => void;
  onClose: () => void;
}

export const ServiceTicketHeader: React.FC<ServiceTicketHeaderProps> = ({
  ticket,
  customer,
  currentUserPermissions,
  currentUserRole,
  onPrintSpk,
  onPrintInvoice,
  onPrintWarranty,
  onClose,
}) => {
  return (
    <div className="sticky top-0 z-20 overflow-hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
       <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex items-center gap-3">
          <span className="shrink-0 p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
            <Wrench className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 id="service-detail-title" className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                Tiket Servis
              </h3>
              <span className="font-mono text-xs font-black text-slate-500 dark:text-zinc-400">#{ticket.ticketNo}</span>
              <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider border border-slate-200 dark:border-zinc-700">
                {SERVICE_STATUS_META[ticket.status as ServiceStatus]?.label || ticket.status}
              </span>
            </div>
            <p className="truncate text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              {customer?.name || 'Pelanggan umum'} · {ticket.deviceName || 'Unit belum diisi'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onPrintSpk}
            className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-zinc-700"
          >
            <Printer className="w-3.5 h-3.5" /> SPK
          </button>
          {['SELESAI', 'SIAP_DIAMBIL', 'DIAMBIL'].includes(ticket.status) && (
            <>
              <button
                onClick={onPrintInvoice}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-zinc-700"
              >
                <FileText className="w-3.5 h-3.5" /> Invoice
              </button>
              <button
                onClick={onPrintWarranty}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-zinc-700"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Garansi
              </button>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Tutup detail tiket servis"
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 rounded-xl cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
