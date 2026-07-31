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

// tone -> gradient (derived from SERVICE_STATUS_META.tone, not hardcoded per-status)
const TONE_GRADIENT: Record<string, string> = {
  slate: 'from-slate-400 via-gray-400 to-zinc-400',
  blue: 'from-sky-400 via-blue-500 to-indigo-500',
  sky: 'from-sky-400 via-blue-500 to-indigo-500',
  cyan: 'from-cyan-400 via-sky-400 to-blue-400',
  teal: 'from-teal-400 via-cyan-400 to-sky-400',
  emerald: 'from-emerald-400 via-green-400 to-teal-400',
  green: 'from-emerald-400 via-green-400 to-teal-400',
  lime: 'from-lime-400 via-green-400 to-emerald-400',
  amber: 'from-amber-400 via-orange-400 to-red-400',
  orange: 'from-orange-400 via-red-400 to-pink-400',
  violet: 'from-violet-400 via-purple-400 to-fuchsia-400',
  purple: 'from-purple-400 via-violet-400 to-indigo-400',
  fuchsia: 'from-fuchsia-400 via-pink-400 to-rose-400',
  pink: 'from-pink-400 via-rose-400 to-red-400',
  rose: 'from-rose-400 via-red-400 to-pink-400',
  red: 'from-red-400 via-rose-400 to-pink-400',
  indigo: 'from-indigo-400 via-blue-400 to-violet-400',
};

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
  const gradient =
    TONE_GRADIENT[SERVICE_STATUS_META[ticket.status as ServiceStatus]?.tone || 'slate'] ||
    'from-indigo-400 via-purple-400 to-violet-400';

  return (
    <div className="sticky top-0 z-20 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

       <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex items-center gap-3">
          <span className="shrink-0 p-2.5 bg-white/20 backdrop-blur-sm rounded-xl text-white shadow-sm">
            <Wrench className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 id="service-detail-title" className="font-extrabold text-sm text-white drop-shadow-sm">
                Tiket Servis
              </h3>
              <span className="font-mono text-xs font-black text-white/90">#{ticket.ticketNo}</span>
              <span className="inline-flex items-center rounded-lg bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {SERVICE_STATUS_META[ticket.status as ServiceStatus]?.label || ticket.status}
              </span>
            </div>
            <p className="truncate text-[11px] text-white/80 mt-0.5">
              {customer?.name || 'Pelanggan umum'} · {ticket.deviceName || 'Unit belum diisi'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onPrintSpk}
            className="px-3 py-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
          >
            <Printer className="w-3.5 h-3.5" /> SPK
          </button>
          {['SELESAI', 'SIAP_DIAMBIL', 'DIAMBIL'].includes(ticket.status) && (
            <>
              <button
                onClick={onPrintInvoice}
                className="px-3 py-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
              >
                <FileText className="w-3.5 h-3.5" /> Invoice
              </button>
              <button
                onClick={onPrintWarranty}
                className="px-3 py-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Garansi
              </button>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Tutup detail tiket servis"
            className="p-2 hover:bg-white/20 text-white/70 hover:text-white rounded-xl cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
