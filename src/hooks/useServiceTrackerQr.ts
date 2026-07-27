import { useState, useEffect } from 'react';
import { ServiceTicket } from '../types';
import { useToast } from '../components/ui/Toast';
import { usePrintConfig } from './usePrintConfig';
import { useSaaS } from '../context/SaaSContext';
import { printJobAsync } from '../utils/printJob';
import {
  getPrintPageSize,
  getPrintMargin,
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
  escapeHtml,
} from '../utils/print';

export function useServiceTrackerQr(
  services: ServiceTicket[],
  currentTenantId: string,
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>
) {
  const { showToast } = useToast();
  const { tenants, publicBaseUrl } = useSaaS();
  const printConfig = usePrintConfig();
  const activeTenant = tenants.find((tenant) => tenant.id === currentTenantId);
  const tenantName = activeTenant?.name || 'Layanan Servis';
  const logoUrl = activeTenant?.branding?.logoUrl;
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Update selected ticket details when selection or services list changes
  useEffect(() => {
    if (selectedTicketId) {
      const ticket = services.find(
        (s) => s.id === selectedTicketId && s.tenantId === currentTenantId
      );
      setSelectedTicket(ticket || null);
      setSyncStatus('idle');
      setSyncMessage('');
    } else {
      setSelectedTicket(null);
    }
  }, [selectedTicketId, services, currentTenantId]);

  // Set default selection to the first available service ticket on load or tenant change
  useEffect(() => {
    const tenantServices = services.filter((s) => s.tenantId === currentTenantId);
    const isValid = tenantServices.some((s) => s.id === selectedTicketId);
    if (tenantServices.length > 0 && (!selectedTicketId || !isValid)) {
      setSelectedTicketId(tenantServices[0].id);
    } else if (tenantServices.length === 0) {
      setSelectedTicketId('');
    }
  }, [services, currentTenantId, selectedTicketId]);

  /**
   * Syncs the current service ticket with the backend in-memory cache
   * so that it can be searched/queried publicly by the customer scanning the QR code.
   */
  const handleSyncTicket = async (ticket: ServiceTicket) => {
    if (!ticket) return;
    try {
      setSyncStatus('syncing');
      const response = await apiFetch('/api/service-tracking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus('success');
        setSyncMessage('Tiket sukses disinkronkan ke gateway tracking online!');
      } else {
        setSyncStatus('error');
        setSyncMessage('Gagal menyelaraskan tiket dengan server.');
      }
    } catch (err) {
      console.error('Tracking sync error:', err);
      setSyncStatus('error');
      setSyncMessage('Kesalahan jaringan saat menyinkronkan data.');
    }
  };

  /**
   * Generates the public tracking URL for a given ticket.
   */
  const getTrackingUrl = (ticketNo: string) => {
    return `${publicBaseUrl}/?ticket=${encodeURIComponent(ticketNo)}`;
  };

  const getQrCodeUrl = (ticketNo: string) => getTrackingUrl(ticketNo);

  /**
   * Open a print-friendly overlay window to print the tracking receipt card beautifully.
   */
  const handlePrintReceipt = async (ticket: ServiceTicket, businessName = tenantName) => {
    const qrUrl = '';
    const dateStr = ticket.customerApprovalDate
      ? new Date(ticket.customerApprovalDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

    const printDoc = document.createElement('div');
    printDoc.innerHTML = `
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
              subtitle: 'Layanan Service & Solusi Gadget Terpercaya',
              logoUrl,
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
              <span class="value">${ticket.deviceBrandModel || '-'}</span>
            </div>
            ${
              printConfig?.printCustomerNotes !== false
                ? `
              <div class="row">
                <span class="label">Keluhan Utama:</span>
                <span class="value">${ticket.customerComplaints}</span>
              </div>
            `
                : ''
            }
            
            <div class="divider"></div>

            <div class="row">
              <span class="label">Jenis Layanan:</span>
              <span class="value">${ticket.isCheckOnly ? 'Hanya Diagnosis / Cek' : 'Reparasi Penuh'}</span>
            </div>
            <div class="row">
              <span class="label">Estimasi Biaya:</span>
              <span class="value">Rp ${(ticket.estimatedCost || 0).toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Status Awal:</span>
              <span class="value">${ticket.status}</span>
            </div>

            ${
              printConfig?.printQrCode !== false
                ? `
            <div class="qr-section">
               <div class="qr-code" style="border:1px dashed #64748b;display:flex;align-items:center;justify-content:center;font-size:12px">TIKET<br/>${ticket.ticketNo}</div>
               <div class="scan-instructions">Sebutkan nomor tiket saat memantau status servis.</div>
            </div>`
                : ''
            }

            ${getPrintFooterHtml(printConfig, 'Simpan lembaran bukti penerimaan unit ini secara aman.\nTunjukkan QR Code atau sebutkan Nomor Tiket saat pengambilan unit.\nTerima kasih atas kunjungan Anda!')}
            ${printConfig?.showTermsInTracking !== false ? getPrintTermsHtml(printConfig, 'general') : ''}
          </div>
          <script>
            window.onload = function() {
              // Handled by parent container for cross-browser safety
            };
          </script>
        </body>
      </html>
    `;
    void printJobAsync({
      title: 'Service Tracker',
      html: printDoc.innerHTML,
      printConfig,
      documentType: 'service_receipt',
      documentId: ticket.id,
    }).then((result) =>
      showToast(
        result.ok ? 'Nota servis dikirim ke printer.' : result.error || 'Cetak nota servis gagal.',
        result.ok ? 'success' : 'error'
      )
    );
  };

  /**
   * Cetak label thermal kecil (58mm) — alamat & customer, tanpa QR besar.
   * Dipanggil dari hover action card di inbox servis.
   */
  const getLabelSizeMm = (pc: any): string => {
    const w = Math.min(600, Math.max(200, Number(pc?.labelWidth) || 320));
    const h = Math.min(400, Math.max(100, Number(pc?.labelHeight) || 180));
    // convert viewport px (~96dpi) to mm
    const wmm = Math.round((w * 25.4) / 96);
    const hmm = Math.round((h * 25.4) / 96);
    return `${Math.max(30, wmm)}mm ${Math.max(20, hmm)}mm`;
  };

  const handleDirectPrintLabel = (ticket: ServiceTicket, businessName = tenantName) => {
    const qrUrl = '';
    const dateStr = ticket.createdAt
      ? new Date(ticket.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const printDoc = `
      <html><head><title>Label ${ticket.ticketNo}</title>
      <style>
        @page { size: ${getLabelSizeMm(printConfig)}; margin: ${getPrintMargin(printConfig)}mm; }
        body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: ${printConfig?.labelFontSize === 'lg' ? 13 : printConfig?.labelFontSize === 'base' ? 11 : printConfig?.labelFontSize === 'sm' ? 10 : 8}px; }
        .lbl-head { font-weight: 800; font-size: 13px; text-align: center; }
        .lbl-row { display: flex; justify-content: space-between; margin-top: 4px; }
        .lbl-qr { text-align: center; margin-top: 6px; }
        .lbl-qr img { width: 90px; height: 90px; }
        .lbl-foot { text-align: center; font-size: 8px; color: #64748b; margin-top: 4px; }
      </style></head>
      <body>
        ${printConfig?.labelShowLogo !== false ? `<div class="lbl-head">${escapeHtml(businessName)}</div>` : ''}
        <div class="lbl-row"><span>Tiket:</span><strong>${escapeHtml(ticket.ticketNo)}</strong></div>
        <div class="lbl-row"><span>Device:</span><span>${escapeHtml(ticket.deviceName || '-')}</span></div>
        <div class="lbl-row"><span>Masuk:</span><span>${escapeHtml(dateStr)}</span></div>
        ${printConfig?.printCustomerNotes !== false ? `<div class="lbl-row"><span>Keluhan:</span><span>${escapeHtml(ticket.customerComplaints || '-')}</span></div>` : ''}
        ${printConfig?.labelShowQr !== false ? `<div class="lbl-qr">TIKET ${escapeHtml(ticket.ticketNo)}</div>` : ''}
        <div class="lbl-foot">${escapeHtml(printConfig?.labelCustomText?.trim() || 'Scan untuk lacak status servis')}</div>
      </body></html>
    `;
    void printJobAsync({
      title: 'Service Label',
      html: printDoc,
      printConfig,
      documentType: 'service_label',
      documentId: ticket.id,
    }).then((result) =>
      showToast(
        result.ok
          ? 'Label servis dikirim ke printer.'
          : result.error || 'Cetak label servis gagal.',
        result.ok ? 'success' : 'error'
      )
    );
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
