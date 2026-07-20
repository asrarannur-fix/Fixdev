import * as React from "react";
import { MessageSquare, Share2 } from "lucide-react";
import { renderTenantWaTemplate } from "../../../utils/waTemplate";
import { sanitizeWhatsAppPhone, isValidIndonesianPhone } from "../../../utils/serviceReceptionUtils";

type WaTemplate = { category?: string; content?: string };

interface WhatsAppHubProps {
  ticket: any;
  customer: any;
  templates?: WaTemplate[];
  customWaMessageText: string;
  setCustomWaMessageText: (v: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

// Manual Link only: this component never asks for provider credentials or API pairing.
export const WhatsAppHub: React.FC<WhatsAppHubProps> = ({
  ticket,
  customer,
  templates,
  customWaMessageText,
  setCustomWaMessageText,
  showToast,
}) => {
  const renderTenantWaTemplateLocal = (category: string, ctx: Record<string, any>) =>
    renderTenantWaTemplate(templates, category, ctx);
  const recipientPhone = sanitizeWhatsAppPhone(customer?.phone || "");
  const canSendWhatsApp = isValidIndonesianPhone(recipientPhone);

  const getDefaultMessage = () => {
    const ctx = {
      customer_name: customer?.name || "Pelanggan",
      ticket_no: ticket.ticketNo,
      device_name: ticket.deviceName,
      ticket_status: ticket.status,
    };
    return renderTenantWaTemplateLocal("SERVICE_UPDATE", ctx) ||
      `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah terdaftar di sistem kami.`;
  };

  const selectTemplate = (value: string) => {
    const estTotal = ticket.estimatedCost || 0;
    const portalLink = `${window.location.origin}/?tab=service&sub=approve-quote&ticket=${encodeURIComponent(ticket.ticketNo || "")}`;
    const common = {
      customer_name: customer?.name || "Pelanggan",
      ticket_no: ticket.ticketNo,
      device_name: ticket.deviceName,
    };

    let message = "";
    if (value === "intake") {
      message = renderTenantWaTemplateLocal("SERVICE_UPDATE", {
        ...common,
        ticket_status: "DITERIMA",
        status_note: "Unit telah terdaftar dan menunggu diagnosa.",
      }) || `Halo *${common.customer_name}*,\n\nUnit *${ticket.deviceName}* Anda telah berhasil terdaftar dengan No. Tiket *${ticket.ticketNo}*. Tim teknisi kami akan segera melakukan diagnosa.`;
    } else if (value === "diagnose") {
      message = renderTenantWaTemplateLocal("SERVICE_UPDATE", {
        ...common,
        ticket_status: "DIAGNOSA",
        status_note: `Estimasi biaya: Rp ${estTotal.toLocaleString("id-ID")}.`,
        estimated_cost: estTotal,
        approval_link: portalLink,
      }) || `Halo *${common.customer_name}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai didiagnosa. Estimasi biaya: *Rp ${estTotal.toLocaleString("id-ID")}*.\n\nSilakan tinjau dan setujui melalui:\n${portalLink}`;
    } else if (value === "completed") {
      message = renderTenantWaTemplateLocal("SERVICE_UPDATE", {
        ...common,
        ticket_status: "SELESAI",
        status_note: `Total biaya: Rp ${estTotal.toLocaleString("id-ID")}.`,
      }) || `Halo *${common.customer_name}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai diperbaiki dan siap diambil. Total biaya: *Rp ${estTotal.toLocaleString("id-ID")}*.`;
    } else {
      message = `Halo *${common.customer_name}*,\n\nMengenai unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*), mohon hubungi kami untuk kelanjutan proses perbaikan. Terima kasih.`;
    }
    setCustomWaMessageText(message);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-[10px] text-accent uppercase font-mono tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp Customer Communication Hub
        </h4>
        <span className="shrink-0 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
          Manual Link
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">Pilih Template Pesan</label>
          <select onChange={(event) => selectTemplate(event.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-accent font-medium">
            <option value="intake">Tanda Terima Unit Baru</option>
            <option value="diagnose">Diagnosa & Estimasi Biaya</option>
            <option value="completed">Perbaikan Selesai</option>
            <option value="custom">Pesan Kustom</option>
          </select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">Isi Pesan WhatsApp (Dapat Diedit Manual)</label>
          <textarea rows={4} value={customWaMessageText || getDefaultMessage()} onChange={(event) => setCustomWaMessageText(event.target.value)} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-accent font-medium leading-relaxed font-mono" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={() => {
          navigator.clipboard.writeText(customWaMessageText || getDefaultMessage());
          showToast("Isi pesan WhatsApp berhasil disalin ke clipboard!", "success");
        }} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer">
          Salin Pesan
        </button>
        {canSendWhatsApp ? (
          <a href={`https://wa.me/${recipientPhone}?text=${encodeURIComponent(customWaMessageText || getDefaultMessage())}`} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm">
            <Share2 className="w-3.5 h-3.5" /> Kirim via wa.me (Manual Link)
          </a>
        ) : (
          <span className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-500 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed" title="Nomor WhatsApp pelanggan belum valid atau belum tersedia.">
            <Share2 className="w-3.5 h-3.5" /> Nomor WhatsApp tidak valid
          </span>
        )}
      </div>
    </div>
  );
};
