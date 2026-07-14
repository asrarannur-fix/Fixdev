import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { ShieldCheck, AlertCircle, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { ServiceStatus } from "../../types";

export const WarrantyClaims: React.FC = () => {
  const { services, claimWarranty, updateServiceTicket, currentTenantId } = useSaaS();
  const { showToast: toast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedTickets = useMemo(() => {
    return services.filter((t) =>
      t.tenantId === currentTenantId &&
      (t.status === ServiceStatus.SELESAI || t.status === ServiceStatus.SIAP_DIAMBIL || t.status === ServiceStatus.DIAMBIL)
    );
  }, [services, currentTenantId]);

  const warrantyClaimedTickets = useMemo(() => {
    return services.filter((t) => t.tenantId === currentTenantId && t.status === ServiceStatus.KLAIM_GARANSI);
  }, [services, currentTenantId]);

  const handleClaim = async () => {
    if (!selectedTicketId || !complaint.trim()) {
      toast("Pilih tiket dan isi keluhan garansi", "warning");
      return;
    }

    const ticket = completedTickets.find((t) => t.id === selectedTicketId);
    if (!ticket) {
      toast("Tiket garansi tidak valid untuk tenant ini", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await claimWarranty(selectedTicketId, complaint.trim());
      toast("Klaim garansi berhasil dibuat! Tiket masuk ke penanganan garansi.", "success");
      setSelectedTicketId("");
      setComplaint("");
    } catch {
      toast("Gagal mengajukan klaim garansi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveClaim = async (ticketId: string, approved: boolean) => {
    const confirmed = await showConfirm({
      title: "Konfirmasi Garansi",
      message: approved ? "Disetujui untuk garansi gratis/re-service?" : "Tolak klaim garansi?",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const ticket = services.find(t => t.id === ticketId && t.tenantId === currentTenantId);
      if (!ticket) {
        toast("Tiket garansi tidak valid untuk tenant ini", "error");
        return;
      }

      const newStatus = approved ? ServiceStatus.SEDANG_DIKERJAKAN : ServiceStatus.SELESAI;

      await updateServiceTicket(ticketId, {
        status: newStatus,
        timeline: [...(ticket.timeline || []), {
          status: newStatus,
          note: approved ? "Klaim garansi disetujui - pengerjaan ulang gratis" : "Klaim garansi ditolak - di luar masa garansi/syarat",
          timestamp: new Date().toISOString(),
          operator: "Teknisi / Admin",
        }],
      });

      toast(approved ? "Garansi disetujui! Perangkat dikerjakan ulang." : "Garansi ditolak.", approved ? "success" : "warning");
    } catch {
      toast("Gagal memperbarui status garansi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-amber-900 dark:text-amber-100 mb-2">🛡️ Manajemen Garansi Servis</h3>
        <p className="text-sm text-amber-700 dark:text-amber-300">Pengajuan dan verifikasi klaim garansi purna jual pelanggan</p>
      </div>

      {/* Input Form */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-black mb-2">Ajukan Klaim Garansi Baru</h4>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Pilih Perangkat / Tiket Selesai:</label>
          <select value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
            <option value="">-- Pilih Tiket --</option>
            {completedTickets.map((t) => (
              <option key={t.id} value={t.id}>#{t.ticketNo} - {t.deviceName} ({t.status})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Keluhan Garansi / Detail Masalah Ulang:</label>
          <textarea
            rows={3}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Jelaskan kendala yang terjadi kembali setelah perbaikan..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none"
          />
        </div>

        <button onClick={handleClaim} disabled={isSubmitting || !selectedTicketId}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-xl transition-all cursor-pointer">
          {isSubmitting ? "Memproses..." : "Ajukan Klaim Garansi"}
        </button>
      </div>

      {/* Active Warranty Claims List */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
        <h4 className="text-lg font-black mb-4">Daftar Klaim Garansi Aktif ({warrantyClaimedTickets.length})</h4>
        
        {warrantyClaimedTickets.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Tidak ada klaim garansi aktif yang perlu diproses.</p>
        ) : (
          <div className="space-y-4">
            {warrantyClaimedTickets.map((t) => (
              <div key={t.id} className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h5 className="font-black text-slate-800 dark:text-zinc-200">#{t.ticketNo} - {t.deviceName}</h5>
                  <p className="text-xs text-slate-500 mt-1">Keluhan: {t.customerComplaints}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleResolveClaim(t.id, true)} disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg cursor-pointer">
                    Setujui & Kerjakan Ulang
                  </button>
                  <button onClick={() => handleResolveClaim(t.id, false)} disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer">
                    Tolak Garansi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
