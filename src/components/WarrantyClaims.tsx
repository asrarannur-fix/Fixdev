import React, { useState, useMemo } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { ServiceStatus, ServiceTicket, Customer } from "../types";
import { usePrintConfig } from "../hooks/usePrintConfig";
import { printFrame } from "../utils/printJob";
import {
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Search,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Users,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
  User,
  PlusCircle,
  Download,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Activity,
  History,
  DollarSign,
} from "lucide-react";

export const WarrantyClaims: React.FC = () => {
  const {
    services,
    customers,
    claimWarranty,
    approveServiceEstimate,
    addLog,
    currentUser,
    currentTenantId,
    tenants,
  } = useSaaS();

  const { showToast } = useToast();
  const printConfig = usePrintConfig();

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === currentTenantId),
    [tenants, currentTenantId],
  );

  // Active sub-tabs inside Warranty & Returns Center
  // 1. "warranties" - Active Warranty List
  // 2. "claim-form" - Submit Claim / Complaint / Return
  // 3. "cust-history" - Customer Service History Look Up
  // 4. "tracker" - Interactive Ticket Tracking Simulator
  const [activeTab, setActiveTab] = useState<
    "warranties" | "claim-form" | "cust-history" | "tracker"
  >("warranties");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustId, setSelectedCustId] = useState<string>("");
  const [trackTicketNo, setTrackTicketNo] = useState("SRV-2026-001");
  const [trackedTicket, setTrackedTicket] = useState<ServiceTicket | null>(
    null,
  );
  const [trackingError, setTrackingError] = useState("");

  // Claim Form States
  const [claimTicketId, setClaimTicketId] = useState("");
  const [claimType, setClaimType] = useState<"REWORK" | "REFUND" | "COMPLAINT">(
    "REWORK",
  );
  const [claimComplaints, setClaimComplaints] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [isClaimSubmitted, setIsClaimSubmitted] = useState(false);

  // Digital Signature States for tracking approval
  const [signerName, setSignerName] = useState("");
  const [signerText, setSignerText] = useState("");

  // Filtered services for current tenant
  const tenantServices = useMemo(() => {
    return services.filter((s) => s.tenantId === currentTenantId);
  }, [services, currentTenantId]);

  // Active warranties list (Completed/Picked-up services with warrantyEndsAt in the future)
  const activeWarranties = useMemo(() => {
    return tenantServices
      .filter((s) => {
        if (
          s.status !== ServiceStatus.DIAMBIL &&
          s.status !== ServiceStatus.SELESAI
        )
          return false;
        
        let endsStr = s.warrantyEndsAt;
        if (!endsStr && s.status === ServiceStatus.SELESAI) {
          const baseDate = s.updatedAt ? new Date(s.updatedAt) : new Date();
          const duration = (s.warrantyMonths || 3) * 30 * 24 * 60 * 60 * 1000;
          endsStr = new Date(baseDate.getTime() + duration).toISOString().split("T")[0];
        }

        if (!endsStr) return false;
        const ends = new Date(endsStr).getTime();
        return ends > Date.now();
      })
      .map((s) => {
        if (!s.warrantyEndsAt && s.status === ServiceStatus.SELESAI) {
          const baseDate = s.updatedAt ? new Date(s.updatedAt) : new Date();
          const duration = (s.warrantyMonths || 3) * 30 * 24 * 60 * 60 * 1000;
          const endsStr = new Date(baseDate.getTime() + duration).toISOString().split("T")[0];
          return { ...s, warrantyEndsAt: endsStr };
        }
        return s;
      });
  }, [tenantServices]);

  // Filtered warranties by search
  const filteredWarranties = useMemo(() => {
    return activeWarranties.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const cust = customers.find((c) => c.id === w.customerId);
      const custName = cust?.name?.toLowerCase() || "";
      const devName = w.deviceName?.toLowerCase() || "";
      const tNo = w.ticketNo?.toLowerCase() || "";
      return custName.includes(q) || devName.includes(q) || tNo.includes(q);
    });
  }, [activeWarranties, searchQuery, customers]);

  // Customer selected service history
  const selectedCustomerInfo = useMemo(() => {
    return customers.find((c) => c.id === selectedCustId);
  }, [customers, selectedCustId]);

  const customerServiceHistory = useMemo(() => {
    if (!selectedCustId) return [];
    const cust = customers.find((c) => c.id === selectedCustId);
    if (!cust) return [];
    return tenantServices.filter((s) => {
      const ticketCust = customers.find((c) => c.id === s.customerId);
      if (!ticketCust) return false;
      return (
        ticketCust.phone === cust.phone ||
        ticketCust.name.toLowerCase() === cust.name.toLowerCase()
      );
    });
  }, [tenantServices, customers, selectedCustId]);

  const handlePrintWarranty = (ticket: ServiceTicket) => {
    let printIframe = document.getElementById(
      "hidden-print-iframe",
    ) as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "hidden-print-iframe";
      printIframe.style.position = "fixed";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      printIframe.style.opacity = "0";
      document.body.appendChild(printIframe);
    }
    const printDoc =
      printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!printDoc) return;

    const businessName = activeTenant?.name || "Repair Hub ERP";
    const customer = customers.find((c) => c.id === ticket.customerId && c.tenantId === currentTenantId);
    const escapeHtml = (value: string) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const safeBusinessName = escapeHtml(businessName.toUpperCase());
    const safeTicketNo = escapeHtml(ticket.ticketNo || "-");
    const safeCustomerName = escapeHtml(customer?.name || "Customer");
    const safeDeviceName = escapeHtml(ticket.deviceName || "-");
    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName: businessName,
      subtitle: "DIGITAL WARRANTY CARD",
    });
    const footerHtml = getPrintFooterHtml(
      printConfig,
      "Keep this card as proof of warranty.",
    );
    const termsHtml = getPrintTermsHtml(printConfig, "general");

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Warranty Card - ${safeTicketNo}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 15px; border: 2px solid #000; font-size: ${fontSizePx}px; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 10px 0; }
            .qr { width: 80px; height: 80px; margin: 10px auto; }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${headerHtml}
          </div>
          <div class="hr"></div>
          <p>Ticket No: ${safeTicketNo}</p>
          <p>Customer: ${safeCustomerName}</p>
          <p>Device: ${safeDeviceName}</p>
          <div class="hr"></div>
          <p>Warranty Ends: ${ticket.warrantyEndsAt?.split("T")[0]}</p>
          <p>Status: VALID / REGISTERED</p>
          <div class="text-center">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + "/?ticket=" + safeTicketNo)}" />
            <p style="font-size: 8px;">Scan to verify warranty status</p>
          </div>
          <div class="hr"></div>
          <div class="text-center">
            ${footerHtml}
            ${termsHtml}
          </div>
        </body>
      </html>
    `);
    printDoc.close();
    setTimeout(() => {
      if (printIframe.contentWindow) {
        printFrame(printIframe, printConfig, "Warranty Claim");
        addLog(
          "Print Warranty",
          `Mencetak kartu garansi digital untuk tiket ${ticket.ticketNo}.`,
          "SERVICE",
          "LOW",
        );
      }
    }, 500);
  };

  // Handle Search Ticket in Tracker Tab
  const handleTrackTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError("");
    const ticket = tenantServices.find(
      (s) =>
        s.ticketNo.toLowerCase().trim() === trackTicketNo.toLowerCase().trim(),
    );
    if (ticket) {
      setTrackedTicket(ticket);
    } else {
      setTrackedTicket(null);
      setTrackingError(
        "Nomor tiket tidak ditemukan. Pastikan format penulisan benar (cth: SRV-2026-001).",
      );
    }
  };

  // Quick Action: Pre-fill claim form from warranty list
  const handleInitiateClaim = (ticketId: string) => {
    setClaimTicketId(ticketId);
    setClaimType("REWORK");
    setClaimComplaints("");
    setIsClaimSubmitted(false);
    setActiveTab("claim-form");
  };

  // Submit Claim / Complaint / Return
  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTicketId) {
      showToast("Pilih tiket servis terlebih dahulu!", "error");
      return;
    }
    if (!claimComplaints.trim()) {
      showToast("Harap isi deskripsi keluhan!", "error");
      return;
    }

    const tkt = tenantServices.find(
      (s) => s.id === claimTicketId || s.ticketNo === claimTicketId,
    );
    if (!tkt) {
      showToast("Tiket tidak ditemukan!", "error");
      return;
    }

    // Call state updater from SaaSContext to register KLAIM_GARANSI
    claimWarranty(tkt.id, `[Kategori: ${claimType}] ${claimComplaints}`);

    // Track Audit Log
    addLog(
      "Warranty Claim / Complaint Created",
      `Keluhan Baru didaftarkan untuk unit ${tkt.deviceName} (${tkt.ticketNo}) - Tipe: ${claimType}`,
      "SERVICE",
      "HIGH",
    );

    setIsClaimSubmitted(true);
    showToast(
      `Berhasil mendaftarkan komplain/klaim garansi untuk tiket ${tkt.ticketNo}! Unit kini berstatus KLAIM_GARANSI.`,
      "success",
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="warranty-claims-root">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950/40 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">
              Pusat Garansi, Retur &amp; Komplain
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
            Modul purna-jual terintegrasi untuk mencatat klaim garansi rework
            teknisi, penanganan komplain pelanggan, pengembalian dana (retur),
            serta penelusuran riwayat servis komparatif.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("warranties")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "warranties"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            🛡️ Garansi Aktif
          </button>
          <button
            onClick={() => {
              setIsClaimSubmitted(false);
              setActiveTab("claim-form");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "claim-form"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            ⚠️ Klaim &amp; Retur
          </button>
          <button
            onClick={() => setActiveTab("cust-history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "cust-history"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            👥 Riwayat Customer
          </button>
          <button
            onClick={() => {
              setTrackedTicket(null);
              setTrackingError("");
              setActiveTab("tracker");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "tracker"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            🔍 Tracking Tiket
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "warranties" && (
        <div className="space-y-4" id="tab-warranties-view">
          {/* Filters card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama customer, tiket, atau tipe unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-xl text-xs outline-none focus:border-accent font-semibold"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Ditemukan{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                {filteredWarranties.length}
              </strong>{" "}
              unit bergaransi aktif.
            </div>
          </div>

          {/* Warranties Grid */}
          {filteredWarranties.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700 dark:text-zinc-400">
                Tidak Ada Garansi Aktif Terdeteksi
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Belum ada tiket servis berstatus 'DIAMBIL' atau 'SELESAI' yang
                memiliki sisa masa berlaku garansi pada pencarian ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWarranties.map((w) => {
                const endsDate = new Date(w.warrantyEndsAt || "");
                const remainingDays = Math.max(
                  0,
                  Math.ceil(
                    (endsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  ),
                );
                const warrantyMonthsTotal = w.warrantyMonths || 3;
                const totalWarrantyDays = warrantyMonthsTotal * 30;
                const percentLeft = Math.min(
                  100,
                  Math.max(0, (remainingDays / totalWarrantyDays) * 100),
                );

                return (
                  <div
                    key={w.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 rounded-2xl p-5 shadow-xs transition-all space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 font-mono text-[9px] font-black">
                          {w.ticketNo}
                        </span>
                        <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm mt-1.5 leading-snug">
                          {w.deviceName}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          SN: {w.deviceSerial || "Generik"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-[9.5px] font-black font-mono tracking-wider ${
                          remainingDays > 15
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                            : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"
                        }`}
                      >
                        🛡️ ACTIVE
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl text-xs space-y-1.5 border border-slate-100 dark:border-zinc-850">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Pelanggan:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                          {customers.find((c) => c.id === w.customerId)?.name ||
                            "Umum"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Tgl Ambil Unit:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold">
                          {w.updatedAt?.split("T")[0] || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Batas Garansi:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold">
                          {w.warrantyEndsAt?.split("T")[0] || "-"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for remaining days */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          Sisa Masa Garansi:
                        </span>
                        <span className="font-black text-slate-700 dark:text-zinc-300">
                          {remainingDays} Hari Lagi
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-850 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            remainingDays > 30
                              ? "bg-emerald-500"
                              : remainingDays > 10
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${percentLeft}%` }}
                        />
                      </div>
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono text-right leading-none">
                        Total: {warrantyMonthsTotal} Bulan
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
                      <button
                        onClick={() => handleInitiateClaim(w.id)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-blue-700 dark:text-blue-400 font-black text-xs py-2 rounded-xl border border-blue-200 dark:border-zinc-750 transition text-center cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Ajukan Komplain
                      </button>
                      <button
                        onClick={() => {
                          setTrackTicketNo(w.ticketNo);
                          setTrackedTicket(w);
                          setTrackingError("");
                          setActiveTab("tracker");
                        }}
                        className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 transition cursor-pointer"
                      >
                        Lacak Unit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "claim-form" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          id="tab-claims-view"
        >
          {/* Left Column: Form Submisi */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 dark:border-zinc-850 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-blue-500" /> Formulir
                Registrasi Klaim &amp; Komplain Baru
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Gunakan form ini jika customer kembali membawa unit yang
                bermasalah (rework), mengajukan pengembalian dana, atau
                menyampaikan keluhan fisik.
              </p>
            </div>

            {isClaimSubmitted ? (
              <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm">
                  Aduan Komplain Berhasil Didaftarkan!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto leading-relaxed">
                  Status unit telah diubah menjadi{" "}
                  <strong className="font-mono">KLAIM_GARANSI</strong>. Teknisi
                  dan operator terkait telah diinstruksikan melalui log
                  aktivitas sistem purna-jual.
                </p>
                <div className="pt-4 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setIsClaimSubmitted(false);
                      setClaimTicketId("");
                      setClaimComplaints("");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Daftarkan Komplain Lain
                  </button>
                  <button
                    onClick={() => setActiveTab("warranties")}
                    className="bg-white dark:bg-zinc-850 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-zinc-800 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Lihat Garansi Aktif
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs">
                {/* Select Ticket ID */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Pilih Tiket Servis Terkait
                  </label>
                  <select
                    value={claimTicketId}
                    onChange={(e) => setClaimTicketId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 font-semibold outline-none focus:border-accent"
                    required
                  >
                    <option value="">-- Pilih Tiket Servis --</option>
                    {tenantServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ticketNo} - {s.deviceName} (
                        {customers.find((c) => c.id === s.customerId)?.name ||
                          "Umum"}
                        ) - {s.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Claim Type Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Jenis Aduan Pelanggan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setClaimType("REWORK")}
                      className={`p-3 border rounded-xl text-center flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        claimType === "REWORK"
                          ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                          : "bg-white dark:bg-zinc-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <RefreshCw className="w-5 h-5" />
                      <div className="text-left text-center">
                        <p className="font-extrabold text-[10.5px]">
                          Klaim Garansi
                        </p>
                        <p className="text-[8.5px] opacity-75">
                          Rework / Servis Ulang
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClaimType("REFUND")}
                      className={`p-3 border rounded-xl text-center flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        claimType === "REFUND"
                          ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                          : "bg-white dark:bg-zinc-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <DollarSign className="w-5 h-5" />
                      <div className="text-left text-center">
                        <p className="font-extrabold text-[10.5px]">
                          Retur / Refund
                        </p>
                        <p className="text-[8.5px] opacity-75">
                          Ganti Rugi Dana / Part
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClaimType("COMPLAINT")}
                      className={`p-3 border rounded-xl text-center flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        claimType === "COMPLAINT"
                          ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                          : "bg-white dark:bg-zinc-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <div className="text-left text-center">
                        <p className="font-extrabold text-[10.5px]">
                          Komplain Fisik
                        </p>
                        <p className="text-[8.5px] opacity-75">
                          Keluhan Segel / Casing
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {claimType === "REFUND" && (
                  <div className="space-y-1 animate-fadeIn bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3.5 rounded-xl">
                    <label className="block text-[10px] font-mono text-rose-800 dark:text-rose-400 uppercase">
                      Estimasi Nominal Pengembalian Dana (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="cth: 150000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-rose-200 dark:border-rose-800/60 rounded-lg outline-none focus:border-rose-500 bg-white dark:bg-zinc-950 text-xs font-mono font-bold"
                    />
                    <p className="text-[9.5px] text-rose-600 dark:text-rose-400 mt-1">
                      Catatan: Pengembalian dana akan dicatatkan pada jurnal kas
                      akuntansi sebagai retur penjualan biaya operasional
                      purna-jual.
                    </p>
                  </div>
                )}

                {/* Complaints description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Kronologi Masalah &amp; Detail Keluhan Unit
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan secara lengkap gejala kerusakan kembali, segel robek, komplain casing lecet, atau rincian alasan refund sparepart..."
                    value={claimComplaints}
                    onChange={(e) => setClaimComplaints(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-accent leading-relaxed font-semibold"
                    required
                  />
                </div>

                {/* Operator info info */}
                <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 p-3.5 rounded-xl text-[10px] text-slate-500 space-y-1 font-mono">
                  <p>
                    • Operator Input:{" "}
                    <strong className="text-slate-700 dark:text-zinc-300">
                      {currentUser.name} ({currentUser.role})
                    </strong>
                  </p>
                  <p>
                    • Tindakan Otomatis: Menambahkan log kronologi timeline,
                    memposting event KLAIM_GARANSI, &amp; mengaktifkan radar
                    pengerjaan ulang teknisi.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl shadow-md shadow-blue-500/10 cursor-pointer transition text-center"
                >
                  Registrasikan Aduan &amp; Mulai Penanganan
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Ketentuan Garansi & Info Center */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3.5">
              <h4 className="font-extrabold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-500" /> Regulasi
                Garansi &amp; Purna Jual Toko
              </h4>
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="flex gap-2 items-start">
                  <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold font-mono text-[9px] mt-0.5">
                    01
                  </span>
                  <p>
                    <strong>Masa Berlaku</strong>: Garansi perbaikan standar
                    adalah 1-3 bulan untuk jasa servis &amp; sparepart
                    ic/solderan, dan 3-6 bulan untuk modul (baterai, keyboard,
                    lcd).
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold font-mono text-[9px] mt-0.5">
                    02
                  </span>
                  <p>
                    <strong>Segel Toko Utuh</strong>: Klaim garansi / retur
                    hanya valid jika stiker segel garansi fisik pada baut laptop
                    masih dalam keadaan utuh tanpa robekan / modifikasi mandiri.
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold font-mono text-[9px] mt-0.5">
                    03
                  </span>
                  <p>
                    <strong>Aspek Gugurnya Garansi</strong>: Unit terkena
                    tumpahan air/cairan (liquid damage), jatuh/retak karena
                    benturan keras pasca-diambil, atau tegangan listrik
                    overvoltage (petir).
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats of claims */}
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-zinc-900 dark:to-zinc-950 border border-blue-100 dark:border-zinc-800 rounded-2xl p-4.5 space-y-3">
              <h5 className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <Activity className="w-4 h-4 text-blue-500" /> Statistik Aduan
                Bulan Ini
              </h5>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white dark:bg-zinc-950 border border-blue-100/50 dark:border-zinc-800 p-2.5 rounded-xl">
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block uppercase">
                    Total Klaim
                  </span>
                  <strong className="text-lg font-black text-slate-800 dark:text-zinc-100">
                    {
                      tenantServices.filter(
                        (s) => s.status === ServiceStatus.KLAIM_GARANSI,
                      ).length
                    }{" "}
                    Unit
                  </strong>
                </div>
                <div className="bg-white dark:bg-zinc-950 border border-blue-100/50 dark:border-zinc-800 p-2.5 rounded-xl">
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block uppercase">
                    Rework Rate
                  </span>
                  <strong className="text-lg font-black text-blue-700 dark:text-blue-400">
                    {tenantServices.length
                      ? (
                          (tenantServices.filter(
                            (s) => s.status === ServiceStatus.KLAIM_GARANSI,
                          ).length /
                            tenantServices.length) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cust-history" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          id="tab-cust-history-view"
        >
          {/* Left Column: Select Customer */}
          <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Users className="w-4.5 h-4.5 text-blue-500" /> Pilih Database
                Customer
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Pilih nama customer untuk melacak riwayat lengkap unit, klaim
                garansi, total pengeluaran belanja servis &amp; pembelian part
                mereka.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                Pencarian Nama / No. HP
              </label>
              <select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.segment}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomerInfo && (
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 text-xs space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black">
                    {selectedCustomerInfo.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {selectedCustomerInfo.name}
                    </h5>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-bold">
                      {selectedCustomerInfo.segment}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-1 font-mono">
                    <span>Telepon:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {selectedCustomerInfo.phone}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-1">
                    <span>Email:</span>
                    <span className="text-slate-800 dark:text-zinc-200">
                      {selectedCustomerInfo.email || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-1">
                    <span>Total Belanja:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      Rp{" "}
                      {selectedCustomerInfo.totalSpend?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-1">
                    <span>Lokasi Alamat:</span>
                    <span className="text-slate-800 dark:text-zinc-200">
                      {selectedCustomerInfo.address || "Generik"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Customer Service History Tickets */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-5 h-5 text-blue-500" /> Riwayat Nota
                Servis &amp; Klaim Terkait
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Daftar lengkap unit reparasi fisik yang terasosiasi dengan data
                customer terpilih, disertai sisa status garansi.
              </p>
            </div>

            {!selectedCustId ? (
              <div className="py-16 text-center text-slate-400 italic text-xs">
                Silakan pilih pelanggan di menu sebelah kiri terlebih dahulu
                untuk menarik riwayat database servis mereka.
              </div>
            ) : customerServiceHistory.length === 0 ? (
              <div className="py-16 text-center text-slate-400 italic text-xs">
                Pelanggan ini belum memiliki catatan tiket servis di sistem
                tenant saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-mono text-[9px] uppercase">
                      <th className="px-3 py-2.5">No. Tiket &amp; Tgl</th>
                      <th className="px-3 py-2.5">
                        Nama Perangkat &amp; Serial
                      </th>
                      <th className="px-3 py-2.5">Status Akhir</th>
                      <th className="px-3 py-2.5 text-right">Biaya Servis</th>
                      <th className="px-3 py-2.5 text-center">
                        Status Garansi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {customerServiceHistory.map((s) => {
                      let endsStr = s.warrantyEndsAt;
                      if (!endsStr && s.status === ServiceStatus.SELESAI) {
                        const baseDate = s.updatedAt ? new Date(s.updatedAt) : new Date();
                        const duration = (s.warrantyMonths || 3) * 30 * 24 * 60 * 60 * 1000;
                        endsStr = new Date(baseDate.getTime() + duration).toISOString().split("T")[0];
                      }
                      const isWarrantyActive =
                        endsStr &&
                        new Date(endsStr).getTime() > Date.now();
                      const daysRemaining = endsStr
                        ? Math.max(
                            0,
                            Math.ceil(
                              (new Date(endsStr).getTime() -
                                Date.now()) /
                                (1000 * 60 * 60 * 24),
                            ),
                          )
                        : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3">
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-slate-100 text-slate-700 font-mono font-bold">
                              {s.ticketNo}
                            </span>
                            <span className="block text-[9.5px] text-slate-400 font-mono mt-1">
                              {s.createdAt?.split("T")[0] || "2026-07-01"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-extrabold text-slate-800 leading-tight">
                              {s.deviceName}
                            </p>
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">
                              SN: {s.deviceSerial || "Generik"}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-50 text-blue-800 font-extrabold uppercase dark:bg-blue-950/20 dark:text-blue-400">
                              {s.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                            Rp {s.estimatedCost?.toLocaleString() || "0"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isWarrantyActive ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[9px] block mx-auto w-max">
                                {daysRemaining} HARI
                              </span>
                            ) : s.warrantyEndsAt ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-400 font-mono text-[9px] block mx-auto w-max">
                                EXPIRED
                              </span>
                            ) : (
                              <span className="text-slate-300 italic block mx-auto w-max text-[9px]">
                                NON-WARRANTY
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tracker" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          id="tab-tracker-view"
        >
          {/* Tracker Search input */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Search className="w-4.5 h-4.5 text-blue-500" /> Simulasi Portal
                Lacak Pelanggan
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Masukkan kode tiket nota servis milik customer untuk memantau
                status diagnosa, menyetujui estimasi, atau mengunduh kartu
                garansi digital.
              </p>
            </div>

            <form onSubmit={handleTrackTicket} className="space-y-2">
              <label className="block text-[9.5px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                Input Nomor Tiket Nota
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="cth: SRV-2026-001"
                  value={trackTicketNo}
                  onChange={(e) => setTrackTicketNo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-accent font-semibold uppercase"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0"
                >
                  Lacak Unit
                </button>
              </div>
            </form>

            {trackingError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-2.5 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {trackingError}
              </p>
            )}

            {/* Quick access links */}
            <div className="space-y-2">
              <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 block uppercase">
                Pilih Contoh Tiket Nota Terdaftar
              </span>
              <div className="flex flex-wrap gap-2">
                {tenantServices.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setTrackTicketNo(s.ticketNo);
                      setTrackedTicket(s);
                      setTrackingError("");
                    }}
                    className="px-2.5 py-1 rounded bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-[10px] font-mono font-extrabold cursor-pointer transition"
                  >
                    {s.ticketNo} ({s.status.substring(0, 10)})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tracker Results Area */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
            {trackedTicket ? (
              <div className="space-y-5 animate-fadeIn">
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm leading-snug">
                      {trackedTicket.deviceName}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      Nota: {trackedTicket.ticketNo} | Serial:{" "}
                      {trackedTicket.deviceSerial || "Generik"}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 font-black font-mono text-[10px] rounded-full uppercase self-start sm:self-auto dark:bg-blue-950/20 dark:text-blue-400">
                    {trackedTicket.status}
                  </span>
                </div>

                {/* Estimate approval state digital signature */}
                {(trackedTicket.status === ServiceStatus.MENUGGU_APPROVAL ||
                  trackedTicket.status === ServiceStatus.ESTIMATE_PENDING) && (
                  <div className="p-4 bg-amber-50/80 dark:bg-zinc-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3.5 text-xs">
                    <h4 className="font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <FileText className="w-4 h-4 text-amber-600 animate-pulse" />{" "}
                      Surat Penawaran Resmi &amp; Persetujuan Digital
                    </h4>

                    <div className="bg-white dark:bg-zinc-900 p-3 border border-amber-100 dark:border-zinc-800 rounded-lg space-y-1.5 font-mono text-[10.5px] text-slate-700 dark:text-zinc-300">
                      <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-1">
                        <span>Estimasi Biaya:</span>
                        <span className="text-blue-700 font-bold dark:text-blue-400">
                          Rp{" "}
                          {trackedTicket.estimatedCost?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 text-slate-900 dark:text-zinc-100 text-xs">
                        <span>Sisa Tagihan Pelunasan:</span>
                        <span>
                          Rp{" "}
                          {(
                            (trackedTicket.estimatedCost || 0) -
                            (trackedTicket.downPayment || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Digital Signature Panel */}
                    <div className="space-y-2 bg-white dark:bg-zinc-900 p-3 border border-slate-200 dark:border-zinc-800 rounded-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Nama Lengkap Penyetuju
                          </label>
                          <input
                            type="text"
                            placeholder="cth: Budi Santoso"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-accent font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Inisial / Kode Ttd Digital
                          </label>
                          <input
                            type="text"
                            placeholder="cth: /budi_s/"
                            value={signerText}
                            onChange={(e) => setSignerText(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-accent font-mono italic text-blue-700 dark:text-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          approveServiceEstimate(
                            trackedTicket.id,
                            false,
                            signerName || "Customer",
                            signerText || "DITOLAK",
                          );
                          showToast(
                            "Penawaran ditolak secara resmi. Unit akan segera dipacking kembali.",
                            "info",
                          );
                          setTrackedTicket(null);
                          setSignerName("");
                          setSignerText("");
                        }}
                        className="flex-1 bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-semibold py-2 rounded-lg border border-rose-200 dark:border-rose-900/40 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Tolak Estimasi
                      </button>
                      <button
                        type="button"
                        disabled={!signerName.trim() || !signerText.trim()}
                        onClick={() => {
                          approveServiceEstimate(
                            trackedTicket.id,
                            true,
                            signerName,
                            signerText,
                          );
                          showToast(
                            `Terima kasih! Penawaran berhasil disetujui digital oleh ${signerName}. Teknisi kami akan memulai reparasi.`,
                            "success",
                          );
                          setTrackedTicket(null);
                          setSignerName("");
                          setSignerText("");
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Setujui &amp;
                        Kerjakan
                      </button>
                    </div>
                  </div>
                )}

                {/* Digital Warranty active detail */}
                {trackedTicket.status === ServiceStatus.DIAMBIL &&
                  trackedTicket.warrantyEndsAt && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs space-y-2.5">
                      <p className="font-black text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5 uppercase font-mono tracking-wide text-[10.5px]">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />{" "}
                        Kartu Garansi Digital Aktif!
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        Masa garansi perbaikan Anda berlaku{" "}
                        {trackedTicket.warrantyMonths} bulan, berakhir resmi
                        pada{" "}
                        <strong>
                          {trackedTicket.warrantyEndsAt?.split("T")[0]}
                        </strong>
                        .
                      </p>
                      <button
                        onClick={() => handlePrintWarranty(trackedTicket)}
                        className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-zinc-700 border border-emerald-200 dark:border-zinc-700 font-black px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Kartu Garansi
                        PDF
                      </button>
                    </div>
                  )}

                {/* Timeline display */}
                <div className="space-y-3.5">
                  <p className="font-bold text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Histori Perjalanan Unit
                  </p>
                  <div className="space-y-4 pl-3.5 border-l-2 border-slate-100 dark:border-zinc-800 text-xs">
                    {trackedTicket.timeline.map((event: any, evIdx: number) => (
                      <div key={evIdx} className="relative">
                        <div className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-900 ring-4 ring-blue-50/50 dark:ring-blue-950/20" />
                        <p className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase font-mono text-[10px] tracking-wide flex items-center gap-1">
                          {event.status}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {event.note}
                        </p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono block mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                Gunakan menu sebelah kiri untuk melacak data tiket. Detail
                timeline pengerjaan, estimasi biaya, dan jaminan kartu garansi
                akan terpampang lengkap di panel ini.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
