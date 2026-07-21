/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServiceApprovalPortal — Halaman publik yang dibuka pelanggan dari link WhatsApp.
 * Membaca ?ticket=...&token=... dari URL, menampilkan detail estimasi,
 * dan menyediakan tombol Setujui / Tolak yang memanggil backend portalApprove.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Smartphone,
  DollarSign,
  Package,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  FileText,
  User,
  CalendarDays,
  Loader2,
} from "lucide-react";

const VITE_API_URL = (import.meta as any).env?.VITE_API_URL || "";

interface TicketDetail {
  ticketNo: string;
  deviceName: string;
  deviceBrandModel: string;
  deviceCategory: string;
  status: string;
  customerApprovalStatus: string;
  customerNameObscured: string;
  estimatedCost: number;
  downPayment: number;
  estimatedCompletionDate: string;
  timeline: any[];
  lastUpdated: string;
}

type PageState = "loading" | "ready" | "submitting" | "success" | "error" | "expired";

export const ServiceApprovalPortal: React.FC = () => {
  const activeTenant: any = null;
  const [ticketId, setTicketId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [signerName, setSignerName] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("ticket") || "";
    const tok = params.get("token") || "";
    setTicketId(tid);
    setToken(tok);

    if (!tid || !tok) {
      setPageState("error");
      setErrorMsg("Link tidak valid. Parameter tiket atau token tidak ditemukan.");
      return;
    }

    // Fetch ticket details from public endpoint
    const fetchTicket = async () => {
      try {
        // We need ticketNo to call getPublicTicketStatus. The ?ticket param is the UUID.
        // We'll call a dedicated endpoint that returns ticket details by ID + token.
        const resp = await fetch(`${VITE_API_URL}/api/service-tracking/portal-detail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: tid, token: tok }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Gagal memuat data tiket");
        }
        const data = await resp.json();
        setTicket(data);
        setPageState("ready");
      } catch (e: any) {
        setPageState("error");
        setErrorMsg(e.message || "Gagal memuat data tiket. Periksa kembali link Anda.");
      }
    };
    fetchTicket();
  }, []);

  const handleApprove = useCallback(async () => {
    if (!ticketId || !token) return;
    setPageState("submitting");
    try {
      const resp = await fetch(`${VITE_API_URL}/api/service-tracking/portal-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          token,
          approved: true,
          signer: signerName || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Gagal memproses persetujuan");
      setResultMsg(data.message || "Estimasi disetujui!");
      setPageState("success");
    } catch (e: any) {
      setPageState("ready");
      setErrorMsg(e.message || "Terjadi kesalahan. Silakan coba lagi.");
    }
  }, [ticketId, token, signerName]);

  const handleReject = useCallback(async () => {
    if (!ticketId || !token) return;
    setPageState("submitting");
    try {
      const resp = await fetch(`${VITE_API_URL}/api/service-tracking/portal-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          token,
          approved: false,
          reason: rejectReason || undefined,
          signer: signerName || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Gagal memproses penolakan");
      setResultMsg(data.message || "Estimasi ditolak.");
      setPageState("success");
    } catch (e: any) {
      setPageState("ready");
      setErrorMsg(e.message || "Terjadi kesalahan. Silakan coba lagi.");
    }
  }, [ticketId, token, rejectReason, signerName]);

  // --- Loading State ---
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Memuat data tiket...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-zinc-100">Link Tidak Valid</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">{errorMsg}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Silakan hubungi toko/service center untuk mendapatkan link baru.
          </p>
        </div>
      </div>
    );
  }

  // --- Success State ---
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-200">Terima Kasih!</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">{resultMsg}</p>
          {ticket && (
            <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-4 text-left space-y-1 text-sm">
              <p className="text-xs text-slate-400">No. Tiket: <span className="font-bold text-slate-700 dark:text-zinc-300">{ticket.ticketNo}</span></p>
              <p className="text-xs text-slate-400">Perangkat: <span className="font-bold text-slate-700 dark:text-zinc-300">{ticket.deviceName}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Ready State (show ticket + approve/reject) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      {/* Header */}
      <header className="h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200/40 dark:border-zinc-800/60 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2 rounded-xl text-white shadow-md transition-all duration-300" style={{ 
            backgroundColor: activeTenant?.branding?.primaryColor || "var(--accent)"
          }}>
            <span className="font-bold text-sm">
              {activeTenant?.branding?.logoUrl ? (
                <img src={activeTenant.branding.logoUrl} alt="Logo" className="h-6 w-6" onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }} />
              ) : (
                <span className="hidden">KM</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-sm font-black tracking-tight transition-all duration-300" style={{ 
              color: activeTenant?.branding?.primaryColor || "#1e293b"
            }}>
              {activeTenant?.branding?.whiteLabelEnabled && activeTenant?.branding?.customDomain
                ? activeTenant.branding.customDomain
                : activeTenant?.name || "KM"
              }
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Persetujuan Estimasi</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
        {/* Ticket Info Card */}
        {ticket && (
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-mono">#{ticket.ticketNo}</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-zinc-100">{ticket.deviceName}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-200 dark:border-amber-800/30">
                MENUNGGU PERSETUJUAN
              </span>
            </div>

            {ticket.deviceBrandModel && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                <Smartphone className="w-4 h-4" />
                <span>{ticket.deviceBrandModel}</span>
              </div>
            )}

            {/* Estimated Cost */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">Estimasi Biaya</span>
                </div>
                <span className="text-xl font-black text-emerald-600">
                  Rp {(ticket.estimatedCost || 0).toLocaleString("id-ID")}
                </span>
              </div>
              {ticket.downPayment > 0 && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/20">
                  <span className="text-xs text-slate-500">Uang Muka (DP)</span>
                  <span className="text-sm font-bold text-blue-600">Rp {ticket.downPayment.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            {ticket.timeline && ticket.timeline.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Riwayat</p>
                <div className="space-y-1.5">
                  {ticket.timeline.slice(-3).map((ev: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">{ev.status}</span>
                        <p className="text-slate-500">{ev.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Completion */}
            {ticket.estimatedCompletionDate && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Estimasi selesai: {new Date(ticket.estimatedCompletionDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
          </div>
        )}

        {/* Signer Name Input */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5">
            Nama Anda (untuk tanda tangan digital)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
          {!showRejectForm ? (
            <>
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">
                Setujui estimasi biaya di atas untuk memulai perbaikan?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={pageState === "submitting"}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Tolak
                </button>
                <button
                  onClick={handleApprove}
                  disabled={pageState === "submitting"}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {pageState === "submitting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-4 h-4" />
                  )}
                  Setujui
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-rose-600">Alasan penolakan (opsional):</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Contoh: Biaya terlalu mahal, ingin konsultasi dulu..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                  disabled={pageState === "submitting"}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 disabled:opacity-50 text-slate-700 dark:text-zinc-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={pageState === "submitting"}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {pageState === "submitting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Konfirmasi Tolak
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-center text-slate-400 dark:text-zinc-600">
          Data Anda aman dan hanya digunakan untuk proses persetujuan estimasi servis.
        </p>
      </main>
    </div>
  );
};