import * as React from 'react';
import { Share2 } from 'lucide-react';
import { normalizeIndonesianPhone } from '../../../utils/serviceReceptionUtils';

interface ServiceWhatsAppHubProps {
  ticket: any;
  customer: any;
  publicBaseUrl: string;
  customWaMessageText: string;
  renderTenantWaTemplate: (category: string, context: Record<string, any>) => string | null;
  setCustomWaMessageText: (text: string) => void;
  showToast: (message: string, type: string) => void;
}

export const ServiceWhatsAppHub: React.FC<ServiceWhatsAppHubProps> = ({
  ticket,
  customer,
  publicBaseUrl,
  customWaMessageText,
  renderTenantWaTemplate,
  setCustomWaMessageText,
  showToast,
}) => {
  const estimatedCost = Number(ticket.estimatedCost) || 0;
  const approvalLink = `${publicBaseUrl}/?tab=service&sub=approve-quote&ticket=${encodeURIComponent(ticket.ticketNo)}`;
  const statusNote = [ticket.diagnosis, ticket.notes].find((value) => typeof value === 'string' && value.trim())
    || `Status terbaru: ${ticket.status}.`;
  const defaultMessage = renderTenantWaTemplate('SERVICE_UPDATE', {
    customer_name: customer?.name || 'Pelanggan',
    ticket_no: ticket.ticketNo,
    device_name: ticket.deviceName,
    ticket_status: ticket.status,
    status_note: statusNote,
    estimated_cost: estimatedCost,
    approval_link: approvalLink,
  }) || `Halo *${customer?.name || 'Pelanggan'}*,\n\nUnit *${ticket.deviceName}* Anda telah terdaftar di sistem kami.`;
  const message = customWaMessageText || defaultMessage;
  const recipientPhone = normalizeIndonesianPhone(customer?.phone || '');

  return (
   <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3.5">
    <div className="relative flex items-center justify-between">
      <h4 className="font-black text-xs text-emerald-700 dark:text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        WhatsApp Customer Hub
      </h4>
      <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
        Manual Mode
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1">
        <label className="block text-xs font-mono text-slate-400 uppercase">Pilih Template Pesan</label>
        <select
          onChange={(e) => {
            const val = e.target.value;
            const estTotal = Number(ticket.estimatedCost) || 0;
            const portalLink = approvalLink;
            let txt: string;
            if (val === 'intake') {
              const ctx = { customer_name: customer?.name || 'Pelanggan', ticket_no: ticket.ticketNo, device_name: ticket.deviceName, ticket_status: 'DITERIMA', status_note: 'Unit telah terdaftar dan menunggu diagnosa.' };
              txt = renderTenantWaTemplate('SERVICE_UPDATE', ctx) || `Halo *${customer?.name || 'Pelanggan'}*,\n\nUnit *${ticket.deviceName}* Anda telah berhasil terdaftar dengan No. Tiket *${ticket.ticketNo}*.\n\nTerima kasih telah mempercayakan perbaikan Anda kepada kami. Tim teknisi kami akan segera melakukan diagnosa secara mendalam.`;
            } else if (val === 'diagnose') {
              const ctx = { customer_name: customer?.name || 'Pelanggan', ticket_no: ticket.ticketNo, device_name: ticket.deviceName, ticket_status: 'DIAGNOSA', status_note: `Estimasi biaya: Rp ${estTotal.toLocaleString()}.`, estimated_cost: estTotal, approval_link: portalLink };
              txt = renderTenantWaTemplate('SERVICE_UPDATE', ctx) || `Halo *${customer?.name || 'Pelanggan'}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai didiagnosa.\n\nKerusakan memerlukan perbaikan dengan total estimasi biaya perbaikan sebesar *Rp ${estTotal.toLocaleString()}*.\n\nSilakan lihat rincian estimasi dan berikan persetujuan digital Anda melalui tautan portal resmi kami berikut:\n${portalLink}\n\nTerima kasih!`;
            } else if (val === 'completed') {
              const ctx = { customer_name: customer?.name || 'Pelanggan', ticket_no: ticket.ticketNo, device_name: ticket.deviceName, ticket_status: 'SELESAI', status_note: `Total biaya: Rp ${estTotal.toLocaleString()}.` };
              txt = renderTenantWaTemplate('SERVICE_UPDATE', ctx) || `Halo *${customer?.name || 'Pelanggan'}*,\n\nKabar baik! Unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai diperbaiki dan LOLOS uji kontrol kualitas (QC) kami!\n\nUnit kini siap untuk diambil kembali di toko kami dengan total biaya *Rp ${estTotal.toLocaleString()}*.\n\nTerima kasih atas kepercayaan Anda!`;
            } else {
              txt = `Halo *${customer?.name || 'Pelanggan'}*,\n\nMengenai unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*), mohon hubungi kami kembali untuk mendiskusikan kelanjutan proses perbaikan. Terima kasih.`;
            }
            setCustomWaMessageText(txt);
          }}
          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-300 rounded-md outline-none focus:border-accent font-medium"
        >
          <option value="intake">✓ Tanda Terima Unit Baru (Intake)</option>
          <option value="diagnose">✓ Diagnosa Selesai & Estimasi Biaya</option>
          <option value="completed">✓ Perbaikan Selesai & Siap Diambil</option>
          <option value="custom">✓ Pesan Kustom / Lainnya</option>
        </select>
      </div>

      <div className="md:col-span-2 space-y-1">
        <label className="block text-xs font-mono text-slate-400 uppercase">Isi Pesan WhatsApp (Dapat Diedit Manual)</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setCustomWaMessageText(e.target.value)}
          className="w-full text-xs p-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-300 rounded-lg outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-accent font-medium leading-relaxed font-mono"
        />
      </div>
    </div>

    <div className="flex gap-2 justify-end">
      <button type="button" onClick={() => { void navigator.clipboard.writeText(message); showToast('Isi pesan WhatsApp berhasil disalin ke clipboard!', 'success'); }} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer">Salin Pesan</button>
      <a href={recipientPhone ? `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}` : undefined} aria-disabled={!recipientPhone} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm aria-disabled:pointer-events-none aria-disabled:opacity-50">
        <Share2 className="w-3.5 h-3.5" /> Kirim via wa.me (Manual Link)
      </a>
    </div>
  </div>
  );
};
