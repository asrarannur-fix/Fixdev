import React from 'react';
import { X, Printer } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getPrintBaseCss, escapeHtml } from '../../../../utils/print';
import { printJobAsync } from '../../../../utils/printJob';
import { useSaaS } from '../../../../context/SaaSContext';
import { TenantSettings } from '../../../../types';

type PrintConfig = NonNullable<TenantSettings['printConfig']>;

interface InvoicePrintoutProps {
  ticket: any;
  customer: any;
  printConfig?: PrintConfig;
  logoUrl: string;
  currentUser: any;
  publicBaseUrl: string;
  onClose: () => void;
  onPrint: (ticketId: string) => void;
  fmtPrintDate: (date: string) => string;
  showToast: (message: string, type?: any) => void;
}

const getPrintCss = (printConfig?: PrintConfig) => `${getPrintBaseCss(printConfig)}
  .print-footer { border-top: 1px dashed #cbd5e1; margin-top: 12px; padding-top: 8px; color: #64748b; text-align: center; }
`;

export const InvoicePrintout: React.FC<InvoicePrintoutProps> = ({
  ticket,
  customer,
  printConfig,
  logoUrl,
  currentUser,
  publicBaseUrl,
  onClose,
  onPrint,
  fmtPrintDate,
  showToast,
}) => {
  const { currentTenantId, currentBranchId } = useSaaS();
  const laborCost = (ticket as any).laborCost || 0;
  const chargeableMicroUsages = (ticket.microComponentUsages || []).filter(
    (usage: any) => usage.chargeable
  );
  const grandTotal = ticket.estimatedCost || 0;
  const totalTax = 0;
  const finalTotal = grandTotal + totalTax;

  const handlePrint = () => {
    const printDoc = document.createElement('div');
    printDoc.innerHTML = `\
      <html>
        <head>
          <title>Invoice - ${ticket.ticketNo}</title>
          <style>
            ${getPrintCss(printConfig)}
            .header { text-align: center; margin-bottom: 15px; }
            .header h4 { margin: 0; font-size: 13px; font-weight: 800; color: #000; }
            .header p { margin: 2px 0; color: #64748b; font-size: 9px; }
            .meta { border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 8px 0; margin-bottom: 12px; display: flex; justify-content: space-between; font-family: monospace; }
            .meta div { flex: 1; }
            .meta .right { text-align: right; }
            .section { margin-bottom: 12px; }
            .item-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
            .item-table th { border-bottom: 1px solid #cbd5e1; padding: 4px 0; text-align: left; color: #64748b; }
            .item-table td { padding: 6px 0; }
            .totals { border-top: 1px dashed #cbd5e1; padding-top: 8px; font-family: monospace; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .grand-total { font-size: 12px; font-weight: bold; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: 4px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 25px; text-align: center; font-size: 10px; }
            .signature-space { height: 40px; }
            .border-t { border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
             ${logoUrl ? `<img src="${logoUrl}" alt="logo" style="height: 40px; max-width: 160px; object-fit: contain; margin-bottom: 10px;"/>` : ''}
            <h4>${escapeHtml(printConfig?.customHeaderTitle || 'NOTA PELUNASAN / INVOICE SERVIS')}</h4>
            <p>Layanan Servis - COMPLETED WORK ORDER</p>
          </div>
          <div class="meta">
            <div>
              <strong>NO INVOICE:</strong><br/>
              INV-${ticket.ticketNo}<br/><br/>
              <strong>NAMA PELANGGAN:</strong><br/>
              ${customer?.name || 'Umum'}
            </div>
            <div class="right">
              <strong>TANGGAL CETAK:</strong><br/>
              ${new Date().toLocaleDateString('id-ID')}<br/><br/>
              <strong>STATUS:</strong><br/>
              <span style="background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold;">LUNAS</span>
            </div>
          </div>
          <div class="section">
            <p><strong>Rincian Pekerjaan & Suku Cadang:</strong></p>
            <table class="item-table">
              <thead>
                <tr>
                  <th>Deskripsi</th>
                  <th style="text-align: right;">Biaya</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jasa Teknis & Servis (${ticket.deviceName})</td>
                  <td style="text-align: right; font-family: monospace;">Rp ${laborCost.toLocaleString()}</td>
                </tr>
                ${ticket.partsUsed
                  ? ticket.partsUsed
                      .map(
                        (part: any) => `\
                          <tr>
                            <td style="color: #64748b; padding-left: 8px;">- ${part.name} (x${part.quantity})</td>
                            <td style="text-align: right; font-family: monospace; color: #64748b;">Rp ${part.totalPrice.toLocaleString()}</td>
                          </tr>
                        `
                      )
                      .join('')
                  : ''}
                ${chargeableMicroUsages
                  .map(
                    (usage: any) => `\
                      <tr>
                        <td style="color: #2563eb; padding-left: 8px;">- ${usage.name} (x${usage.quantity})</td>
                        <td style="text-align: right; font-family: monospace; color: #2563eb;">Rp ${usage.chargeTotal.toLocaleString()}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="totals">
            <div class="totals-row">
              <span>SUBTOTAL PERBAIKAN:</span>
              <span>Rp ${(ticket.estimatedCost || 0).toLocaleString()}</span>
            </div>
            <div class="totals-row">
              <span>PPN (${0}%):</span>
              <span>Rp ${totalTax.toLocaleString()}</span>
            </div>
            <div class="totals-row grand-total">
              <span>TOTAL AKHIR (LUNAS):</span>
              <span>Rp ${finalTotal.toLocaleString()}</span>
            </div>
          </div>
          <div class="signatures">
            <div>
              <p style="color: #64748b; margin-bottom: 2px;">PELANGGAN</p>
              <div class="signature-space"></div>
              <p class="border-t">${customer?.name || 'Customer'}</p>
            </div>
            <div>
              <p style="color: #64748b; margin-bottom: 2px;">PETUGAS KASIR</p>
              <div class="signature-space"></div>
              <p class="border-t">${currentUser?.name || 'Staff'}</p>
            </div>
          </div>
          ${printConfig?.printQrCode
            ? `\
          <div style="text-align: center; margin-top: 15px;">
             <div class="qr-placeholder">Lacak status dengan nomor tiket: ${escapeHtml(ticket.ticketNo)}</div>
          </div>
          `
            : ''}
          <div class="print-footer">
            ${printConfig?.customFooterText || 'Terima kasih atas kepercayaan Anda.'}
          </div>
        </body>
      </html>
    `;
    window.setTimeout(async () => {
      const result = await printJobAsync({
        title: 'Service Document',
        html: printDoc.innerHTML || '',
        printConfig,
        tenantId: currentTenantId,
        branchId: currentBranchId,
        documentType: 'service_document',
        documentId: ticket.id,
      });
      if (!result.ok)
        showToast(result.error || 'Gagal mencetak dokumen.', 'error');
    }, 100);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
      <div className="bg-white p-6 max-w-md w-full rounded-2xl shadow-2xl relative border-4 border-slate-100 font-sans text-slate-800 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-3.5 bg-slate-50/50">
          <div className="bg-accent-lighter border border-indigo-100 p-2.5 rounded-lg text-[8.5px] text-accent text-center">
            <p className="font-bold">GARANSI PROTEKSI</p>
            <p className="mt-0.5">
              Masa garansi komponen selama <strong>{ticket.warrantyMonths} Bulan</strong>{' '}
              berlaku hingga:{' '}
              <strong>
                {(() => {
                  const expDate = new Date();
                  expDate.setMonth(expDate.getMonth() + (ticket.warrantyMonths || 3));
                  return expDate.toLocaleDateString('id-ID');
                })()}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-accent hover:bg-accent-hover text-white font-bold text-xs py-2 rounded-xl cursor-pointer text-center shadow-md shadow-accent/10 flex items-center justify-center gap-1"
          >
            <Printer className="w-4 h-4" /> Cetak Struk Nota
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-xl cursor-pointer text-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};