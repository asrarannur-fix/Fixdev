import * as React from 'react';
import { X } from 'lucide-react';
import { ServiceTicket, Customer, Employee, User, TenantSettings } from '../../../types';
import {
  getPrintBaseCss,
  getSafePrintImageUrl,
} from '../../../utils/print';
import { printJob } from '../../../utils/printJob';
import { SPKPrintout } from './printouts/SPKPrintout';
import { InvoicePrintout } from './printouts/InvoicePrintout';
import { WarrantyPrintout } from './printouts/WarrantyPrintout';
import { useSaaS } from '../../../context/SaaSContext';

type PrintConfig = NonNullable<TenantSettings['printConfig']>;

// Format tanggal aman untuk dokumen cetak (hindari "Invalid Date")
const fmtPrintDate = (value?: string | number | Date): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getPrintCss = (printConfig?: PrintConfig) => `${getPrintBaseCss(printConfig)}
  .print-footer { border-top: 1px dashed #cbd5e1; margin-top: 12px; padding-top: 8px; color: #64748b; text-align: center; }
`;

interface DocumentPrintoutsProps {
  showSpkPrintout: string | null;
  setShowSpkPrintout: (id: string | null) => void;
  showInvoicePrintout: string | null;
  setShowInvoicePrintout: (id: string | null) => void;
  showProvisionalQuote: string | null;
  setShowProvisionalQuote: (id: string | null) => void;
  showWarrantyPrintout: string | null;
  setShowWarrantyPrintout: (id: string | null) => void;
  tenantServices: ServiceTicket[];
  customers: Customer[];
  _employees?: Employee[];
  currentUser: User | null;
  showToast: (message: string, type?: any) => void;
  printConfig?: PrintConfig;
}

export const DocumentPrintouts: React.FC<DocumentPrintoutsProps> = ({
  showSpkPrintout,
  setShowSpkPrintout,
  showInvoicePrintout,
  setShowInvoicePrintout,
  showProvisionalQuote,
  setShowProvisionalQuote,
  showWarrantyPrintout,
  setShowWarrantyPrintout,
  tenantServices,
  customers,
  _employees,
  currentUser,
  showToast,
  printConfig,
}) => {
  const { currentTenantId, tenants, publicBaseUrl } = useSaaS();
  const activeTenant = tenants.find((tenant) => tenant.id === currentTenantId);
  const businessName = activeTenant?.name || 'Layanan Servis';
  const taxSettings = activeTenant?.settings?.taxSettings;
  const taxRate = taxSettings?.taxEnabled ? Math.max(0, Number(taxSettings.taxRate) || 0) : 0;
  const shouldPrintTax = Boolean(printConfig?.printTax && taxRate > 0);
  const calculateTax = (subtotal: number) =>
    shouldPrintTax
      ? taxSettings?.taxInclusive
        ? subtotal - subtotal / (1 + taxRate / 100)
        : subtotal * (taxRate / 100)
      : 0;
  const calculateFinalTotal = (subtotal: number, tax: number) =>
    taxSettings?.taxInclusive ? subtotal : subtotal + tax;
  const logoUrl = getSafePrintImageUrl(activeTenant?.branding?.logoUrl);
  const logoHtml =
    printConfig?.printHeaderLogo && logoUrl
      ? `<img src="${logoUrl}" alt="logo" style="height: 40px; max-width: 160px; object-fit: contain; margin-bottom: 10px;"/>`
      : '';

  const printReceptionTicket = (ticketId: string) => {
    const source = document.getElementById(`reception-print-${ticketId}`);
    if (!source) {
      showToast('Nota penerimaan belum siap dicetak.', 'error');
      return;
    }
    void printJob({ title: 'Nota Penerimaan', html: source.innerHTML, printConfig }).then(
      (result) => {
        if (!result.ok) showToast(result.error || 'Gagal menyiapkan dokumen cetak.', 'error');
      }
    );
  };

  return (
    <>
      {/* SPK Printout */}
      {showSpkPrintout && (() => {
        const ticket = tenantServices.find((s) => s.id === showSpkPrintout);
        const customer = ticket ? customers.find((c) => c.id === ticket.customerId) : undefined;
        if (!ticket || !customer) return null;
        return (
          <SPKPrintout
            ticket={ticket}
            customer={customer}
            printConfig={printConfig}
            logoUrl={logoUrl}
            currentUser={currentUser}
            publicBaseUrl={publicBaseUrl}
            onClose={() => setShowSpkPrintout(null)}
            onPrint={() => printReceptionTicket(ticket.id)}
            fmtPrintDate={fmtPrintDate}
          />
        );
      })()}

      {/* Invoice Printout */}
      {showInvoicePrintout && (() => {
        const ticket = tenantServices.find((s) => s.id === showInvoicePrintout);
        const customer = ticket ? customers.find((c) => c.id === ticket.customerId) : undefined;
        if (!ticket || !customer) return null;
        return (
          <InvoicePrintout
            ticket={ticket}
            customer={customer}
            printConfig={printConfig}
            logoUrl={logoUrl}
            currentUser={currentUser}
            publicBaseUrl={publicBaseUrl}
            onClose={() => setShowInvoicePrintout(null)}
            onPrint={() => printReceptionTicket(ticket.id)}
            fmtPrintDate={fmtPrintDate}
            showToast={showToast}
          />
        );
      })()}

      {/* Warranty Printout */}
      {showWarrantyPrintout && (() => {
        const ticket = tenantServices.find((s) => s.id === showWarrantyPrintout);
        const customer = ticket ? customers.find((c) => c.id === ticket.customerId) : undefined;
        if (!ticket || !customer) return null;
        return (
          <WarrantyPrintout
            ticket={ticket}
            customer={customer}
            printConfig={printConfig}
            businessName={businessName}
            currentUser={currentUser}
            onClose={() => setShowWarrantyPrintout(null)}
            showToast={showToast}
          />
        );
      })()}

      {/* Provisional Quote */}
      {showProvisionalQuote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 p-6 w-full max-w-2xl rounded-2xl shadow-2xl relative border-4 border-slate-100">
            <button
              onClick={() => setShowProvisionalQuote(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Kuesioner Provisional Quote
              </h3>
              {/* Inline JSX untuk provisional quote tetap di sini */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};