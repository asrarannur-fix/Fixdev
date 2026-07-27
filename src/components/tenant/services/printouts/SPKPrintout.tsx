import React from 'react';
import { X, Printer } from 'lucide-react';
import { createPortal } from 'react-dom';
import Barcode from 'react-barcode';

interface SPKPrintoutProps {
  ticket: any;
  customer: any;
  printConfig: any;
  logoUrl: string;
  currentUser: any;
  publicBaseUrl: string;
  onClose: () => void;
  onPrint: (ticketId: string) => void;
  fmtPrintDate: (date: string) => string;
}

export const SPKPrintout: React.FC<SPKPrintoutProps> = ({
  ticket,
  customer,
  printConfig,
  logoUrl,
  currentUser,
  publicBaseUrl,
  onClose,
  onPrint,
  fmtPrintDate,
}) => {
  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-zinc-950 p-6 w-full rounded-2xl shadow-2xl relative border-4 border-slate-100 dark:border-zinc-800 font-sans text-slate-800 dark:text-zinc-100 space-y-4 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-100]:bg-zinc-900 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200"
        style={{
          maxWidth:
            printConfig?.paperSize === 'thermal_58'
              ? '300px'
              : printConfig?.paperSize === 'thermal_80'
                ? '390px'
                : '760px',
          fontSize: `${printConfig?.printFontSize === 'sm' ? 10 : printConfig?.printFontSize === 'lg' ? 13 : 11}px`,
        }}
      >
        <div id={`reception-print-${ticket.id}`} className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer no-print"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => onPrint(ticket.id)}
            className="absolute top-4 right-12 p-2 bg-accent hover:bg-accent-hover text-white rounded-full cursor-pointer no-print"
          >
            <Printer className="w-5 h-5" />
          </button>
          <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-3.5 bg-white">
            <div className="text-center space-y-0.5">
              {printConfig?.printHeaderLogo && logoUrl && (
                <img src={logoUrl} alt="Logo usaha" className="h-9 max-w-40 mx-auto mb-2 object-contain" />
              )}
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {printConfig?.customHeaderTitle || 'SURAT PERINTAH KERJA (SPK)'}
              </h4>
              <p className="text-[10px] text-slate-500 font-mono uppercase">TANDA TERIMA UNIT MASUK</p>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <p className="text-slate-400 uppercase">TANGGAL MASUK:</p>
                <p className="font-bold text-slate-700">{fmtPrintDate(ticket.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 uppercase">NOMOR SPK / TIKET:</p>
                <p className="font-bold text-accent">{ticket.ticketNo}</p>
              </div>
            </div>
            <div className="border-t border-slate-200/60 pt-2 space-y-1.5 text-[10px]">
              <p><strong className="font-semibold text-slate-500">Nama Pelanggan:</strong>{' '}<span className="font-bold text-slate-700">{customer?.name || 'Umum'}</span></p>
              <p><strong className="font-semibold text-slate-500">No Handphone:</strong>{' '}<span className="font-mono text-slate-700">{customer?.phone || '-'}</span></p>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-lg my-1 border border-slate-200 text-[9.5px]">
                <p><strong className="font-semibold text-slate-500">Kategori:</strong>{' '}<span className="font-bold text-slate-800">{ticket.deviceCategory || 'Smartphone'}</span></p>
                <p><strong className="font-semibold text-slate-500">Fisik:</strong>{' '}<span className="font-bold text-slate-800">{ticket.physicalCondition || 'Mulus'}</span></p>
                <p><strong className="font-semibold text-slate-500">Kunci Layar:</strong>{' '}<span className="font-mono font-bold text-accent">{ticket.screenLockPin ? '••••••' : 'Tidak Ada'}</span></p>
                <p><strong className="font-semibold text-slate-500">Est. Selesai:</strong>{' '}<span className="font-bold text-emerald-700">{ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '3 Hari'}</span></p>
              </div>
              <p><strong className="font-semibold text-slate-500">Tipe Perangkat:</strong>{' '}<span className="font-bold text-accent">{ticket.deviceName}</span></p>
              {ticket.deviceBrandModel && (<p><strong className="font-semibold text-slate-500">Brand / Model:</strong>{' '}<span className="text-slate-700">{ticket.deviceBrandModel}</span></p>)}
              <p><strong className="font-semibold text-slate-500">Serial Number:</strong>{' '}<span className="font-mono text-slate-700">{ticket.deviceSerial || 'N/A'}</span></p>
              {((ticket.accessoriesLeft && ticket.accessoriesLeft.length > 0) || ticket.customAccessories) && (
                <p><strong className="font-semibold text-slate-500">Aksesoris Titipan:</strong>{' '}<span className="font-semibold text-slate-700 text-[9.5px]">{ticket.accessoriesLeft ? ticket.accessoriesLeft.map((acc: string) => { const labels: Record<string, string> = { charger: 'Charger', cable: 'Kabel', sim: 'SIM', sd: 'SD Card', case: 'Case', box: 'Box' }; return labels[acc] || acc; }).join(', ') : ''}{ticket.customAccessories ? ticket.accessoriesLeft && ticket.accessoriesLeft.length > 0 ? `, ${ticket.customAccessories}` : ticket.customAccessories : ''}</span></p>
              )}
              {printConfig?.printCustomerNotes !== false && (
                <p><strong className="font-semibold text-slate-500">Keluhan / Kerusakan:</strong>{' '}<span className="text-slate-700 italic border border-slate-200 bg-slate-50 px-2 py-1 rounded font-medium block mt-1 leading-relaxed">{ticket.customerComplaints || '-'}</span></p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center py-2.5 border-t border-b border-dashed border-slate-200">
              <span className="p-1 bg-white border border-slate-200 rounded"><Barcode value={ticket.id} className="w-36 h-8 text-slate-800" /></span>
              <span className="font-mono text-[9px] text-slate-400 mt-1">{ticket.id}</span>
            </div>
            {printConfig?.printQrCode && (
              <div className="flex flex-col items-center justify-center py-2 border-t border-dashed border-slate-200">
                <span className="text-[8px] text-slate-500 mt-1 break-all text-center">Lacak status: {publicBaseUrl}/?ticket={encodeURIComponent(ticket.ticketNo)}</span>
              </div>
            )}
            {printConfig?.printTermsAndConditions ? (
              <div className="text-[7.5px] text-slate-400 leading-normal space-y-1">
                <p><strong>SYARAT & KETENTUAN SERVICE:</strong></p>
                {(printConfig.termsAndConditionsText || '').split('\n').filter(Boolean).map((line: string, i: number) => (<p key={i}>{line}</p>))}
              </div>
            ) : null}
            <div className="border-t border-dashed border-slate-200 pt-3.5 grid grid-cols-2 gap-4 text-center text-[9px] font-mono">
              <div>
                <p className="text-slate-400 uppercase">PELANGGAN</p>
                <div className="h-9"></div>
                <p className="border-t-2 border-slate-400 pt-1 font-bold">{customer?.name || 'Customer'}</p>
                <p className="text-slate-400 mt-0.5">( Tanggal: ......../......../........ )</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase">KASIR / TEKNISI</p>
                <div className="h-9"></div>
                <p className="border-t-2 border-slate-400 pt-1 font-bold">{currentUser?.name || 'Staff'}</p>
                <p className="text-slate-400 mt-0.5">( Tanggal: ......../......../........ )</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
