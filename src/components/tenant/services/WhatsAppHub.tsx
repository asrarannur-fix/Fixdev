import * as React from "react";
import { MessageSquare, Share2 } from "lucide-react";
import {
  renderTenantWaTemplate,
} from "../../../utils/waTemplate";

type WaTemplate = { category?: string; content?: string };

interface WhatsAppHubProps {
  ticket: any;
  customer: any;
  templates?: WaTemplate[];
  customWaMessageText: string;
  setCustomWaMessageText: (v: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

// Section 4: WhatsApp Customer Communication Hub (Manual click-to-chat link helper).
// Diekstrak dari ServicesTab.tsx agar god-component mengecil.
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] text-indigo-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-500" />{" "}
          WhatsApp Customer Communication Hub
        </h4>
        <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
          Manual Adjustment Mode
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">
            Pilih Template Pesan
          </label>
          <select
            onChange={(e) => {
              const val = e.target.value;
              const estTotal = ticket.estimatedCost || 0;
              const portalLink =
                window.location.origin +
                "/?tab=service&sub=approve-quote&ticket=" +
                ticket.ticketNo;
              let txt = "";
              if (val === "intake") {
                const ctx = {
                  customer_name: customer?.name || "Pelanggan",
                  ticket_no: ticket.ticketNo,
                  device_name: ticket.deviceName,
                  ticket_status: "DITERIMA",
                  status_note: "Unit telah terdaftar dan menunggu diagnosa.",
                };
                txt =
                    renderTenantWaTemplateLocal("SERVICE_UPDATE", ctx) ||
                  `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah berhasil terdaftar di Repair Hub dengan No. Tiket *${ticket.ticketNo}*.\n\nTerima kasih telah mempercayakan perbaikan Anda kepada kami. Tim teknisi kami akan segera melakukan diagnosa secara mendalam.`;
              } else if (val === "diagnose") {
                const ctx = {
                  customer_name: customer?.name || "Pelanggan",
                  ticket_no: ticket.ticketNo,
                  device_name: ticket.deviceName,
                  ticket_status: "DIAGNOSA",
                  status_note: `Estimasi biaya: Rp ${estTotal.toLocaleString()}.`,
                  estimated_cost: estTotal,
                  approval_link: portalLink,
                };
                txt =
                    renderTenantWaTemplateLocal("SERVICE_UPDATE", ctx) ||
                  `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai didiagnosa.\n\nKerusakan memerlukan perbaikan dengan total estimasi biaya perbaikan sebesar *Rp ${estTotal.toLocaleString()}*.\n\nSilakan lihat rincian estimasi dan berikan persetujuan digital Anda melalui tautan portal resmi kami berikut:\n${portalLink}\n\nTerima kasih!`;
              } else if (val === "completed") {
                const ctx = {
                  customer_name: customer?.name || "Pelanggan",
                  ticket_no: ticket.ticketNo,
                  device_name: ticket.deviceName,
                  ticket_status: "SELESAI",
                  status_note: `Total biaya: Rp ${estTotal.toLocaleString()}.`,
                };
                txt =
                    renderTenantWaTemplateLocal("SERVICE_UPDATE", ctx) ||
                  `Halo *${customer?.name || "Pelanggan"}*,\n\nKabar baik! Unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai diperbaiki dan LOLOS uji kontrol kualitas (QC) kami!\n\nUnit kini siap untuk diambil kembali di toko kami dengan total biaya *Rp ${estTotal.toLocaleString()}*.\n\nTerima kasih atas kepercayaan Anda!`;
              } else {
                txt = `Halo *${customer?.name || "Pelanggan"}*,\n\nMengenai unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*), mohon hubungi kami kembali untuk mendiskusikan kelanjutan proses perbaikan. Terima kasih.`;
              }
              setCustomWaMessageText(txt);
            }}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500 font-medium"
          >
            <option value="intake">✓ Tanda Terima Unit Baru (Intake)</option>
            <option value="diagnose">
              ✓ Diagnosa Selesai & Estimasi Biaya
            </option>
            <option value="completed">
              ✓ Perbaikan Selesai & Siap Diambil
            </option>
            <option value="custom">✓ Pesan Kustom / Lainnya</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">
            Isi Pesan WhatsApp (Dapat Diedit Manual)
          </label>
          <textarea
            rows={4}
            value={
              customWaMessageText ||
              (() => {
                const ctx = {
                  customer_name: customer?.name || "Pelanggan",
                  ticket_no: ticket.ticketNo,
                  device_name: ticket.deviceName,
                  ticket_status: ticket.status,
                };
                return (
                  renderTenantWaTemplateLocal("SERVICE_UPDATE", ctx) ||
                  `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah terdaftar di sistem kami.`
                );
              })()
            }
            onChange={(e) => setCustomWaMessageText(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 font-medium leading-relaxed font-mono"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            const text = customWaMessageText || "";
            navigator.clipboard.writeText(text);
            showToast(
              "Isi pesan WhatsApp berhasil disalin ke clipboard!",
              "success",
            );
          }}
          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
        >
          Salin Pesan
        </button>
        <a
          href={`https://wa.me/${(
            customer?.phone || "62"
          )
            .split("")
            .filter((c) => c >= "0" && c <= "9")
            .join("")}?text=${encodeURIComponent(customWaMessageText || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" /> Kirim via
          wa.me (Manual Link)
        </a>
      </div>
    </div>
  );
};
