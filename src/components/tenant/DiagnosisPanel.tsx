import React, { useState, useMemo } from "react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { Wrench, AlertCircle, AlertTriangle, DollarSign, Clock, Package, CheckCircle, XCircle } from "lucide-react";
import { ServiceStatus } from "../../types";

export const DiagnosisPanel: React.FC = () => {
  const { services, updateServiceTicket, currentTenantId } = useSaaS();
  const { showToast: toast } = useToast();
  const { confirm: showPrompt } = useConfirm();

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("diagnosis");
  const [diagnosisData, setDiagnosisData] = useState<any>(null);

  const diagnosedTickets = useMemo(() => {
    return services.filter((t) =>
      t.tenantId === currentTenantId &&
      [ServiceStatus.DIAGNOSA, ServiceStatus.ESTIMATE_PENDING].includes(t.status)
    );
  }, [services, currentTenantId]);

  const generateDiagnosis = (ticket: any) => {
    const findings = [
      {
        id: `diag-${Date.now()}-1`,
        category: "BATTERY",
        itemName: "Baterai & Power Management",
        issueDescription: "Penurunan performa baterai, suhu panas saat charging",
        severity: "HIGH",
        estimatedRepairTime: 2,
        costEstimate: 350000,
        replacementParts: [
          { partId: "bat-001", name: "Baterai Li-ion 3000mAh", qty: 1, unitPrice: 300000 },
        ],
        technicianNotes: "Disarankan penggantian baterai dan pengecekan power management IC.",
        customerEstimateRequired: true,
      },
      {
        id: `diag-${Date.now()}-2`,
        category: "HARDWARE",
        itemName: "Port Koneksi & Fungsional",
        issueDescription: "Koneksi intermittent pada port utama",
        severity: "MEDIUM",
        estimatedRepairTime: 3,
        costEstimate: 450000,
        replacementParts: [
          { partId: "usb-c-001", name: "Kabel & Port USB-C", qty: 1, unitPrice: 200000 },
        ],
        technicianNotes: "Masalah pada kabel internal dan port charging",
        customerEstimateRequired: true,
      },
    ];

    const totalCost = findings.reduce((s: number, f: any) => s + f.costEstimate, 0);
    const laborHours = findings.reduce((s: number, f: any) => s + f.estimatedRepairTime, 0);

    return {
      id: `diag-${Date.now()}`,
      ticketId: ticket.id,
      deviceModel: ticket.deviceBrandModel || "Unknown",
      deviceCategory: ticket.deviceCategory || "Unknown",
      initialProblem: ticket.customerComplaints || "-",
      findings,
      totalEstimatedCost: totalCost,
      estimatedLaborHours: laborHours,
      technicianName: "Teknisi",
      diagnosisDate: new Date().toISOString(),
      nextSteps: "Penggantian komponen dan pengetesan ulang sistem",
      customerEstimateSent: false,
      estimateApproved: false,
    };
  };

  const handleStartDiagnosis = async () => {
    if (!selectedTicketId) { toast("Pilih tiket terlebih dahulu", "warning"); return; }
    setIsSubmitting(true);
    try {
      const ticket = services.find((t) => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;
      const d = generateDiagnosis(ticket);
      setDiagnosisData(d);
      await updateServiceTicket(selectedTicketId, {
        status: ServiceStatus.DIAGNOSA,
        techDiagnosis: d.findings.map((f: any) => f.itemName).join(", "),
        estimatedCost: d.totalEstimatedCost,
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.DIAGNOSA,
          note: `Estimasi: Rp ${d.totalEstimatedCost.toLocaleString("id-ID")}`,
          timestamp: new Date().toISOString(),
          operator: "Teknisi",
        }],
      });
      toast(`Diagnosis selesai! Rp ${d.totalEstimatedCost.toLocaleString("id-ID")}`, "success");
      setActiveTab("estimate");
    } catch { toast("Gagal diagnosis", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleSendEstimate = async () => {
    if (!diagnosisData || !selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const ticket = services.find((t) => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;
      await updateServiceTicket(selectedTicketId, {
        customerApprovalStatus: "PENDING",
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.ESTIMATE_PENDING,
          note: `Estimasi Rp ${diagnosisData.totalEstimatedCost.toLocaleString("id-ID")} dikirim`,
          timestamp: new Date().toISOString(),
          operator: "Teknisi",
        }],
      });
      setDiagnosisData((prev: any) => ({ ...prev, customerEstimateSent: true }));
      toast("Estimasi dikirim ke pelanggan!", "success");
      setActiveTab("approval");
    } catch { toast("Gagal kirim", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleApprove = async () => {
    if (!selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const ticket = services.find((t) => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;
      await updateServiceTicket(selectedTicketId, {
        status: ServiceStatus.SEDANG_DIKERJAKAN,
        customerApprovalStatus: "APPROVED",
        customerApprovalDate: new Date().toISOString(),
        estimateApproved: true,
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.SEDANG_DIKERJAKAN,
          note: "Estimasi disetujui pelanggan",
          timestamp: new Date().toISOString(),
          operator: "Pelanggan",
        }],
      });
      setDiagnosisData((prev: any) => ({ ...prev, estimateApproved: true }));
      toast("Estimasi disetujui! Service dimulai.", "success");
    } catch { toast("Gagal approve", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const ticket = services.find((t) => t.id === selectedTicketId && t.tenantId === currentTenantId);
      if (!ticket) return;
      await updateServiceTicket(selectedTicketId, {
        customerApprovalStatus: "REJECTED",
        timeline: [...(ticket.timeline || []), {
          status: ServiceStatus.APPROVAL_DITOLAK,
          note: "Estimasi ditolak pelanggan",
          timestamp: new Date().toISOString(),
          operator: "Pelanggan",
        }],
      });
      setDiagnosisData((prev: any) => ({ ...prev, estimateApproved: false }));
      toast("Estimasi ditolak", "warning");
    } catch { toast("Gagal", "error"); }
    finally { setIsSubmitting(false); }
  };

  const totalWithLabor = () => {
    if (!diagnosisData) return 0;
    return diagnosisData.totalEstimatedCost + diagnosisData.estimatedLaborHours * 75000;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-black text-blue-900 dark:text-blue-100 mb-2">Panel Diagnosis Teknisi</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">Analisis kerusakan, identifikasi masalah, estimasi biaya perbaikan</p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Pilih Tiket Servis:</label>
        <select value={selectedTicketId} onChange={(e) => { setSelectedTicketId(e.target.value); setDiagnosisData(null); }}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm">
          <option value="">-- Pilih --</option>
          {diagnosedTickets.map((t) => (
            <option key={t.id} value={t.id}>#{t.ticketNo} - {t.deviceName} ({t.status})</option>
          ))}
        </select>
      </div>

      {selectedTicketId && !diagnosisData && (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-black mb-2">Mulai Diagnosis Teknisi</h4>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">Klik tombol untuk memulai analisis perangkat</p>
          <button onClick={handleStartDiagnosis} disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
            {isSubmitting ? "Memproses..." : "Mulai Diagnosis"}
          </button>
        </div>
      )}

      {diagnosisData && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-1 flex">
            {[{ id: "diagnosis", label: "Hasil" }, { id: "estimate", label: "Estimasi" }, { id: "approval", label: "Approval" }].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${activeTab === t.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "diagnosis" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 dark:border-blue-800/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black">Temuan Diagnosis</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-full">{diagnosisData.findings.length} masalah</span>
                </div>
                {diagnosisData.findings.map((finding: any, i: number) => (
                  <div key={i} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-slate-100">
                          {finding.severity === "HIGH" || finding.severity === "CRITICAL"
                            ? <AlertTriangle className="w-4 h-4 text-orange-600" />
                            : <AlertCircle className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-black">{finding.itemName}</h5>
                          <p className="text-sm text-slate-600 mt-1">{finding.issueDescription}</p>
                        </div>
                        <span className="text-xs font-black text-orange-600">{finding.severity}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Biaya</p>
                        <p className="font-black text-emerald-600">Rp {finding.costEstimate.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Waktu</p>
                        <p className="font-black text-blue-600">{finding.estimatedRepairTime} jam</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "estimate" && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-6">
              <h4 className="text-lg font-black text-emerald-900 mb-4">Estimasi Biaya</h4>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span>Biaya Komponen:</span>
                  <span className="font-black">Rp {diagnosisData.totalEstimatedCost.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Tenaga Kerja ({diagnosisData.estimatedLaborHours} jam):</span>
                  <span className="font-black">Rp {(diagnosisData.estimatedLaborHours * 75000).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-emerald-200 bg-emerald-50 px-4 rounded-lg">
                  <span className="font-black">TOTAL:</span>
                  <span className="text-xl font-black text-emerald-600">Rp {totalWithLabor().toLocaleString("id-ID")}</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setActiveTab("diagnosis")} className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer font-medium">Kembali</button>
                <button onClick={handleSendEstimate} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">
                  {isSubmitting ? "Menyimpan..." : "Kirim ke Pelanggan"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "approval" && (
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 dark:border-purple-800/30 rounded-xl p-6">
              <h4 className="text-lg font-black text-purple-900 mb-4">Approval Pelanggan</h4>
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-950 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <span>Status Estimasi:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${diagnosisData.customerEstimateSent ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {diagnosisData.customerEstimateSent ? "Terkirim" : "Belum"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${diagnosisData.estimateApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {diagnosisData.estimateApproved ? "Disetujui" : "Menunggu"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleApprove} disabled={isSubmitting || !diagnosisData.customerEstimateSent}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">Setujui</button>
                  <button onClick={handleReject} disabled={isSubmitting || !diagnosisData.customerEstimateSent}
                    className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer">Tolak</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
