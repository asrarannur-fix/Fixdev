import React, { useState } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { Campaign, CampaignChannel } from "../../../types";
import { Megaphone, Plus, Trash2, Eye, Send, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export const CampaignManager: React.FC = () => {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign, customers, currentTenantId, vouchers } = useSaaS();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState<CampaignChannel>("WHATSAPP");
  const [formSegment, setFormSegment] = useState("ALL");
  const [formMessage, setFormMessage] = useState("");
  const [formCoupon, setFormCoupon] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);
  const tenantCampaigns = campaigns.filter((c) => c.tenantId === currentTenantId);

  const getTargetCount = (segment: string) => {
    switch (segment) {
      case "ALL": return tenantCustomers.length;
      case "VIP": return tenantCustomers.filter((c) => (c.loyaltyPoints || 0) > 500).length;
      case "CORPORATE": return tenantCustomers.filter((c) => c.segment === "CORPORATE").length;
      case "COLD": return tenantCustomers.filter((c) => {
        if (!c.lastServiceDate) return true;
        const months = (Date.now() - new Date(c.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months > 6;
      }).length;
      case "ACTIVE": return tenantCustomers.filter((c) => (c.loyaltyPoints || 0) > 100).length;
      default: return tenantCustomers.length;
    }
  };

  const handleCreate = () => {
    if (!formName || !formMessage) {
      showToast("Isi nama kampanye dan pesan", "error");
      return;
    }
    const targetCount = getTargetCount(formSegment);
    addCampaign({
      name: formName,
      channel: formChannel,
      targetSegment: formSegment,
      targetCount,
      message: formMessage,
      couponCode: formCoupon || undefined,
      status: "DRAFT",
      createdBy: "admin",
    });
    showToast("Kampanye berhasil dibuat", "success");
    setShowForm(false);
    setFormName("");
    setFormMessage("");
    setFormCoupon("");
  };

  const handleSend = (campaign: Campaign) => {
    updateCampaign(campaign.id, {
      status: "SENDING",
      scheduledAt: new Date().toISOString(),
    });
    setTimeout(() => {
      const delivered = Math.floor(campaign.targetCount * 0.95);
      const read = Math.floor(delivered * 0.6);
      const failed = campaign.targetCount - delivered;
      updateCampaign(campaign.id, {
        status: "SENT",
        sentAt: new Date().toISOString(),
        deliveredCount: delivered,
        readCount: read,
        failedCount: failed,
      });
      showToast(`Kampanye "${campaign.name}" berhasil dikirim ke ${delivered} pelanggan`, "success");
    }, 1500);
    showToast("Mengirim kampanye...", "info");
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "DRAFT": return <Clock className="w-3 h-3 text-slate-400" />;
      case "SCHEDULED": return <Clock className="w-3 h-3 text-blue-400" />;
      case "SENDING": return <Send className="w-3 h-3 text-amber-400 animate-pulse" />;
      case "SENT": return <CheckCircle className="w-3 h-3 text-emerald-500" />;
      case "FAILED": return <XCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Manajemen Kampanye</h3>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus className="w-3 h-3" /> Kampanye Baru
          </button>
        </div>

        {showForm && (
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Kampanye</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Contoh: Promo Ramadhan" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Channel</label>
                <select value={formChannel} onChange={(e) => setFormChannel(e.target.value as CampaignChannel)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none cursor-pointer">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Target Segmentasi</label>
                <select value={formSegment} onChange={(e) => setFormSegment(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none cursor-pointer">
                  <option value="ALL">Semua ({getTargetCount("ALL")})</option>
                  <option value="VIP">VIP ({getTargetCount("VIP")})</option>
                  <option value="CORPORATE">Corporate ({getTargetCount("CORPORATE")})</option>
                  <option value="COLD">Pasif/冷 ({getTargetCount("COLD")})</option>
                  <option value="ACTIVE">Aktif ({getTargetCount("ACTIVE")})</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Pesan</label>
              <textarea rows={3} value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="Tulis pesan kampanye di sini..." className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kupon (Opsional)</label>
                <select value={formCoupon} onChange={(e) => setFormCoupon(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none cursor-pointer">
                  <option value="">Tanpa Kupon</option>
                  {vouchers.map((v) => (
                    <option key={v.id} value={v.code}>{v.code} - {v.type} ({v.value}{v.discountType === "PERCENTAGE" ? "%" : " Rp"})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <span className="text-[10px] text-slate-400 font-mono">
                  Estimasi biaya: ~Rp {(getTargetCount(formSegment) * 50).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg">Batal</button>
              <button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">Buat Kampanye</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stats</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenantCampaigns.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada kampanye</td></tr>
            ) : (
              tenantCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.couponCode ? `Kupon: ${c.couponCode}` : "Tanpa kupon"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-100 text-slate-700">{c.channel}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{c.targetCount} pelanggan</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      {statusIcon(c.status)}
                      <span className="text-[10px] font-bold">{c.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "SENT" ? (
                      <div className="text-[10px] font-mono space-y-0.5">
                        <p className="text-emerald-600">Terkirim: {c.deliveredCount}</p>
                        <p className="text-blue-600">Dibaca: {c.readCount}</p>
                        <p className="text-red-500">Gagal: {c.failedCount}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    {c.status === "DRAFT" && (
                      <button onClick={() => handleSend(c)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                        <Send className="w-3 h-3" /> Kirim
                      </button>
                    )}
                    <button onClick={() => setSelectedCampaign(c)} className="p-1 hover:bg-slate-100 rounded">
                      <Eye className="w-3 h-3 text-slate-500" />
                    </button>
                    <button onClick={() => {
                      deleteCampaign(c.id);
                      showToast("Kampanye dihapus", "success");
                    }} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedCampaign(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{selectedCampaign.name}</h3>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Channel:</span><span className="font-bold">{selectedCampaign.channel}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Target:</span><span className="font-bold">{selectedCampaign.targetCount} pelanggan</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="font-bold">{selectedCampaign.status}</span></div>
              {selectedCampaign.couponCode && <div className="flex justify-between"><span className="text-slate-500">Kupon:</span><span className="font-bold">{selectedCampaign.couponCode}</span></div>}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-mono text-slate-400 uppercase mb-1">Pesan</p>
                <p className="bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{selectedCampaign.message}</p>
              </div>
              {selectedCampaign.status === "SENT" && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-600">{selectedCampaign.deliveredCount}</p><p className="text-[10px] text-slate-400">Terkirim</p></div>
                  <div className="bg-blue-50 rounded-lg p-2"><p className="text-lg font-bold text-blue-600">{selectedCampaign.readCount}</p><p className="text-[10px] text-slate-400">Dibaca</p></div>
                  <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-600">{selectedCampaign.failedCount}</p><p className="text-[10px] text-slate-400">Gagal</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
