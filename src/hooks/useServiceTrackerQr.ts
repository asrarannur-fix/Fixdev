import { useState, useEffect } from "react";
import { ServiceTicket } from "../types";
import { useToast } from "../components/ui/Toast";
import { usePrintConfig } from "./usePrintConfig";
import {
  getPrintPageSize,
  getPrintMargin,
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";

export function useServiceTrackerQr(
  services: ServiceTicket[],
  currentTenantId: string,
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
) {
  const { showToast } = useToast();
  const printConfig = usePrintConfig();
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(
    null,
  );
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Update selected ticket details when selection or services list changes
  useEffect(() => {
    if (selectedTicketId) {
      const ticket = services.find(
        (s) => s.id === selectedTicketId && s.tenantId === currentTenantId,
      );
      setSelectedTicket(ticket || null);
      setSyncStatus("idle");
      setSyncMessage("");
    } else {
      setSelectedTicket(null);
    }
  }, [selectedTicketId, services, currentTenantId]);

  // Set default selection to the first available service ticket on load or tenant change
  useEffect(() => {
    const tenantServices = services.filter(
      (s) => s.tenantId === currentTenantId,
    );
    const isValid = tenantServices.some((s) => s.id === selectedTicketId);
    if (tenantServices.length > 0 && (!selectedTicketId || !isValid)) {
      setSelectedTicketId(tenantServices[0].id);
    } else if (tenantServices.length === 0) {
      setSelectedTicketId("");
    }
  }, [services, currentTenantId, selectedTicketId]);

  /**
   * Syncs the current service ticket with the backend in-memory cache
   * so that it can be searched/queried publicly by the customer scanning the QR code.
   */
  const handleSyncTicket = async (ticket: ServiceTicket) => {
    if (!ticket) return;
    try {
      setSyncStatus("syncing");
      const response = await apiFetch("/api/service-tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus("success");
        setSyncMessage("Tiket sukses disinkronkan ke gateway tracking online!");
      } else {
        setSyncStatus("error");
        setSyncMessage("Gagal menyelaraskan tiket dengan server.");
      }
    } catch (err) {
      console.error("Tracking sync error:", err);
      setSyncStatus("error");
      setSyncMessage("Kesalahan jaringan saat menyinkronkan data.");
    }
  };

  /**
   * Generates the public tracking URL for a given ticket.
   */
  const getTrackingUrl = (ticketNo: string) => {
    return `${window.location.origin}/?ticket=${encodeURIComponent(ticketNo)}`;
  };

  /**
   * Generates a QR Code image URL via the secure global QR Server API.
   */
  const getQrCodeUrl = (ticketNo: string) => {
    const trackingUrl = getTrackingUrl(ticketNo);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(trackingUrl)}`;
  };

  /**
   * Open a print-friendly overlay window to print the tracking receipt card beautifully.
   */
  const handlePrintReceipt = (
    ticket: ServiceTicket,
    businessName = "Repair Hub",
  ) => {
    const qrUrl = getQrCodeUrl(ticket.ticketNo);
    const trackingUrl = getTrackingUrl(ticket.ticketNo);
    const dateStr = ticket.customerApprovalDate
      ? new Date(ticket.customerApprovalDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

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
      printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) {
      showToast("Gagal menginisialisasi modul pencetakan.", "error");
      return;
    }

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Nota Penerimaan & QR Lacak - ${ticket.ticketNo}</title>
           <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
            @page { size: ${getPrintPageSize(printConfig)}; margin: ${getPrintMargin(printConfig)}mm; }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              font-size: ${getPrintFontSizePx(printConfig)}px;
            }
            .receipt-card {
              max-width: 500px;
              margin: 0 auto;
              border: 2px dashed #cbd5e1;
              padding: 24px;
              border-radius: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .business-name {
              font-size: 20px;
              font-weight: 700;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
              font-family: 'JetBrains Mono', monospace;
            }
            .ticket-badge {
              display: inline-block;
              background-color: #e0e7ff;
              color: #4338ca;
              font-weight: 700;
              font-family: 'JetBrains Mono', monospace;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-top: 8px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .label {
              color: #64748b;
              font-weight: 500;
            }
            .value {
              font-weight: 600;
              color: #0f172a;
              text-align: right;
            }
            .divider {
              height: 1px;
              background-color: #f1f5f9;
              margin: 12px 0;
            }
            .qr-section {
              text-align: center;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 16px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .qr-code {
              width: 150px;
              height: 150px;
              margin: 0 auto 12px auto;
            }
            .scan-instructions {
              font-size: 11px;
              color: #334155;
              font-weight: 500;
              line-height: 1.4;
            }
            .url-display {
              font-size: 9px;
              color: #94a3b8;
              font-family: 'JetBrains Mono', monospace;
              word-break: break-all;
              margin-top: 4px;
            }
            .footer-notes {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 20px;
              line-height: 1.4;
              border-top: 1px solid #f1f5f9;
              padding-top: 12px;
            }
            @media print {
              body { padding: 0; }
              .receipt-card { border: none; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            ${getPrintHeaderHtml(printConfig, {
              businessName: businessName,
              subtitle: "Layanan Service & Solusi Gadget Terpercaya",
            })}

            <div class="row">
              <span class="label">Tanggal Diterima:</span>
              <span class="value">${dateStr}</span>
            </div>
            <div class="row">
              <span class="label">Nama Perangkat:</span>
              <span class="value">${ticket.deviceName}</span>
            </div>
            <div class="row">
              <span class="label">Brand & Model:</span>
              <span class="value">${ticket.deviceBrandModel || "-"}</span>
            </div>
            <div class="row">
              <span class="label">Keluhan Utama:</span>
              <span class="value">${ticket.customerComplaints}</span>
            </div>
            
            <div class="divider"></div>

            <div class="row">
              <span class="label">Jenis Layanan:</span>
              <span class="value">${ticket.isCheckOnly ? "Hanya Diagnosis / Cek" : "Reparasi Penuh"}</span>
            </div>
            <div class="row">
              <span class="label">Estimasi Biaya:</span>
              <span class="value">Rp ${(ticket.estimatedCost || 0).toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Status Awal:</span>
              <span class="value">${ticket.status}</span>
            </div>

            <div class="qr-section">
              <img src="${qrUrl}" class="qr-code" alt="QR Lacak" />
              <div class="scan-instructions">
                <strong>PINDAI QR UNTUK LACAK STATUS</strong><br/>
                Scan QR Code di atas menggunakan HP Anda untuk memantau perkembangan servis unit ini secara real-time.
              </div>
              <div class="url-display">${trackingUrl}</div>
            </div>

            ${getPrintFooterHtml(printConfig, "Simpan lembaran bukti penerimaan unit ini secara aman.\nTunjukkan QR Code atau sebutkan Nomor Tiket saat pengambilan unit.\nTerima kasih atas kunjungan Anda!")}
            ${getPrintTermsHtml(printConfig, "general")}
          </div>
          <script>
            window.onload = function() {
              // Handled by parent container for cross-browser safety
            };
          </script>
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
  };

  /**
   * Cetak label thermal kecil (58mm) — alamat & customer, tanpa QR besar.
   * Dipanggil dari hover action card di inbox servis.
   */
  const handleDirectPrintLabel = (ticket: ServiceTicket, businessName = "Repair Hub") => {
    const qrUrl = getQrCodeUrl(ticket.ticketNo);
    const dateStr = ticket.createdAt
      ? new Date(ticket.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    let printIframe = document.getElementById("hidden-print-iframe") as HTMLIFrameElement;
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
    const printDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) { showToast("Gagal menginisialisasi modul pencetakan.", "error"); return; }
    printDoc.open();
    printDoc.write(`
      <html><head><title>Label ${ticket.ticketNo}</title>
      <style>
        @page { size: 58mm auto; margin: 2mm; }
        body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10px; }
        .lbl-head { font-weight: 800; font-size: 13px; text-align: center; }
        .lbl-row { display: flex; justify-content: space-between; margin-top: 4px; }
        .lbl-qr { text-align: center; margin-top: 6px; }
        .lbl-qr img { width: 90px; height: 90px; }
        .lbl-foot { text-align: center; font-size: 8px; color: #64748b; margin-top: 4px; }
      </style></head>
      <body>
        <div class="lbl-head">${businessName}</div>
        <div class="lbl-row"><span>Tiket:</span><strong>${ticket.ticketNo}</strong></div>
        <div class="lbl-row"><span>Device:</span><span>${ticket.deviceName || "-"}</span></div>
        <div class="lbl-row"><span>Masuk:</span><span>${dateStr}</span></div>
        <div class="lbl-qr"><img src="${qrUrl}" alt="QR" /></div>
        <div class="lbl-foot">Scan untuk lacak status servis</div>
      </body></html>
    `);
    printDoc.close();
    setTimeout(() => {
      const pIframe = document.getElementById("hidden-print-iframe") as HTMLIFrameElement;
      if (pIframe && pIframe.contentWindow) {
        pIframe.contentWindow.focus();
        pIframe.contentWindow.print();
      }
    }, 400);
  };

  return {
    selectedTicketId,
    setSelectedTicketId,
    selectedTicket,
    syncStatus,
    syncMessage,
    handleSyncTicket,
    getTrackingUrl,
    getQrCodeUrl,
    handlePrintReceipt,
    handleDirectPrintLabel,
  };
}
