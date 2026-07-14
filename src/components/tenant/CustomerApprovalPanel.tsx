import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { 
  Wrench, AlertCircle, AlertTriangle, DollarSign, Clock, Package, 
  CheckCircle, XCircle, MessageSquare, ShieldCheck, ThumbsUp, ThumbsDown
} from "lucide-react";
import { ServiceStatus } from "../../types";

export const CustomerApprovalPanel: React.FC = () => {
  const { services, approveServiceEstimate, currentTenantId } = useSaaS();
  const { showToast: toast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingEstimates = useMemo(() => {
    return services.filter((ticket) =>
      ticket.tenantId === currentTenantId &&
      ticket.status === ServiceStatus.ESTIMATE_PENDING &&
      ticket.customerApprovalStatus === "PENDING"
    );
  }, [services, currentTenantId]);

  const handleApproveEstimate = async () => {
    if (!selectedEstimateId) {
      toast("Pilih estimasi yang akan disetujui", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Konfirmasi Persetujuan",
      message: "Setujui estimasi biaya ini?",
    });

    if (!confirmed) return;

    const estimate = pendingEstimates.find((ticket) => ticket.id === selectedEstimateId);
    if (!estimate) {
      toast("Estimasi tidak valid untuk tenant ini", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      approveServiceEstimate(selectedEstimateId, true);
      toast("Estimasi biaya disetujui! Melanjutkan ke proses penandatanganan digital", "success");
      setSelectedEstimateId("");
    } catch (err) {
      toast("Gagal menyetujui estimasi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectEstimate = async () => {
    if (!selectedEstimateId) {
      toast("Pilih estimasi yang akan ditolak", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Konfirmasi Penolakan",
      message: "Tolak estimasi biaya ini?",
    });

    if (!confirmed) return;

    const estimate = pendingEstimates.find((ticket) => ticket.id === selectedEstimateId);
    if (!estimate) {
      toast("Estimasi tidak valid untuk tenant ini", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      approveServiceEstimate(selectedEstimateId, false);
      toast("Estimasi biaya ditolak. Dikembalikan ke teknisi untuk revisi.", "warning");
      setSelectedEstimateId("");
    } catch (err) {
      toast("Gagal menolak estimasi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-purple-900 dark:text-purple-100 mb-2">
          Panel Persetujuan Pelanggan
        </h3>
        <p className="text-sm text-purple-700 dark:text-purple-300">
          Setujui atau tolak estimasi biaya yang diajukan oleh teknisi untuk setiap tiket servis
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
          Pilih Tiket untuk Approval:
        </label>
        <select
          value={selectedEstimateId}
          onChange={(e) => setSelectedEstimateId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
        >
          <option value="">-- Pilih Tiket --</option>
          {pendingEstimates.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>
              #{ticket.ticketNo} - {ticket.deviceName} ({ticket.estimatedCost?.toLocaleString("id-ID") || "0"})
            </option>
          ))}
        </select>
      </div>

      {selectedEstimateId && (
        <div className="bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-950 dark:to-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6">
          <h4 className="text-lg font-black text-slate-800 dark:text-zinc-200 mb-4">
            🎯 Hasil Keputusan
          </h4>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600 dark:text-zinc-400">Status:</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full">
                MENUNGGU_APPROVAL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-zinc-400">Customer Acknowledged:</span>
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full">
                BELUM
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRejectEstimate}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl transition-all cursor-pointer"
            >
              {isSubmitting ? "Memproses..." : "Tolak & Kembalikan"}
            </button>
            <button
              onClick={handleApproveEstimate}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-all cursor-pointer"
            >
              {isSubmitting ? "Memproses..." : "Setujui & Kirim ke Pelanggan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
