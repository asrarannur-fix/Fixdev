// PaymentPipeline — Superadmin manual payment verification UI
import React, { useState, useEffect } from "react";

interface ManualPayment {
  id: string;
  invoiceId: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  method: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  proofUrl?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export const PaymentPipeline: React.FC = () => {
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [rejectionModal, setRejectionModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/billing/manual-payments");
      const list = Array.isArray(data?.payments) ? data.payments : Array.isArray(data) ? data : [];
      setPayments(list);
    } catch {
      try {
        await apiFetch("/api/billing/manual-payment-config");
        setPayments([]);
      } catch {
        setError("Gagal memuat pembayaran manual");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleApprove = async (paymentId: string) => {
    try {
      await apiFetch(`/api/billing/manual-payments/${paymentId}/approve`, { method: "POST" });
      loadPayments();
    } catch {
      setError("Gagal menyetujui pembayaran");
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectionReason.trim()) {
      setError("Alasan penolakan wajib diisi");
      return;
    }
    try {
      await apiFetch(`/api/billing/manual-payments/${paymentId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectionReason }),
      });
      setRejectionModal(null);
      setRejectionReason("");
      loadPayments();
    } catch {
      setError("Gagal menolak pembayaran");
    }
  };

  const filtered = payments.filter((p) => (filterStatus ? p.status === filterStatus : true));

  const pendingCount = payments.filter((p) => p.status === "SUBMITTED").length;
  const approvedCount = payments.filter((p) => p.status === "APPROVED").length;
  const rejectedCount = payments.filter((p) => p.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400">Menunggu Verifikasi</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Disetujui</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-center">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{rejectedCount}</div>
          <div className="text-xs text-red-600 dark:text-red-400">Ditolak</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {[
          { key: "SUBMITTED", label: "Pending" },
          { key: "APPROVED", label: "Disetujui" },
          { key: "REJECTED", label: "Ditolak" },
          { key: "", label: "Semua" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filterStatus === tab.key
                ? "border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Tidak ada pembayaran ditemukan</div>
        ) : (
          filtered.map((payment) => (
            <div
              key={payment.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {payment.proofUrl && (
                  <img
                    src={payment.proofUrl}
                    alt="Bukti transfer"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{payment.id.slice(0, 16)}…</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-white mt-1">{payment.tenantName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Invoice: {payment.invoiceId.slice(0, 20)}… | {payment.method} | {new Date(payment.createdAt).toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-slate-800 dark:text-white">Rp {Number(payment.amount).toLocaleString("id-ID")}</div>
                <div className="flex gap-2 mt-2 justify-end">
                  {payment.status === "SUBMITTED" && (
                    <>
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => setRejectionModal(payment.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                      >
                        ❌ Tolak
                      </button>
                    </>
                  )}
                  {payment.status === "REJECTED" && payment.rejectionReason && (
                    <span className="text-xs text-slate-500 italic max-w-48 truncate block" title={payment.rejectionReason}>
                      Alasan: {payment.rejectionReason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectionModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Tolak Pembayaran</h3>
            <textarea
              placeholder="Alasan penolakan (wajib)…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectionModal(null); setRejectionReason(""); }}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={() => handleReject(rejectionModal)}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
