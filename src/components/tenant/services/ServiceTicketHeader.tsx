import * as React from 'react';
import { Badge } from '../../ui/Badge';
import { ServiceStatus, UserRole } from '../../../types';
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
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="p-2 bg-accent-lighter rounded-lg text-accent">
          <Wrench className="w-5 h-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 id="service-detail-title" className="font-bold text-sm text-slate-800">
              Manajemen Perbaikan & Servis
            </h3>
            <span className="font-mono text-xs font-bold text-accent">#{ticket.ticketNo}</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Status Aktif: <strong className="text-accent">{ticket.status}</strong>
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
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
