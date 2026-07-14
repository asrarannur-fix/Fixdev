import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { Wrench, AlertCircle, AlertTriangle, DollarSign, Clock, Package, CheckCircle } from "lucide-react";
import { ServiceStatus } from "../../types";

export const CostEstimator: React.FC = () => {
  const { services, updateServiceTicket, currentTenantId } = useSaaS();
  const { showToast: toast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "approval">("summary");
  const [costEstimateData, setCostEstimateData] = useState<any>(null);

  const availableTickets = useMemo(() => {
    return services.filter(t => 
      t.tenantId === currentTenantId &&
      t.status === ServiceStatus.DIAGNOSA && !t.estimateApproved
    );
  }, [services, currentTenantId]);

  const handleCreateEstimate = async () => {
    if (!selectedTicketId) {
      toast("Pilih tiket servis yang sudah didiagnosis", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = services.find(t => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;

      const basePartsCost = Math.floor((ticket.estimatedCost || 200000) * 0.7);
      const laborHours = 3;
      const laborCost = laborHours * 75000;
      const totalEstimatedCost = basePartsCost + laborCost;
      const totalAmountWithTax = Math.ceil(totalEstimatedCost * 1.11);

      const estimateData = {
        id: `est-${Date.now()}`,
        ticketId: ticket.id,
        totalEstimatedCost,
        laborHours,
        partsCost: basePartsCost,
        laborCost,
        technicianName: "Teknisi",
        estimateDate: new Date().toISOString(),
        estimateSentToCustomer: false,
        customerAcknowledged: false,
        totalAmountWithTax,
      };

      setCostEstimateData(estimateData);

      await updateServiceTicket(selectedTicketId, {
        status: ServiceStatus.ESTIMATE_PENDING,
        estimatedCost: totalEstimatedCost,
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.ESTIMATE_PENDING,
          note: `Estimasi biaya dibuat: Rp ${totalEstimatedCost.toLocaleString('id-ID')}`,
          timestamp: new Date().toISOString(),
          operator: "Teknisi",
        }],
      });

      toast(`Estimasi biaya berhasil dibuat! Rp ${totalEstimatedCost.toLocaleString('id-ID')}`, "success");
      setActiveTab("summary");
    } catch {
      toast("Gagal membuat estimasi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToCustomer = async () => {
    if (!costEstimateData || !selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const ticket = services.find(t => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;

      await updateServiceTicket(selectedTicketId, {
        customerApprovalStatus: "PENDING",
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.ESTIMATE_PENDING,
          note: `Estimasi dikirim: Rp ${costEstimateData.totalEstimatedCost.toLocaleString('id-ID')}`,
          timestamp: new Date().toISOString(),
          operator: "Teknisi",
        }],
      });

      setCostEstimateData((prev: any) => ({ ...prev, estimateSentToCustomer: true }));
      toast("Estimasi berhasil dikirim ke pelanggan!", "success");
      setActiveTab("approval");
    } catch {
      toast("Gagal mengirim estimasi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerApproval = async (approved: boolean) => {
    if (!costEstimateData || !selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const ticket = services.find(t => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;

      const newStatus = approved ? ServiceStatus.SEDANG_DIKERJAKAN : ServiceStatus.APPROVAL_DITOLAK;

      await updateServiceTicket(selectedTicketId, {
        status: newStatus,
        customerApprovalStatus: approved ? "APPROVED" : "REJECTED",
        estimateApproved: approved,
        timeline: [...(ticket.timeline || []), {
          status: newStatus,
          note: approved ? "Pelanggan menyetujui estimasi" : "Pelanggan menolak estimasi",
          timestamp: new Date().toISOString(),
          operator: "Pelanggan",
        }],
      });

      setCostEstimateData((prev: any) => ({ ...prev, customerAcknowledged: approved }));
      toast(approved ? "Estimasi disetujui! Service dimulai." : "Estimasi ditolak pelanggan.", approved ? "success" : "warning");
    } catch {
      toast("Gagal memproses persetujuan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100 mb-2">Estimasi Biaya Servis</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Buat estimasi biaya profesional berdasarkan hasil diagnosis</p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Pilih Tiket Servis:</label>
        <select value={selectedTicketId} onChange={(e) => { setSelectedTicketId(e.target.value); setCostEstimateData(null); }}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
          <option value="">-- Pilih --</option>
          {availableTickets.map((t) => (
            <option key={t.id} value={t.id}>#{t.ticketNo} - {t.deviceName} ({t.status})</option>
          ))}
        </select>
      </div>

      {selectedTicketId && !costEstimateData && (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 text-center">
          <Wrench className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h4 className="text-lg font-black mb-2">Buat Estimasi Biaya</h4>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">Klik tombol di bawah untuk menghitung estimasi biaya</p>
          <button onClick={handleCreateEstimate} disabled={isSubmitting}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
            {isSubmitting ? "Memproses..." : "Hitung Estimasi Biaya"}
          </button>
        </div>
      )}

      {costEstimateData && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-1 flex">
            {[{ id: "summary", label: "Ringkasan" }, { id: "approval", label: "Persetujuan" }].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${activeTab === t.id ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "summary" && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6">
              <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-200 mb-4">Ringkasan Estimasi Biaya</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Biaya Parts:</p>
                  <p className="font-black text-emerald-600">Rp {costEstimateData.partsCost.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Tenaga Kerja ({costEstimateData.laborHours} jam):</p>
                  <p className="font-black text-blue-600">Rp {costEstimateData.laborCost.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-amber-600 mb-1">TOTAL + Pajak (11%):</p>
                  <p className="font-black text-amber-700">Rp {costEstimateData.totalAmountWithTax.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSendToCustomer} disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
                  {isSubmitting ? "Mengirim..." : "Kirim ke Pelanggan"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "approval" && (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
              <h4 className="text-lg font-black mb-4">Workflow Persetujuan Pelanggan</h4>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-zinc-950 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm text-slate-600">Status Dikirim:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${costEstimateData.estimateSentToCustomer ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {costEstimateData.estimateSentToCustomer ? "Sudah Dikirim" : "Belum"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Persetujuan:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${costEstimateData.customerAcknowledged ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {costEstimateData.customerAcknowledged ? "Disetujui" : "Menunggu"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleCustomerApproval(true)} disabled={isSubmitting || !costEstimateData.estimateSentToCustomer}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
                    Pelanggan Setuju
                  </button>
                  <button onClick={() => handleCustomerApproval(false)} disabled={isSubmitting || !costEstimateData.estimateSentToCustomer}
                    className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
                    Pelanggan Tolak
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
