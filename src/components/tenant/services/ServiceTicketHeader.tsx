import * as React from 'react';
import { Badge } from '../../ui/Badge';
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
    <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-slate-200 bg-white/95 backdrop-blur flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-3">
        <span className="shrink-0 p-2 bg-accent-lighter rounded-xl text-accent">
          <Wrench className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id="service-detail-title" className="font-bold text-sm text-slate-800">
              Tiket servis
            </h3>
            <span className="font-mono text-xs font-bold text-accent">#{ticket.ticketNo}</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {SERVICE_STATUS_META[ticket.status as ServiceStatus]?.label || ticket.status}
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-500">
            {customer?.name || 'Pelanggan umum'} · {ticket.deviceName || 'Unit belum diisi'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrintSpk}
          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak SPK
        </button>
        {['SELESAI', 'SIAP_DIAMBIL', 'DIAMBIL'].includes(ticket.status) && (
          <>
            <button
              onClick={onPrintInvoice}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" /> Cetak Invoice Pembayaran
            </button>
            <button
              onClick={onPrintWarranty}
              className="px-2.5 py-1.5 bg-accent-lighter border border-indigo-100 hover:bg-indigo-200 text-accent rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Cetak Kartu Garansi
            </button>
          </>
        )}
        <button
          onClick={onClose}
          aria-label="Tutup detail tiket servis"
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
