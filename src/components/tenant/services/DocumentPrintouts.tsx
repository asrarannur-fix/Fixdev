import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Barcode,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Share2,
} from "lucide-react";
import { ServiceTicket, Customer, Employee, User, TenantSettings } from "../../../types";
import { getPaperWidthStyle } from "../../../utils/print";

type PrintConfig = NonNullable<TenantSettings["printConfig"]>;

// Format tanggal aman untuk dokumen cetak (hindari "Invalid Date")
const fmtPrintDate = (value?: string | number | Date): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getPrintCss = (printConfig?: PrintConfig) => {
  const fontSize =
    printConfig?.printFontSize === "small" || printConfig?.printFontSize === "sm"
      ? 10
      : printConfig?.printFontSize === "large" || printConfig?.printFontSize === "lg"
        ? 12
        : 11;
  const margin = Number.isFinite(printConfig?.printMargin)
    ? printConfig?.printMargin
    : 20;
  const pageSize =
    printConfig?.paperSize === "a4" || printConfig?.paperSize === "hvs_a4" || printConfig?.paperSize === "hvs_letter"
      ? "A4"
      : printConfig?.paperSize === "thermal_58"
        ? "58mm auto"
        : "80mm auto";

  return `
                            @page { size: ${pageSize}; margin: ${margin}mm; }
                            body { font-family: system-ui, sans-serif; color: #1e293b; padding: 0; font-size: ${fontSize}px; line-height: 1.4; }
                            .print-footer { border-top: 1px dashed #cbd5e1; margin-top: 12px; padding-top: 8px; font-size: ${Math.max(fontSize - 2, 8)}px; color: #64748b; text-align: center; }
                            @media print { body { padding: 0; } }
  `;
};

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
  employees: Employee[];
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
  employees,
  currentUser,
  showToast,
  printConfig,
}) => {
  const printReceptionTicket = (ticketId: string) => {
    const source = document.getElementById(`reception-print-${ticketId}`);
    if (!source) {
      showToast("Nota penerimaan belum siap dicetak.", "error");
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      showToast("Gagal menyiapkan dokumen cetak.", "error");
      return;
    }
    doc.open();
    doc.write(`<!doctype html><html><head><title>Nota Penerimaan</title><style>
      ${getPrintCss(printConfig)}
      body { margin: 0; }
      .reception-print { width: ${getPaperWidthStyle(printConfig)}; max-width: 100%; margin: 0 auto; }
      button { display: none !important; }
    </style></head><body><main class="reception-print">${source.innerHTML}</main></body></html>`);
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    }, 100);
  };

  return (
    <>
      {/* SPK Printout Template */}
      {showSpkPrintout &&
        (() => {
          const ticket = tenantServices.find((s) => s.id === showSpkPrintout);
          if (!ticket) return null;
          const customer = customers.find((c) => c.id === ticket.customerId);
          return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
              <div
                className="bg-white p-6 w-full rounded-2xl shadow-2xl relative border-4 border-slate-100 font-sans text-slate-800 space-y-4"
                style={{
                  maxWidth: printConfig?.paperSize === "thermal_58" ? "300px" : printConfig?.paperSize === "thermal_80" ? "390px" : "760px",
                  fontSize: `${printConfig?.printFontSize === "sm" ? 10 : printConfig?.printFontSize === "lg" ? 13 : 11}px`,
                }}
              >
                  <div id={`reception-print-${ticket.id}`} className="relative">
                    {/* Close button */}
                    <button
                      onClick={() => setShowSpkPrintout(null)}
                      className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer no-print"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Print button */}
                    <button
                      onClick={() => printReceptionTicket(ticket.id)}
                      className="absolute top-4 right-12 p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full cursor-pointer no-print"
                    >
                      <Printer className="w-5 h-5" />
                    </button>

                    {/* Receipt Layout */}
                    <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-3.5 bg-white">
                  <div className="text-center space-y-0.5">
                    {printConfig?.printHeaderLogo && (
                      <img src="/logo.png" alt="Logo usaha" className="h-9 mx-auto mb-2 object-contain" />
                    )}
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                      {printConfig?.customHeaderTitle || "SURAT PERINTAH KERJA (SPK)"}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">
                      TANDA TERIMA UNIT MASUK
                    </p>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <p className="text-slate-400 uppercase">TANGGAL MASUK:</p>
                      <p className="font-bold text-slate-700">
                        {fmtPrintDate(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 uppercase">
                        NOMOR SPK / TIKET:
                      </p>
                      <p className="font-bold text-indigo-600">
                        {ticket.ticketNo}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2 space-y-1.5 text-[10px]">
                    <p>
                      <strong className="font-semibold text-slate-500">
                        Nama Pelanggan:
                      </strong>{" "}
                      <span className="font-bold text-slate-700">
                        {customer?.name || "Umum"}
                      </span>
                    </p>
                    <p>
                      <strong className="font-semibold text-slate-500">
                        No Handphone:
                      </strong>{" "}
                      <span className="font-mono text-slate-700">
                        {customer?.phone || "-"}
                      </span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-lg my-1 border border-slate-200 text-[9.5px]">
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Kategori:
                        </strong>{" "}
                        <span className="font-bold text-slate-800">
                          {ticket.deviceCategory || "Smartphone"}
                        </span>
                      </p>
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Fisik:
                        </strong>{" "}
                        <span className="font-bold text-slate-800">
                          {ticket.physicalCondition || "Mulus"}
                        </span>
                      </p>
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Kunci Layar:
                        </strong>{" "}
                        <span className="font-mono font-bold text-indigo-700">
                          {ticket.screenLockPin ? "••••••" : "Tidak Ada"}
                        </span>
                      </p>
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Est. Selesai:
                        </strong>{" "}
                        <span className="font-bold text-emerald-700">
                          {ticket.estimatedCompletionDate
                            ? new Date(
                                ticket.estimatedCompletionDate,
                              ).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "3 Hari"}
                        </span>
                      </p>
                    </div>

                    <p>
                      <strong className="font-semibold text-slate-500">
                        Tipe Perangkat:
                      </strong>{" "}
                      <span className="font-bold text-indigo-700">
                        {ticket.deviceName}
                      </span>
                    </p>
                    {ticket.deviceBrandModel && (
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Brand / Model:
                        </strong>{" "}
                        <span className="text-slate-700">
                          {ticket.deviceBrandModel}
                        </span>
                      </p>
                    )}
                    <p>
                      <strong className="font-semibold text-slate-500">
                        Serial Number:
                      </strong>{" "}
                      <span className="font-mono text-slate-700">
                        {ticket.deviceSerial || "N/A"}
                      </span>
                    </p>

                    {((ticket.accessoriesLeft &&
                      ticket.accessoriesLeft.length > 0) ||
                      ticket.customAccessories) && (
                      <p>
                        <strong className="font-semibold text-slate-500">
                          Aksesoris Titipan:
                        </strong>{" "}
                        <span className="font-semibold text-slate-700 text-[9.5px]">
                          {ticket.accessoriesLeft
                            ? ticket.accessoriesLeft
                                .map((acc) => {
                                  const labels: Record<string, string> = {
                                    charger: "Charger",
                                    cable: "Kabel",
                                    sim: "SIM",
                                    sd: "SD Card",
                                    case: "Case",
                                    box: "Box",
                                  };
                                  return labels[acc] || acc;
                                })
                                .join(", ")
                            : ""}
                          {ticket.customAccessories
                            ? ticket.accessoriesLeft &&
                              ticket.accessoriesLeft.length > 0
                              ? `, ${ticket.customAccessories}`
                              : ticket.customAccessories
                            : ""}
                        </span>
                      </p>
                    )}

                    <p>
                      <strong className="font-semibold text-slate-500">
                        Keluhan / Kerusakan:
                      </strong>{" "}
                      <span className="text-slate-700 italic border border-slate-200 bg-slate-50 px-2 py-1 rounded font-medium block mt-1 leading-relaxed">
                        {ticket.customerComplaints || "-"}
                      </span>
                    </p>
                  </div>

                  {/* Barcode Block */}
                  <div className="flex flex-col items-center justify-center py-2.5 border-t border-b border-dashed border-slate-200">
                    <span className="p-1 bg-white border border-slate-200 rounded">
                      <Barcode className="w-36 h-8 text-slate-800" />
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 mt-1">
                      {ticket.id}
                    </span>
                  </div>

                  {printConfig?.printQrCode && (
                    <div className="flex flex-col items-center justify-center py-2 border-t border-dashed border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/?ticket=${ticket.ticketNo}`)}`}
                        alt={`QR tracking ${ticket.ticketNo}`}
                        className="w-20 h-20"
                      />
                      <span className="text-[8px] text-slate-500 mt-1">Scan untuk lacak status servis</span>
                    </div>
                  )}

                  {/* Agreement terms */}
                  {printConfig?.printTermsAndConditions ? (
                    <div className="text-[7.5px] text-slate-400 leading-normal space-y-1">
                      <p><strong>SYARAT & KETENTUAN SERVICE:</strong></p>
                      {(printConfig.termsAndConditionsText || "")
                        .split("\n")
                        .filter(Boolean)
                        .map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  ) : null}

                  {/* Signature area */}
                  <div className="border-t border-dashed border-slate-200 pt-3.5 grid grid-cols-2 gap-4 text-center text-[9px] font-mono">
                    <div>
                      <p className="text-slate-400 uppercase">PELANGGAN</p>
                      <div className="h-9"></div>
                      <p className="border-t-2 border-slate-400 pt-1 font-bold">
                        {customer?.name || "Customer"}
                      </p>
                      <p className="text-slate-400 mt-0.5">( Tanggal: ......../......../........ )</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase">
                        KASIR / TEKNISI
                      </p>
                      <div className="h-9"></div>
                      <p className="border-t-2 border-slate-400 pt-1 font-bold">
                        {currentUser?.name || "Staff"}
                      </p>
                      <p className="text-slate-400 mt-0.5">( Tanggal: ......../......../........ )</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>,
            document.body
          );
})()}

      {showInvoicePrintout &&
        (() => {
          const ticket = tenantServices.find((s) => s.id === showInvoicePrintout);
          if (!ticket) return null;
          const customer = customers.find((c) => c.id === ticket.customerId);
          const laborCost = (ticket as any).laborCost || 0;
          const chargeableMicroUsages = (ticket.microComponentUsages || []).filter((usage) => usage.chargeable);
          const grandTotal = ticket.estimatedCost || 0;
          const totalTax = (printConfig as any)?.printTax ? grandTotal * 0.11 : 0;
          return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
              <div className="bg-white p-6 max-w-md w-full rounded-2xl shadow-2xl relative border-4 border-slate-100 font-sans text-slate-800 space-y-4">
                {/* Close button */}
                <button
                  onClick={() => setShowInvoicePrintout(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Receipt Layout */}
                <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-3.5 bg-slate-50/50">
                  {/* Warranty Period details */}
                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-[8.5px] text-indigo-700 text-center">
                    <p className="font-bold">
                      GARANSI PROTEKSI REPAIR HUB TERJAMIN
                    </p>
                    <p className="mt-0.5">
                      Masa garansi komponen selama{" "}
                      <strong>{ticket.warrantyMonths} Bulan</strong> berlaku
                      hingga:{" "}
                      <strong>
                        {(() => {
                          const expDate = new Date();
                          expDate.setMonth(
                            expDate.getMonth() + (ticket.warrantyMonths || 3),
                          );
                          return expDate.toLocaleDateString();
                        })()}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      let printIframe = document.getElementById(
                        "hidden-print-iframe",
                      ) as HTMLIFrameElement;
                      if (!printIframe) {
                        printIframe = document.createElement("iframe");
                        printIframe.id = "hidden-print-iframe";
                        printIframe.style.position = "fixed";
                        printIframe.style.width = "0";
                        printIframe.style.height = "0";
                        printIframe.style.border = "none";
                        printIframe.style.opacity = "0";
                        document.body.appendChild(printIframe);
                      }
                      const printDoc =
                        printIframe.contentWindow?.document ||
                        printIframe.contentDocument;
                      if (!printDoc) {
                        showToast(
                          "Gagal menginisialisasi modul pencetakan.",
                          "error",
                        );
                        return;
                      }
                      printDoc.open();
                      printDoc.write(`
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
                             ${printConfig?.printHeaderLogo ? '<img src="/logo.png" alt="logo" style="height: 40px; margin-bottom: 10px;"/>' : ""}
                            <h4>${printConfig?.customHeaderTitle || "NOTA PELUNASAN / INVOICE SERVIS"}</h4>
                            <p>REPAIR SHOP SYSTEM - COMPLETED WORK ORDER</p>
                          </div>
                          <div class="meta">
                            <div>
                              <strong>NO INVOICE:</strong><br/>
                              INV-${ticket.ticketNo}<br/><br/>
                              <strong>NAMA PELANGGAN:</strong><br/>
                              ${customer?.name || "Umum"}
                            </div>
                            <div class="right">
                              <strong>TANGGAL CETAK:</strong><br/>
                              ${new Date().toLocaleDateString()}<br/><br/>
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
                                ${
                                  ticket.partsUsed
                                    ? ticket.partsUsed
                                        .map(
                                          (part) => `
                                  <tr>
                                    <td style="color: #64748b; padding-left: 8px;">- ${part.name} (x${part.quantity})</td>
                                    <td style="text-align: right; font-family: monospace; color: #64748b;">Rp ${part.totalPrice.toLocaleString()}</td>
                                  </tr>
                                `,
                                        )
                                        .join("")
                                    : ""
                                }
                                ${chargeableMicroUsages.map((usage) => `
                                  <tr>
                                    <td style="color: #4f46e5; padding-left: 8px;">- ${usage.name} (x${usage.quantity})</td>
                                    <td style="text-align: right; font-family: monospace; color: #4f46e5;">Rp ${usage.chargeTotal.toLocaleString()}</td>
                                  </tr>
                                `).join("")}
                              </tbody>
                            </table>
                          </div>
                          <div class="totals">
                            <div class="totals-row">
                              <span>SUBTOTAL PERBAIKAN:</span>
                              <span>Rp ${(ticket.estimatedCost || 0).toLocaleString()}</span>
                            </div>
                            <div class="totals-row">
                              <span>PPN (11%):</span>
                              <span>Rp ${totalTax.toLocaleString()}</span>
                            </div>
                            <div class="totals-row grand-total">
                              <span>TOTAL AKHIR (LUNAS):</span>
                              <span>Rp ${grandTotal.toLocaleString()}</span>
                            </div>
                          </div>
                          <div class="signatures">
                            <div>
                              <p style="color: #64748b; margin-bottom: 2px;">PELANGGAN</p>
                              <div class="signature-space"></div>
                              <p class="border-t">${customer?.name || "Customer"}</p>
                            </div>
                            <div>
                              <p style="color: #64748b; margin-bottom: 2px;">PETUGAS KASIR</p>
                              <div class="signature-space"></div>
                              <p class="border-t">${currentUser?.name || "Staff"}</p>
                            </div>
                          </div>
                          ${
                            printConfig?.printQrCode
                              ? `
                          <div style="text-align: center; margin-top: 15px;">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + "/?ticket=" + ticket.ticketNo)}" alt="QR Code" />
                          </div>
                          `
                              : ""
                          }
                          <div class="print-footer">
                            ${printConfig?.customFooterText || "Terima kasih atas kepercayaan Anda."}
                          </div>
                        </body>
                      </html>
                    `);
                      printDoc.close();
                      setTimeout(() => {
                        const pIframe = document.getElementById(
                          "hidden-print-iframe",
                        ) as HTMLIFrameElement;
                        if (pIframe && pIframe.contentWindow) {
                          pIframe.contentWindow.focus();
                          pIframe.contentWindow.print();
                        }
                      }, 500);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer text-center shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1"
                  >
                    <Printer className="w-4 h-4" /> Cetak Struk Nota
                  </button>
                  <button
                    onClick={() => setShowInvoicePrintout(null)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-xl cursor-pointer text-center"
                  >
                    Tutup
                  </button>
            </div>
          </div>
        </div>,
        document.body
      );
        })()
      }

      {showProvisionalQuote &&
        (() => {
          const ticket = tenantServices.find((s) => s.id === showProvisionalQuote);
          if (!ticket) return null;
          const customer = customers.find((c) => c.id === ticket.customerId);
          const laborCost = (ticket as any).laborCost || 0;
          const partsCost = ticket.partsUsed ? ticket.partsUsed.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0) : 0;
          const grandTotal = laborCost + partsCost;
          const totalTax = (printConfig as any)?.printTax ? grandTotal * 0.11 : 0;
          const technician = employees.find((e) => e.id === ticket.assignedTechId);
          return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
              <div className="bg-white p-6 max-w-md w-full rounded-2xl shadow-2xl relative border-4 border-slate-100 font-sans text-slate-800 space-y-4">
                {/* Close button */}
                <button
                  onClick={() => setShowProvisionalQuote(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Receipt Layout */}
                <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-3.5 bg-slate-50/50">
                  {/* Cost breakdown */}
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <p className="text-[9px] font-bold font-mono text-slate-400 uppercase">
                      RINCIAN JASA & KOMPONEN SUKU CADANG:
                    </p>

                    <div className="space-y-1.5 text-[10px]">
                      {/* Jasa Repair */}
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Estimasi Jasa Teknis & Servis
                        </span>
                        <span className="font-mono text-slate-700">
                          Rp {laborCost.toLocaleString()}
                        </span>
                      </div>

                      {/* Parts Used */}
                      {ticket.partsUsed && ticket.partsUsed.length > 0 ? (
                        ticket.partsUsed.map((part, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex justify-between text-slate-500 pl-2"
                          >
                            <span>
                              - {part.name} (x{part.quantity})
                            </span>
                            <span className="font-mono">
                              Rp {(part.totalPrice ?? 0).toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[9px] text-slate-400 italic pl-2">
                          Belum ada suku cadang tambahan yang ditambahkan.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cost Totals */}
                  <div className="border-t border-dashed border-slate-200 pt-2 text-[10px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">
                        SUBTOTAL ESTIMASI:
                      </span>
                      <span className="font-bold text-slate-700">
                        Rp {(ticket.estimatedCost || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>ESTIMASI PPN (11%):</span>
                      <span>Rp {totalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5 font-bold">
                      <span className="text-amber-800 font-extrabold">
                        GRAND TOTAL ESTIMASI:
                      </span>
                      <span className="text-amber-800 font-extrabold">
                        Rp {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-[7.5px] text-slate-400 leading-normal space-y-1 bg-amber-50/50 p-2 rounded-lg border border-amber-150/40">
                    <p className="font-bold text-amber-950">
                      CATATAN & PERSETUJUAN DIGITAL:
                    </p>
                    <p>
                      1. Penawaran ini berlaku selama 7 hari sejak tanggal
                      diterbitkan.
                    </p>
                    <p>
                      2. Perbaikan tidak akan dikerjakan sebelum disetujui
                      digital oleh pelanggan.
                    </p>
                    <p>
                      3. Jika ditolak, unit akan dirakit kembali tanpa biaya
                      tambahan diagnosa.
                    </p>
                  </div>

                  {/* Signature block with digital signature if approved */}
                  <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-4 text-[9px] font-medium text-center">
                    <div className="space-y-4">
                      <p className="text-slate-400">MENYETUJUI DIGITAL</p>
                      {ticket.provisionalSignature ? (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded p-1 flex flex-col items-center justify-center">
                          <img
                            src={ticket.provisionalSignature}
                            alt="Digital Signature"
                            className="h-8 object-contain"
                          />
                          <span className="text-[7.5px] font-mono font-bold text-emerald-700 uppercase mt-1">
                            APPROVED
                          </span>
                          <span className="text-[6.5px] font-mono text-slate-400">
                            {ticket.provisionalApprovedAt}
                          </span>
                        </div>
                      ) : (
                        <div className="h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 font-mono text-[8px]">
                          BELUM ADA TANDA TANGAN
                        </div>
                      )}
                      <p className="border-t border-slate-300 pt-1 text-slate-600 font-bold">
                        {ticket.provisionalSignatureName ||
                          customer?.name ||
                          "Customer"}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-slate-400">
                        TEKNISI / PENANGGUNG JAWAB
                      </p>
                      <div className="h-10 flex items-center justify-center text-slate-500 font-bold font-mono">
                        {technician?.name || currentUser?.name || "Teknisi"}
                      </div>
                      <p className="border-t border-slate-300 pt-1 text-slate-600 font-bold">
                        {technician?.name || currentUser?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      let printIframe = document.getElementById(
                        "hidden-print-iframe",
                      ) as HTMLIFrameElement;
                      if (!printIframe) {
                        printIframe = document.createElement("iframe");
                        printIframe.id = "hidden-print-iframe";
                        printIframe.style.position = "fixed";
                        printIframe.style.width = "0";
                        printIframe.style.height = "0";
                        printIframe.style.border = "none";
                        printIframe.style.opacity = "0";
                        document.body.appendChild(printIframe);
                      }
                      const printDoc =
                        printIframe.contentWindow?.document ||
                        printIframe.contentDocument;
                      if (!printDoc) {
                        showToast(
                          "Gagal menginisialisasi modul pencetakan.",
                          "error",
                        );
                        return;
                      }
                      printDoc.open();
                      printDoc.write(`
                      <html>
                        <head>
                          <title>Penawaran Biaya - ${ticket.ticketNo}</title>
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
                            .quote-badge { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            ${printConfig?.printHeaderLogo ? '<img src="/logo.png" alt="logo" style="height: 40px; margin-bottom: 10px;"/>' : ""}
                            <h4>${printConfig?.customHeaderTitle || "SURAT PENAWARAN BIAYA REPARASI"}</h4>
                            <p>ESTIMASI BIAYA SEMENTARA / QUOTE REQUEST</p>
                          </div>
                          <div class="meta">
                            <div>
                              <strong>NO PENAWARAN:</strong><br/>
                              QO-${ticket.ticketNo}<br/><br/>
                              <strong>NAMA PELANGGAN:</strong><br/>
                              ${customer?.name || "Umum"}
                            </div>
                            <div class="right">
                              <strong>REF TIKET:</strong><br/>
                              ${ticket.ticketNo}<br/><br/>
                              <strong>STATUS PERSETUJUAN:</strong><br/>
                              <span class="quote-badge">${ticket.customerApprovalStatus === "APPROVED" ? "DISETUJUI" : ticket.customerApprovalStatus === "REJECTED" ? "DITOLAK" : "MENUNGGU APPROVAL"}</span>
                            </div>
                          </div>
                          <div class="section">
                            <p><strong>Rincian Estimasi Jasa & Suku Cadang:</strong></p>
                            <table class="item-table">
                              <thead>
                                <tr>
                                  <th>Deskripsi</th>
                                  <th style="text-align: right;">Biaya</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Estimasi Jasa Teknis & Servis</td>
                                  <td style="text-align: right; font-family: monospace;">Rp ${laborCost.toLocaleString()}</td>
                                </tr>
                                ${
                                  ticket.partsUsed &&
                                  ticket.partsUsed.length > 0
                                    ? ticket.partsUsed
                                        .map(
                                          (part) => `
                                  <tr>
                                    <td style="color: #64748b; padding-left: 8px;">- ${part.name} (x${part.quantity})</td>
                                    <td style="text-align: right; font-family: monospace; color: #64748b;">Rp ${(part.totalPrice ?? 0).toLocaleString()}</td>
                                  </tr>
                                `,
                                        )
                                        .join("")
                                    : `<tr><td colspan="2" style="color: #94a3b8; font-style: italic; padding-left: 8px;">Belum ada suku cadang tambahan yang ditambahkan.</td></tr>`
                                }
                              </tbody>
                            </table>
                          </div>
                          <div class="totals">
                            <div class="totals-row">
                              <span>SUBTOTAL ESTIMASI:</span>
                              <span>Rp ${(ticket.estimatedCost || 0).toLocaleString()}</span>
                            </div>
                            <div class="totals-row">
                              <span>ESTIMASI PPN (11%):</span>
                              <span>Rp ${totalTax.toLocaleString()}</span>
                            </div>
                            <div class="totals-row grand-total">
                              <span>GRAND TOTAL ESTIMASI:</span>
                              <span>Rp ${grandTotal.toLocaleString()}</span>
                            </div>
                          </div>
                          <div class="signatures">
                            <div>
                              <p style="color: #64748b; margin-bottom: 2px;">MENYETUJUI DIGITAL</p>
                              ${
                                ticket.provisionalSignature
                                  ? `
                                <div style="margin: 5px 0; text-align: center;">
                                  <img src="${ticket.provisionalSignature}" alt="Signature" style="height: 30px; object-fit: contain;" />
                                  <div style="font-size: 7px; color: #059669; font-weight: bold; font-family: monospace;">APPROVED - ${ticket.provisionalApprovedAt}</div>
                                </div>
                              `
                                  : `<div class="signature-space"></div>`
                              }
                              <p class="border-t">${ticket.provisionalSignatureName || customer?.name || "Customer"}</p>
                            </div>
                            <div>
                              <p style="color: #64748b; margin-bottom: 2px;">TEKNISI / PENANGGUNG JAWAB</p>
                              <div class="signature-space" style="display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: monospace; font-size: 10px;">
                                ${technician?.name || currentUser?.name || "Teknisi"}
                              </div>
                              <p class="border-t">${technician?.name || currentUser?.name}</p>
                            </div>
                          </div>
                           ${
                             printConfig?.printQrCode
                               ? `
                          <div style="text-align: center; margin-top: 15px;">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + "/?tab=service&sub=approve-quote&ticket=" + ticket.ticketNo)}" alt="QR Code" />
                          </div>
                          `
                               : ""
                           }
                          <div class="print-footer">
                            ${printConfig?.customFooterText || "Penawaran ini valid selama 7 hari."}
                          </div>
                        </body>
                      </html>
                    `);
                      printDoc.close();
                      setTimeout(() => {
                        const pIframe = document.getElementById(
                          "hidden-print-iframe",
                        ) as HTMLIFrameElement;
                        if (pIframe && pIframe.contentWindow) {
                          pIframe.contentWindow.focus();
                          pIframe.contentWindow.print();
                        }
                      }, 500);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer text-center shadow-md flex items-center justify-center gap-1"
                  >
                    <Printer className="w-4 h-4" /> Cetak Penawaran
                  </button>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/?tab=service&sub=approve-quote&ticket=${ticket.ticketNo}`;
                      navigator.clipboard.writeText(link);
                      showToast(
                        "Link Persetujuan Digital disalin ke clipboard!",
                        "success",
                      );
                    }}
                    className="flex-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <Share2 className="w-4 h-4" /> Salin Link Portal
                  </button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()
      }

      {/* Warranty Card Certificate Printout */}
      {showWarrantyPrintout &&
        (() => {
          const ticket = tenantServices.find(
            (s) => s.id === showWarrantyPrintout,
          );
          if (!ticket) return null;
          const customer = customers.find((c) => c.id === ticket.customerId);
          const expDate = new Date();
          expDate.setMonth(expDate.getMonth() + (ticket.warrantyMonths || 3));
          const expString = expDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const claimUrl = `${window.location.origin}/?tab=service&sub=warranty-claim&ticket=${ticket.ticketNo}`;

          return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
              <div className="bg-white p-6 max-w-md w-full rounded-2xl shadow-2xl relative border-4 border-indigo-100 font-sans text-slate-800 space-y-4 animate-scaleUp">
                {/* Close button */}
                <button
                  onClick={() => setShowWarrantyPrintout(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header with Shield Icon */}
                <div className="text-center space-y-1.5">
                  <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                    KARTU GARANSI DIGITAL
                  </h4>
                  <p className="text-[9px] text-indigo-600 font-mono font-bold uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                    REPAIR HUB VERIFIED
                  </p>
                </div>

                {/* Card Visual Layout */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-lg border border-indigo-950">
                  {/* Decorative background grids */}
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
                        <p className="text-xs font-bold truncate">
                          {ticket.deviceName}
                        </p>
                        <p className="text-[9px] text-indigo-200 truncate">
                          {ticket.deviceBrandModel || "Suku Cadang"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-indigo-300 uppercase font-mono tracking-wider">
                          Pelanggan
                        </p>
                        <p className="text-xs font-bold truncate">
                          {customer?.name || "Umum"}
                        </p>
                        <p className="text-[9px] text-indigo-200 truncate">
                          {customer?.phone || ""}
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
                        <p className="text-xs font-extrabold text-emerald-300">
                          {expString}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Syarat & Ketentuan */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[10px]">
                  <p className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[9px]">
                    Syarat & Ketentuan Klaim Garansi:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[9.5px]">
                    <li>
                      Segel garansi fisik pada perangkat{" "}
                      <strong>wajib utuh</strong> (tidak rusak/robek).
                    </li>
                    <li>
                      Garansi hanya mencakup suku cadang yang diganti pada
                      pengerjaan ini.
                    </li>
                    <li>
                      Tidak berlaku jika terjadi kerusakan akibat{" "}
                      <strong>
                        cairan, benturan keras (retak/pecah), atau kelalaian
                        pengguna
                      </strong>
                      .
                    </li>
                    <li>
                      Tunjukkan kartu garansi digital ini kepada kasir saat
                      mengajukan klaim.
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      showToast(
                        `Klaim Garansi Terverifikasi! Sistem telah memvalidasi tiket ${ticket.ticketNo}. Status Garansi: AKTIF.`,
                        "success",
                      );
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
                  >
                    <Zap className="w-4 h-4" /> Verifikasi Status Garansi Aktif
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        let printIframe = document.getElementById(
                          "hidden-print-iframe",
                        ) as HTMLIFrameElement;
                        if (!printIframe) {
                          printIframe = document.createElement("iframe");
                          printIframe.id = "hidden-print-iframe";
                          printIframe.style.position = "fixed";
                          printIframe.style.width = "0";
                          printIframe.style.height = "0";
                          printIframe.style.border = "none";
                          printIframe.style.opacity = "0";
                          document.body.appendChild(printIframe);
                        }
                        const printDoc =
                          printIframe.contentWindow?.document ||
                          printIframe.contentDocument;
                        if (!printDoc) {
                          showToast(
                            "Gagal menginisialisasi modul pencetakan.",
                            "error",
                          );
                          return;
                        }
                        printDoc.open();
                        printDoc.write(`
                        <html>
                          <head>
                            <title>Warranty - ${ticket.ticketNo}</title>
                            <style>
                              ${getPrintCss(printConfig)}
                              .header { text-align: center; margin-bottom: 20px; }
                              .header h4 { margin: 0; font-size: 15px; font-weight: 800; color: #000; letter-spacing: 1px; }
                              .header p { margin: 3px 0; color: #4f46e5; font-size: 10px; font-weight: bold; letter-spacing: 1px; }
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
                              ${printConfig?.printHeaderLogo ? '<img src="/logo.png" alt="logo" style="height: 40px; margin-bottom: 10px;"/>' : ""}
                              <h4>${printConfig?.customHeaderTitle || "KARTU GARANSI DIGITAL"}</h4>
                              <p>REPAIR HUB VERIFIED WARRANTY</p>
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
                                  <div style="font-size: 9px; color: #cbd5e1;">${ticket.deviceBrandModel || "Suku Cadang"}</div>
                                </div>
                                <div style="text-align: right;">
                                  <div class="label">Pelanggan</div>
                                  <div class="val">${customer?.name || "Umum"}</div>
                                  <div style="font-size: 9px; color: #cbd5e1;">${customer?.phone || ""}</div>
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
                                        .split("\n")
                                        .map((line: string) => `<li>${line}</li>`)
                                        .join("")
                                    : `<li>Segel garansi fisik pada perangkat <strong>wajib utuh</strong> (tidak rusak/robek).</li>
                                <li>Garansi hanya mencakup suku cadang yang diganti pada pengerjaan ini.</li>
                                <li>Tidak berlaku jika terjadi kerusakan akibat <strong>cairan, benturan keras (retak/pecah), atau kelalaian pengguna</strong>.</li>
                                <li>Tunjukkan kartu garansi digital ini kepada kasir saat mengajukan klaim.</li>`
                                }
                              </ul>
                            </div>
                             ${
                               printConfig?.printQrCode
                                 ? `
                          <div style="text-align: center; margin-top: 15px;">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(claimUrl)}" alt="QR Code" />
                          </div>
                          `
                                 : ""
                             }
                            <div class="print-footer">
                                ${printConfig?.customFooterText || "Simpan kartu garansi ini untuk klaim di masa mendatang."}
                            </div>
                          </body>
                        </html>
                      `);
                        printDoc.close();
                        setTimeout(() => {
                          const pIframe = document.getElementById(
                            "hidden-print-iframe",
                          ) as HTMLIFrameElement;
                          if (pIframe && pIframe.contentWindow) {
                            pIframe.contentWindow.focus();
                            pIframe.contentWindow.print();
                          }
                        }, 500);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1 flex-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Kartu
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(claimUrl);
                        showToast(
                          "Link klaim disalin ke clipboard!",
                          "success",
                        );
                      }}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                       <Share2 className="w-3.5 h-3.5 text-slate-400" /> Salin
                       Link Klaim
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            );
          })()
        }

    </>
  );
};
