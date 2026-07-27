import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Zap, Share2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ServiceTicket, Customer, User } from '../../../../types';
import { getPrintBaseCss, escapeHtml, getSafePrintImageUrl } from '../../../../utils/print';
import { printJobAsync } from '../../../../utils/printJob';
import { useSaaS } from '../../../../context/SaaSContext';

type PrintConfig = NonNullable<NonNullable<import('../../../../types').TenantSettings['printConfig']>>;

interface WarrantyPrintoutProps {
  ticket: ServiceTicket;
  customer: Customer;
  currentUser: User | null;
  printConfig?: PrintConfig;
  businessName: string;
  onClose: () => void;
  showToast: (message: string, type?: any) => void;
}

const getPrintCss = (printConfig?: PrintConfig) => `${getPrintBaseCss(printConfig)}
  .print-footer { border-top: 1px dashed #cbd5e1; margin-top: 12px; padding-top: 8px; color: #64748b; text-align: center; }
`;

export const WarrantyPrintout: React.FC<WarrantyPrintoutProps> = ({
  ticket,
  customer,
  currentUser,
  printConfig,
  businessName,
  onClose,
  showToast,
}) => {
  const { currentTenantId, currentBranchId, publicBaseUrl } = useSaaS();
  const expDate = new Date();
  expDate.setMonth(expDate.getMonth() + (ticket.warrantyMonths || 3));
  const expString = expDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const claimUrl = `${publicBaseUrl}/?tab=service&sub=warranty-claim&ticket=${ticket.ticketNo}`;
  const logoUrl = getSafePrintImageUrl(null);
  const logoHtml =
    printConfig?.printHeaderLogo && logoUrl
      ? `<img src="${logoUrl}" alt="logo" style="height: 40px; max-width: 160px; object-fit: contain; margin-bottom: 10px;"/>`
      : '';

  const handlePrint = () => {
    const printDoc = document.createElement('div');
    printDoc.innerHTML = `
      <html>
        <head>
          <title>Warranty - ${ticket.ticketNo}</title>
          <style>
            ${getPrintCss(printConfig)}
            .header { text-align: center; margin-bottom: 20px; }
            .header h4 { margin: 0; font-size: 15px; font-weight: 800; color: #000; letter-spacing: 1px; }
            .header p { margin: 3px 0; color: var(--accent); font-size: 10px; font-weight: bold; letter-spacing: 1px; }
            .card { background: linear-gradient(135deg, #1e1b4b, #0f172a); color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 1px solid #312e81; }
            .card-title { font-size: 9px; font-family: monospace; color: #a5b4fc; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
            .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; }
            .card-grid .label { font-size: 8px; text-transform: uppercase; color: #a5b4fc; font-family: monospace; margin-bottom: 2px; }
            .card-grid .val { font-size: 11px; font-weight: bold; }
            .terms { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 10px; }
            .terms h5 { margin: 0 0 6px 0; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 9px; }
            .terms ul { margin: 0; padding-left: 15px; color: #64748b; }
            .terms li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <h4>${escapeHtml(printConfig?.customHeaderTitle || 'KARTU GARANSI DIGITAL')}</h4>
            <p>${escapeHtml(businessName.toUpperCase())} VERIFIED WARRANTY</p>
          </div>
         <div class="card">
          <div class="card-title">Digital Warranty Certificate</div>
          <div style="font-size: 11px;">
            <span style="font-size: 8px; text-transform: uppercase; color: #a5b4fc; font-family: monospace;">Nomor Tiket / Seri:</span><br/>
            <strong style="font-size: 13px; font-family: monospace; letter-spacing: 1px;">${ticket.ticketNo}</strong>
          </div>
          <div class="card-grid">
            <div>
              <div class="label">Perangkat</div>
              <div class="val">${ticket.deviceName}</div>
              <div style="font-size: 9px; color: #cbd5e1;">${ticket.deviceBrandModel || 'Suku Cadang'}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Pelanggan</div>
              <div class="val">${customer?.name || 'Umum'}</div>
              <div style="font-size: 9px; color: #cbd5e1;">${customer?.phone || ''}</div>
            </div>
          </div>
          <div class="card-grid">
            <div>
              <div class="label">Masa Berlaku</div>
              <div class="val" style="color: #34d399;">${ticket.warrantyMonths || 3} Bulan</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Berlaku Hingga</div>
              <div class="val" style="color: #34d399;">${expString}</div>
            </div>
          </div>
        </div>
        <div class="terms">
          <h5>Syarat & Ketentuan Klaim Garansi:</h5>
          <ul>
            ${
              printConfig?.printTermsAndConditions &&
              printConfig.termsAndConditionsText
                ? printConfig.termsAndConditionsText
                    .split('\n')
                    .map((line: string) => `<li>${escapeHtml(line)}</li>`)
                    .join('')
                : `<li>Segel garansi fisik pada perangkat <strong>wajib utuh</strong> (tidak rusak/robek).</li>
                <li>Garansi hanya mencakup suku cadang yang diganti pada pengerjaan ini.</li>
                <li>Tidak berlaku jika terjadi kerusakan akibat <strong>cairan, benturan keras (retak/pecah), atau kelalaian pengguna</strong>.</li>
                <li>Tunjukkan kartu garansi digital ini kepada kasir saat mengajukan klaim.</li>`
            }
          </ul>
        </div>
         ${printConfig?.printQrCode
           ? `
          <div style="text-align: center; margin-top: 15px;">
           <div class="qr-placeholder">Klaim garansi dengan nomor tiket: ${escapeHtml(ticket.ticketNo)}</div>
          </div>
          `
           : ''}
          <div class="print-footer">
            ${printConfig?.customFooterText || 'Simpan kartu garansi ini untuk klaim di masa mendatang.'}
          </div>
        </body>
      </html>
    `;
    window.setTimeout(async () => {
      const result = await printJobAsync({
        title: 'Warranty Card',
        html: printDoc.innerHTML || '',
        printConfig,
        tenantId: currentTenantId,
        branchId: currentBranchId,
        documentType: 'service_receipt',
        documentId: ticket.id,
      });
      if (!result.ok)
        showToast(result.error || 'Gagal mencetak kartu garansi.', 'error');
    }, 100);
  };

  const handleVerify = () => {
    showToast(
      `Klaim Garansi Terverifikasi! Sistem telah memvalidasi tiket ${ticket.ticketNo}. Status Garansi: AKTIF.`,
      'success'
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
      <div className="bg-white p-6 max-w-md w-full rounded-2xl shadow-2xl relative border-4 border-indigo-100 font-sans text-slate-800 space-y-4 animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="mx-auto w-12 h-12 bg-accent-lighter rounded-full flex items-center justify-center text-accent border border-indigo-100 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
            KARTU GARANSI DIGITAL
          </h4>
          <p className="text-[9px] text-accent font-mono font-bold uppercase tracking-widest bg-accent-lighter px-2 py-0.5 rounded-full inline-block">
            {businessName.toUpperCase()} VERIFIED
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-lg border border-indigo-950">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute left-4 top-4 text-[9px] font-mono tracking-widest text-indigo-300 font-bold">
            DIGITAL CERTIFICATE
          </div>
          <div className="absolute right-4 top-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                Nomor Tiket / Seri
              </p>
              <p className="text-sm font-bold tracking-wider font-mono text-white">
                {ticket.ticketNo}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <div>
                <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                  Perangkat
                </p>
                <p className="text-xs font-bold truncate">{ticket.deviceName}</p>
                <p className="text-[9px] text-indigo-200 truncate">
                  {ticket.deviceBrandModel || 'Suku Cadang'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                  Pelanggan
                </p>
                <p className="text-xs font-bold truncate">{customer?.name || 'Umum'}</p>
                <p className="text-[9px] text-indigo-200 truncate">
                  {customer?.phone || ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <div>
                <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                  Masa Berlaku
                </p>
                <p className="text-xs font-extrabold text-emerald-300">
                  {ticket.warrantyMonths || 3} Bulan
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                  Berlaku Hingga
                </p>
                <p className="text-xs font-extrabold text-emerald-300">{expString}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[10px]">
          <p className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[9px]">
            Syarat & Ketentuan Klaim Garansi:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[9.5px]">
            <li>
              Segel garansi fisik pada perangkat <strong>wajib utuh</strong> (tidak
              rusak/robek).
            </li>
            <li>Garansi hanya mencakup suku cadang yang diganti pada pengerjaan ini.</li>
            <li>
              Tidak berlaku jika terjadi kerusakan akibat{' '}
              <strong>cairan, benturan keras (retak/pecah), atau kelalaian pengguna</strong>.
            </li>
            <li>Tunjukkan kartu garansi digital ini kepada kasir saat mengajukan klaim.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleVerify}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
          >
            <Zap className="w-4 h-4" /> Verifikasi Status Garansi Aktif
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="bg-accent hover:bg-accent-hover text-white font-semibold text-xs py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1 flex-1"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Kartu
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(claimUrl);
                showToast('Link klaim disalin ke clipboard!', 'success');
              }}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-400" /> Salin Link Klaim
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};