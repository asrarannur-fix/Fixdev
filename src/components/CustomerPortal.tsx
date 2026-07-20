/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import {
  ServiceStatus,
  CustomerSegment,
  PaymentMethod,
  Customer,
} from "../types";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "motion/react";
import {
  Wrench,
  Search,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle,
  FileText,
  ShieldCheck,
  ArrowRight,
  Clock,
  ThumbsUp,
  ThumbsDown,
  QrCode,
  UploadCloud,
  Camera,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  Volume2,
  User,
  Building,
  Download,
  LogOut,
  UserCheck,
  Check,
  Plus,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";

interface PortalToast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface CustomerPortalProps {
  onBackToDashboard?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  onBackToDashboard,
}) => {
  const {
    services,
    approveServiceEstimate,
    currentTenantId,
    tenants,
    isAuthenticated,
    currentUser,
    customers,
    updateCustomer,
    claimWarranty,
    addLog,
    transactions,
  } = useSaaS();

  // Selected customer for full self-service simulation
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("guest");

  // Navigation tabs inside portal
  const [activePortalTab, setActivePortalTab] = useState<
    "track" | "warranty" | "invoices" | "profile" | "chat"
  >("track");

  // Local ticket tracking states
  const [ticketNo, setTicketNo] = useState("TKT/2606/0001");
  const [searchedTicket, setSearchedTicket] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerText, setSignerText] = useState("");

  // Tracking methods state
  const [activeTrackMethod, setActiveTrackMethod] = useState<
    "type" | "upload" | "scan"
  >("type");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isScanningSim, setIsScanningSim] = useState(false);
  const [simScanStatus, setSimScanStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");

  // Portal Toast notifications state
  const [toasts, setToasts] = useState<PortalToast[]>([]);

  // Profile Edit fields
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileSegment, setProfileSegment] = useState<CustomerSegment>(
    CustomerSegment.PERSONAL,
  );
  const [profileCompanyName, setProfileCompanyName] = useState("");
  const [profileNpwp, setProfileNpwp] = useState("");

  // Warranty Claims form states
  const [selectedWarrantyTicketId, setSelectedWarrantyTicketId] = useState("");
  const [warrantyComplaint, setWarrantyComplaint] = useState("");
  const [isSubmittingWarranty, setIsSubmittingWarranty] = useState(false);

  // Invoice display modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Support Live Chat states
  const [selectedChatTopic, setSelectedChatTopic] = useState<string>("general");
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      sender: string;
      role: "user" | "model";
      text: string;
      timestamp: string;
    }>
  >([]);
  const [messageInput, setMessageInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Resolve active tenant details
  const tenantId = searchedTicket?.tenantId || currentTenantId || "default";
  const activeTenant = tenants.find((t) => t.id === tenantId);
  const portalHelpTitle =
    activeTenant?.branding?.portalHelpTitle || "Pusat Bantuan & S&K";
  const portalContactText =
    activeTenant?.branding?.portalContactText ||
    "Berapa lama estimasi servis?\nUmumnya perbaikan ringan 1-2 hari. Hardware berat 3-7 hari kerja tergantung ketersediaan part.\n\nApakah ada garansi perbaikan?\nYa! Semua servis kami dilengkapi garansi (Syarat & Ketentuan berlaku).\n\nBagaimana metode pembayarannya?\nKami menerima Cash, Transfer Bank, QRIS, maupun Kartu Debit/Kredit.";

  // Filter scoped data based on active tenant
  const tenantCustomers = useMemo(() => {
    return customers.filter((c) => c.tenantId === tenantId);
  }, [customers, tenantId]);

  const activeCustomer = useMemo(() => {
    if (isAuthenticated && currentUser && currentUser.role === "CUSTOMER") {
      const match = tenantCustomers.find(
        (c) =>
          c.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
          c.id === currentUser.id
      );
      if (match) return match;
    }
    return tenantCustomers.find((c) => c.id === selectedCustomerId) || null;
  }, [tenantCustomers, selectedCustomerId, isAuthenticated, currentUser]);

  const customerTickets = useMemo(() => {
    if (!activeCustomer) return [];
    return services.filter((s) => s.customerId === activeCustomer.id && s.tenantId === activeCustomer.tenantId);
  }, [services, activeCustomer]);

  const customerTransactions = useMemo(() => {
    if (!activeCustomer) return [];
    return transactions.filter((t) => t.customerId === activeCustomer.id && t.tenantId === activeCustomer.tenantId);
  }, [transactions, activeCustomer]);

  // Load profile values when active customer changes
  useEffect(() => {
    if (activeCustomer) {
      setProfileName(activeCustomer.name || "");
      setProfileEmail(activeCustomer.email || "");
      setProfilePhone(activeCustomer.phone || "");
      setProfileAddress(activeCustomer.address || "");
      setProfileSegment(activeCustomer.segment || CustomerSegment.PERSONAL);
      setProfileCompanyName(activeCustomer.companyName || "");
      setProfileNpwp(activeCustomer.npwp || "");

      // Default the chat messages greeting
      setChatMessages([
        {
          id: "welcome-1",
          sender: "System",
          role: "model",
          text: `Halo Kak ${activeCustomer.name}! Selamat datang di Live Chat Dukungan Teknik kami. Saya siap membantu Anda terkait unit pengerjaan servis atau pertanyaan umum. Silakan tulis keluhan Anda di bawah ini!`,
          timestamp: new Date().toISOString(),
        },
      ]);
      // Auto-select first ticket if available
      const matchingTickets = services.filter((s) => s.customerId === activeCustomer.id && s.tenantId === activeCustomer.tenantId);
      if (matchingTickets.length > 0 && !searchedTicket) {
        setTicketNo(matchingTickets[0].ticketNo);
        setSearchedTicket(matchingTickets[0]);
      }
    } else {
      setChatMessages([
        {
          id: "welcome-guest",
          sender: "System",
          role: "model",
          text: "Halo! Selamat datang di Live Chat Dukungan. Silakan identifikasi diri Anda atau gunakan pelacakan nota di tab sebelah untuk bantuan spesifik pengerjaan.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [activeCustomer, services]);

  // Scroll support chat to bottom when message arrives
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Helper to trigger custom portal toasts
  const triggerToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "success",
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sound generator helper to mimic a physical barcode scanner beep
  const playBeep = (frequency: number, duration: number) => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignored if browser security blocks automated audio contexts
    }
  };

  // Perform search core logic
  const performSearch = async (targetTicketNo: string) => {
    setErrorMsg("");
    const trimmed = targetTicketNo.trim();
    if (!trimmed) {
      setErrorMsg("Nomor tiket tidak boleh kosong.");
      triggerToast("Masukkan nomor tiket yang valid.", "warning");
      return;
    }

    const foundLocal = services.find(
      (s) => s.ticketNo.toLowerCase() === trimmed.toLowerCase(),
    );

    if (foundLocal) {
      setSearchedTicket(foundLocal);
      triggerToast(
        `🎉 Sukses melacak tiket #${foundLocal.ticketNo}!`,
        "success",
      );
      playBeep(880, 0.12);

      // Log tracking audit action
      addLog(
        "Service Tracked",
        `Pelanggan melacak tiket #${foundLocal.ticketNo} (${foundLocal.deviceName}) via Customer Portal.`,
        "SERVICE",
        "LOW",
      );
      return;
    }

    // Fallback search online on server
    try {
      const res = await fetch(`/api/service-tracking/status/${trimmed}`);
      if (!res.ok) throw new Error("Ticket not found on server");
      const data = await res.json();
      setSearchedTicket({
        id: data.id || "temp-srv-id",
        ticketNo: data.ticketNo,
        deviceName: data.deviceName,
        deviceBrandModel: data.deviceBrandModel,
        status: data.status,
        customerApprovalStatus: data.customerApprovalStatus,
        estimatedCost: data.estimatedCost,
        downPayment: data.downPayment,
        timeline: data.timeline,
        provisionalSignatureName: data.customerNameObscured,
        warrantyMonths: data.warrantyMonths || 3,
        warrantyEndsAt: data.warrantyEndsAt,
      });
      triggerToast(
        `🎉 Berhasil melacak tiket online #${data.ticketNo}!`,
        "success",
      );
      playBeep(880, 0.12);

      addLog(
        "Service Tracked Online",
        `Melacak online tiket #${data.ticketNo} via API.`,
        "SERVICE",
        "LOW",
      );
    } catch (err) {
      setSearchedTicket(null);
      setErrorMsg(
        `Maaf, tiket "${trimmed}" tidak ditemukan di database tenant Anda.`,
      );
      triggerToast(
        `❌ Pelacakan gagal: Tiket "${trimmed}" tidak terdaftar!`,
        "error",
      );
      playBeep(180, 0.35); // Low buzzer for error
    }
  };

  // Auto search ticket from URL param on load/mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get("ticket");
    const subParam = params.get("sub");
    if (ticketParam && subParam !== "warranty-claim") {
      setTicketNo(ticketParam);
      performSearch(ticketParam);
    }
  }, [services, currentTenantId]);

  const handleSearchTicket = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(ticketNo);
  };

  // Handle actual QR Image upload decoding via jsQR library
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    decodeQrImage(file);
  };

  const decodeQrImage = (file: File) => {
    setUploadError("");
    triggerToast("Memproses dekode gambar QR Code...", "info");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setUploadError("Gagal memuat canvas dekoder internal.");
          triggerToast("Gagal menginisialisasi modul dekoder gambar.", "error");
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            const rawText = code.data;
            let decodedTicketNo = "";

            // Attempt to parse out ticket parameter from URL
            try {
              const urlObj = new URL(rawText);
              const ticketParam = urlObj.searchParams.get("ticket");
              if (ticketParam) {
                decodedTicketNo = ticketParam;
              }
            } catch (err) {
              const match = rawText.match(/[?&]ticket=([^&]+)/i);
              if (match) {
                decodedTicketNo = match[1];
              } else if (
                rawText.toUpperCase().startsWith("SRV-") ||
                rawText.includes("-") ||
                rawText.includes("/")
              ) {
                decodedTicketNo = rawText;
              }
            }

            if (decodedTicketNo) {
              setTicketNo(decodedTicketNo);
              triggerToast(
                `🎉 Sukses Dekode QR! Menemukan Tiket: ${decodedTicketNo}`,
                "success",
              );
              performSearch(decodedTicketNo);
            } else {
              setUploadError(
                `QR Code berhasil dibaca: "${rawText}", namun tidak memuat parameter tiket yang valid.`,
              );
              triggerToast(
                "❌ QR Code tidak berisi info tiket pendaftaran.",
                "warning",
              );
              playBeep(220, 0.3);
            }
          } else {
            setUploadError(
              "QR Code tidak terdeteksi dalam berkas gambar ini. Pastikan gambar memiliki pencahayaan tinggi, tidak blur, dan posisi kode QR tegak.",
            );
            triggerToast("❌ Gagal Dekode: QR Code tidak terdeteksi.", "error");
            playBeep(220, 0.3);
          }
        } catch (decErr: any) {
          console.error("Decoder runtime error:", decErr);
          setUploadError(
            "Gagal membaca struktur piksel gambar. Pastikan file adalah gambar JPG/PNG valid.",
          );
          triggerToast("❌ Kesalahan format berkas gambar.", "error");
          playBeep(220, 0.3);
        }
      };
      img.onerror = () => {
        setUploadError("Berkas gambar rusak atau tidak dapat dimuat.");
        triggerToast("❌ Gagal memuat file gambar.", "error");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Simulates camera stream scan flow with successful and error paths
  const triggerSimulatedScan = (
    mode: "success" | "error_blur" | "error_invalid",
  ) => {
    if (isScanningSim) return;

    setIsScanningSim(true);
    setSimScanStatus("scanning");
    triggerToast("Menghubungkan kamera & memfokuskan sensor...", "info");

    setTimeout(() => {
      setIsScanningSim(false);
      if (mode === "success") {
        setSimScanStatus("success");
        const targetTicket =
          services.length > 0 ? services[0].ticketNo : "TKT/2606/0001";
        setTicketNo(targetTicket);
        triggerToast(
          `🎉 Kamera memindai QR Code! Mendekode Tiket: #${targetTicket}`,
          "success",
        );
        performSearch(targetTicket);
      } else if (mode === "error_blur") {
        setSimScanStatus("error");
        triggerToast(
          "❌ Scan Gagal: Kamera tidak fokus atau gambar terhalang bayangan.",
          "error",
        );
        playBeep(180, 0.35);
      } else {
        setSimScanStatus("error");
        setTicketNo("TKT-INVALID-CODE-XYZ");
        triggerToast(
          "❌ Dekode Berhasil: Kode QR terbaca namun tiket tidak terdaftar di sistem.",
          "error",
        );
        performSearch("TKT-INVALID-CODE-XYZ");
      }
    }, 1500);
  };

  // Handle Customer Profile persistence
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const cleanEmail = profileEmail.trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes("@")) {
      triggerToast("Format email tidak valid.", "error");
      return;
    }

    const updatedData: Partial<Customer> = {
      name: profileName.trim(),
      email: cleanEmail,
      phone: profilePhone.trim(),
      address: profileAddress.trim(),
      segment: profileSegment,
      companyName:
        profileSegment === CustomerSegment.CORPORATE ? profileCompanyName.trim() : "",
      npwp: profileSegment === CustomerSegment.CORPORATE ? profileNpwp.trim() : "",
    };

    updateCustomer(activeCustomer.id, updatedData);
    triggerToast(
      "💾 Profil berhasil disimpan dan disinkronkan ke cloud!",
      "success",
    );

    // Write system log
    addLog(
      "Customer Profile Updated",
      `Pelanggan ${profileName} (${activeCustomer.id}) memperbarui informasi profil personal & korporasi secara mandiri.`,
      "SYSTEM",
      "LOW",
    );
  };

  // Initiate Warranty Claim
  const handleInitiateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanComplaint = warrantyComplaint.trim().slice(0, 500);
    if (
      !activeCustomer ||
      !selectedWarrantyTicketId ||
      !cleanComplaint
    ) {
      triggerToast("Pilih unit perangkat dan isi keluhan Anda.", "warning");
      return;
    }

    setIsSubmittingWarranty(true);

    try {
      await claimWarranty(selectedWarrantyTicketId, cleanComplaint);
      setIsSubmittingWarranty(false);
      setWarrantyComplaint("");
      setSelectedWarrantyTicketId("");
      triggerToast(
        "🛡️ Klaim garansi berhasil diajukan! Teknisi kami akan segera memverifikasi.",
        "success",
      );

      const ticket = services.find((s) => s.id === selectedWarrantyTicketId && s.tenantId === activeCustomer.tenantId);
      addLog(
        "Warranty Claim Initiated",
        `Pelanggan ${activeCustomer.name} mengajukan klaim garansi mandiri untuk perangkat ${ticket?.deviceName || "Unit"} (${ticket?.ticketNo || "No Tiket"}). Keluhan: ${cleanComplaint}`,
        "SERVICE",
        "MEDIUM",
      );
    } catch (error) {
      console.error("Warranty claim failed:", error);
      setIsSubmittingWarranty(false);
      triggerToast("Klaim garansi gagal disimpan. Coba lagi.", "error");
    }
  };

  // Generate and Download Invoice offline representation (TXT file)
  const downloadInvoiceReceipt = (tx: any) => {
    const isServiceTicket = !tx.grandTotal;
    const dateStr = new Date(
      tx.timestamp || tx.createdAt || Date.now(),
    ).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const tenantName =
      activeTenant?.name?.toUpperCase() || "KOMPUTER MAKASSAR SERVICE ERP";
    const invoiceNumber = tx.invoiceNo || tx.ticketNo || "INV/ERP/GUEST";

    const content = `==================================================================
                 ${tenantName}
==================================================================
NO. INVOICE   : ${invoiceNumber}
TANGGAL       : ${dateStr}
PELANGGAN     : ${activeCustomer?.name || "Pelanggan Guest"}
SEGMEN        : ${activeCustomer?.segment || "PERSONAL"}
${activeCustomer?.companyName ? `PERUSAHAAN    : ${activeCustomer.companyName}\n` : ""}${activeCustomer?.npwp ? `NPWP          : ${activeCustomer.npwp}\n` : ""}STATUS        : PAID (LUNAS / SELESAI)
------------------------------------------------------------------
RINCIAN TRANSAKSI:
${
  isServiceTicket
    ? `- Layanan Servis Perangkat: ${tx.deviceName}
    Estimasi Biaya: Rp ${(tx.estimatedCost || 0).toLocaleString("id-ID")}
    Down Payment  : Rp ${(tx.downPayment || 0).toLocaleString("id-ID")}
    Sisa Pelunasan: Rp ${((tx.estimatedCost || 0) - (tx.downPayment || 0)).toLocaleString("id-ID")}`
    : tx.items
        ?.map(
          (item: any) => `- ${item.name}
    Qty: ${item.quantity} x Rp ${item.unitPrice.toLocaleString("id-ID")} (Disc: Rp ${item.discount.toLocaleString("id-ID")})
    Total: Rp ${item.total.toLocaleString("id-ID")}`,
        )
        .join("\n")
}
------------------------------------------------------------------
SUBTOTAL      : Rp ${(isServiceTicket ? tx.estimatedCost : tx.subtotal || 0).toLocaleString("id-ID")}
DISKON        : Rp ${(isServiceTicket ? 0 : tx.discountAmount || 0).toLocaleString("id-ID")}
PAJAK (11%)   : Rp ${(isServiceTicket ? Math.round((tx.estimatedCost || 0) * 0.11) : tx.taxAmount || 0).toLocaleString("id-ID")}
------------------------------------------------------------------
GRAND TOTAL   : Rp ${(isServiceTicket ? tx.estimatedCost + Math.round((tx.estimatedCost || 0) * 0.11) : tx.grandTotal || 0).toLocaleString("id-ID")}
METODE BAYAR  : ${tx.paymentMethod || PaymentMethod.CASH}
------------------------------------------------------------------
TERIMA KASIH TELAH MEMILIH LAYANAN KAMI!
Simpan invoice digital ini sebagai bukti garansi purna-jual yang sah.
Bawa kuitansi fisik/cetak ini saat melakukan serah terima perangkat.
==================================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Invoice-${invoiceNumber.replace(/\//g, "-")}.txt`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast(`📥 Berhasil mengunduh invoice ${invoiceNumber}!`, "success");

    // Log download audit event
    addLog(
      "Invoice Downloaded",
      `Pelanggan ${activeCustomer?.name || "Guest"} mengunduh kuitansi invoice digital #${invoiceNumber}.`,
      "FINANCE",
      "LOW",
    );
  };

  // Secure live support chat message dispatch
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsgText = messageInput.trim().slice(0, 500);
    if (!cleanMsgText) return;

    const userMsg = {
      id: "msg-" + Date.now().toString(36),
      sender: activeCustomer ? activeCustomer.name : "Pelanggan Guest",
      role: "user" as const,
      text: cleanMsgText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    const currentInput = cleanMsgText;
    setMessageInput("");
    setIsChatLoading(true);

    // Audit Log chat sent
    addLog(
      "Support Message Sent",
      `Pelanggan mengirim pesan dukungan: "${currentInput}" terkait topik: ${selectedChatTopic}`,
      "SERVICE",
      "LOW",
    );

    try {
      // Format messages history for the server API call to prevent frontend key exposure
      const formattedHistory = updatedMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Append technical system guidance to keep responses contextual to this repair shop
      const systemContext = `Anda adalah teknisi senior dan CS di gerai 'Komputer Makassar Service'. 
      Pelanggan bernama ${activeCustomer ? activeCustomer.name : "Guest"}.
      Unit pengerjaan aktif mereka adalah ${selectedChatTopic !== "general" ? selectedChatTopic : "beberapa perangkat elektronik"}.
      Berikan tanggapan yang ramah, sopan, mendalam, bernada teknis namun mudah dimengerti dalam Bahasa Indonesia.`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", text: systemContext },
            ...formattedHistory,
          ],
          userRole: "CUSTOMER",
        }),
      });

      if (!response.ok) throw new Error("Gagal memperoleh respon server.");
      const data = await response.json();

      const replyMsg = {
        id: "ai-" + Date.now().toString(36),
        sender: selectedChatTopic === "general" ? "Support CS" : "Teknisi Lab",
        role: "model" as const,
        text: data.text,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, replyMsg]);
    } catch (err: any) {
      const replyMsg = {
        id: "ai-error-" + Date.now().toString(36),
        sender: "Support CS",
        role: "model" as const,
        text: "Layanan chat sedang tidak tersedia. Silakan coba lagi beberapa saat atau hubungi outlet langsung.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, replyMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper values for active/expired warranties count
  const warrantySummary = useMemo(() => {
    let active = 0;
    let eligible = 0;

    services.forEach((s) => {
      if (s.customerId === selectedCustomerId) {
        if (s.status === ServiceStatus.DIAMBIL || s.status === ServiceStatus.SELESAI) {
          let endsDate = s.warrantyEndsAt;
          if (!endsDate && s.status === ServiceStatus.SELESAI) {
            const base = s.updatedAt ? new Date(s.updatedAt) : new Date();
            const dur = (s.warrantyMonths || 3) * 30 * 24 * 60 * 60 * 1000;
            endsDate = new Date(base.getTime() + dur).toISOString();
          }
          const isExpired = endsDate
            ? new Date(endsDate) < new Date()
            : true;
          if (!isExpired) {
            active++;
            eligible++;
          }
        }
      }
    });

    return { active, eligible };
  }, [services, selectedCustomerId]);

  return (
    <div
      className="space-y-6 max-w-6xl mx-auto pb-12"
      id="customer-portal-root"
    >
      {/* 1. CUSTOMER IDENTITY PORTAL BAR */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-950 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-extrabold text-sm tracking-wide text-indigo-300 font-mono uppercase">
              ERP CUSTOMER EXPERIENCE PORTAL
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Pilih atau ganti akun pelanggan di bawah ini untuk melihat pratinjau
            langsung portal pengalaman mandiri (Auth & Multi-segmen).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest block w-full sm:w-auto font-mono">
            Pilih Akun Aktif:
          </span>

          <button
            onClick={() => {
              setSelectedCustomerId("guest");
              setSearchedTicket(null);
              setActivePortalTab("track");
              triggerToast("Masuk sebagai Guest / Publik tracking", "info");
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              !activeCustomer
                ? "bg-white text-indigo-950 border-white shadow-md"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" /> Guest (Public)
          </button>

          {tenantCustomers.map((cust) => (
            <button
              key={cust.id}
              onClick={() => {
                setSelectedCustomerId(cust.id);
                setSearchedTicket(null);
                setActivePortalTab("track");
                triggerToast(
                  `🔐 Berhasil masuk sebagai ${cust.name}!`,
                  "success",
                );

                // Track default ticket if exists to save user typing
                const defaultTicket = services.find(
                  (s) => s.customerId === cust.id,
                );
                if (defaultTicket) {
                  setTicketNo(defaultTicket.ticketNo);
                  performSearch(defaultTicket.ticketNo);
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedCustomerId === cust.id
                  ? "bg-accent text-white border-accent shadow-md ring-2 ring-indigo-400/30"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              {cust.segment === CustomerSegment.CORPORATE ? (
                <Building className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              )}
              {cust.name.split(" ")[0]} ({cust.segment})
            </button>
          ))}
        </div>
      </div>

      {/* 2. CUSTOMER IDENTITY DASHBOARD CARD */}
      <AnimatePresence mode="wait">
        {activeCustomer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden"
            id="customer-dashboard-welcome"
          >
            <div className="space-y-1.5 z-10">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                    activeCustomer.segment === CustomerSegment.CORPORATE
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                  }`}
                >
                  {activeCustomer.segment} CUSTOMER
                </span>
                {activeCustomer.companyName && (
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold font-mono">
                    🏢 {activeCustomer.companyName}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                Selamat Datang, {activeCustomer.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                <span className="font-mono">{activeCustomer.email}</span> •{" "}
                <span>{activeCustomer.phone}</span>
              </p>
            </div>

            {/* Loyalty points & credit indicators */}
            <div className="flex flex-wrap items-center gap-4 z-10 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-zinc-800">
              <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-150 dark:border-zinc-850 rounded-xl px-4 py-2 text-center flex-1 sm:flex-none">
                <p className="text-[9px] font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase">
                  Loyalty Points
                </p>
                <p className="text-lg font-black text-accent dark:text-accent mt-0.5">
                  🌟 {activeCustomer.loyaltyPoints || 0}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-150 dark:border-zinc-850 rounded-xl px-4 py-2 text-center flex-1 sm:flex-none">
                <p className="text-[9px] font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase">
                  Store Credit
                </p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Rp {(activeCustomer.storeCredit || 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] space-y-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`p-3.5 rounded-xl border shadow-lg flex items-center gap-3 pointer-events-auto ${
                t.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                  : t.type === "error"
                    ? "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                    : t.type === "warning"
                      ? "bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300"
                      : "bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300"
              }`}
            >
              {t.type === "success" && (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {t.type === "error" && (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              {t.type === "warning" && (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <span className="text-xs font-semibold leading-relaxed">
                {t.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. CORE MULTI-TAB VIEW CONTROLLER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side Portal Menu Navigation */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-4 lg:col-span-1">
          <p className="text-[10px] font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-widest pl-2">
            Portal Menu
          </p>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActivePortalTab("track")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activePortalTab === "track"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Search className="w-4 h-4" /> Lacak Nota Unit
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {selectedCustomerId !== "guest" && (
              <>
                <button
                  onClick={() => setActivePortalTab("warranty")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activePortalTab === "warranty"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" /> Klaim Garansi Mandiri
                  </span>
                  {warrantySummary.active > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                      {warrantySummary.active} Active
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActivePortalTab("invoices")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activePortalTab === "invoices"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" /> Riwayat Kuitansi & Invoice
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setActivePortalTab("profile")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activePortalTab === "profile"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className="w-4 h-4" /> Profil Saya
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={() => setActivePortalTab("chat")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activePortalTab === "chat"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 animate-pulse text-indigo-500" />{" "}
                Hubungi CS / Teknisi Chat
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Quick Help Box */}
          <div className="bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-150 dark:border-zinc-850 rounded-2xl space-y-2 text-xs">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" /> Butuh Bantuan?
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
              Sistem ERP mendukung tracking, approval biaya digital, klaim
              garansi otomatis, dan live support.
            </p>
          </div>
        </div>

        {/* Right Side Main Tab Workspaces */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {/* TAB 1: SERVICE TRACKING (LACAK NOTA UNIT) */}
            {activePortalTab === "track" && (
              <motion.div
                key="track-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Embedded Tracking Center Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Left Column: Track Inputs */}
                  <div className="md:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-5">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-[10px] font-bold uppercase gap-1">
                      <button
                        onClick={() => {
                          setActiveTrackMethod("type");
                          setErrorMsg("");
                        }}
                        className={`flex-1 rounded-lg py-2 text-center cursor-pointer transition-all ${
                          activeTrackMethod === "type"
                            ? "bg-white dark:bg-zinc-900 text-blue-750 dark:text-blue-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        ⌨️ Ketik Manual
                      </button>
                      <button
                        onClick={() => {
                          setActiveTrackMethod("upload");
                          setErrorMsg("");
                        }}
                        className={`flex-1 rounded-lg py-2 text-center cursor-pointer transition-all ${
                          activeTrackMethod === "upload"
                            ? "bg-white dark:bg-zinc-900 text-blue-750 dark:text-blue-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        📷 Upload QR
                      </button>
                      <button
                        onClick={() => {
                          setActiveTrackMethod("scan");
                          setErrorMsg("");
                        }}
                        className={`flex-1 rounded-lg py-2 text-center cursor-pointer transition-all ${
                          activeTrackMethod === "scan"
                            ? "bg-white dark:bg-zinc-900 text-blue-750 dark:text-blue-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        📹 Kamera
                      </button>
                    </div>

                    {/* TYPE IN */}
                    {activeTrackMethod === "type" && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-[11px] uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                          <Search className="w-4 h-4 text-slate-400" /> Masukkan
                          Nomor Tiket Nota
                        </h3>
                        <form
                          onSubmit={handleSearchTicket}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            placeholder="cth: TKT/2606/0001"
                            value={ticketNo}
                            onChange={(e) => setTicketNo(e.target.value)}
                            className="w-full text-xs px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none focus:border-accent transition"
                            required
                          />
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shrink-0 shadow-sm"
                          >
                            Lacak Unit
                          </button>
                        </form>
                      </div>
                    )}

                    {/* FILE QR UPLOAD */}
                    {activeTrackMethod === "upload" && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-[11px] uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                          <UploadCloud className="w-4 h-4 text-indigo-500" />{" "}
                          Unggah & Dekode QR Penerimaan
                        </h3>

                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) decodeQrImage(file);
                          }}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer relative ${
                            dragOver
                              ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/10"
                              : "border-slate-200 dark:border-zinc-800 hover:border-accent/60"
                          }`}
                          onClick={() =>
                            document.getElementById("qr-file-input")?.click()
                          }
                        >
                          <input
                            type="file"
                            id="qr-file-input"
                            accept="image/*"
                            onChange={handleQrFileUpload}
                            className="hidden"
                          />
                          <QrCode className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-2 animate-pulse" />
                          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                            Tarik & Taruh Gambar QR Lacak, atau Klik untuk
                            Memilih
                          </p>
                        </div>

                        {uploadError && (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg text-[10px] text-rose-700 dark:text-rose-400 leading-normal flex gap-1.5">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{uploadError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CAMERA SCANNER */}
                    {activeTrackMethod === "scan" && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-[11px] uppercase text-slate-700 dark:text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                          <Camera className="w-4 h-4 text-emerald-500 animate-pulse" />{" "}
                          Scan QR via Kamera Web (Simulasi)
                        </h3>

                        <div className="relative w-full h-44 bg-zinc-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-zinc-850">
                          {isScanningSim ? (
                            <>
                              <div className="absolute inset-8 border-2 border-emerald-500 rounded-lg animate-pulse" />
                              <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 top-1/2 animate-bounce" />
                              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-zinc-900/90 px-2 py-0.5 rounded border border-emerald-800/40 animate-pulse z-10">
                                MEMINDAI NOTA...
                              </span>
                            </>
                          ) : simScanStatus === "success" ? (
                            <div className="text-center p-4 text-emerald-400 space-y-1">
                              <CheckCircle className="w-10 h-10 mx-auto animate-bounce text-emerald-500" />
                              <p className="text-xs font-bold">
                                Penerimaan Terdeteksi!
                              </p>
                            </div>
                          ) : simScanStatus === "error" ? (
                            <div className="text-center p-4 text-rose-400 space-y-1">
                              <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
                              <p className="text-xs font-bold">
                                Gagal Mengenali QR Code
                              </p>
                            </div>
                          ) : (
                            <div className="text-center p-4 text-slate-400 space-y-1">
                              <QrCode className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                              <p className="text-[10px] font-bold">
                                Dekatkan Lensa Kamera ke Barcode QR Nota
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase font-mono pl-1">
                            Skenario Scanner:
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => triggerSimulatedScan("success")}
                              className="p-1.5 border border-emerald-100 dark:border-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 text-[9px] font-bold rounded-lg transition"
                            >
                              🔵 Scan Sukses
                            </button>
                            <button
                              onClick={() => triggerSimulatedScan("error_blur")}
                              className="p-1.5 border border-rose-100 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-rose-800 dark:text-rose-400 text-[9px] font-bold rounded-lg transition"
                            >
                              🔴 Scan Blur
                            </button>
                            <button
                              onClick={() =>
                                triggerSimulatedScan("error_invalid")
                              }
                              className="p-1.5 border border-amber-100 dark:border-amber-950/40 hover:bg-amber-50 dark:hover:bg-amber-950/10 text-amber-800 dark:text-amber-400 text-[9px] font-bold rounded-lg transition"
                            >
                              🟡 Kode Palsu
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Alerts */}
                    {errorMsg && !searchedTicket && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-800 dark:text-rose-350 leading-relaxed font-medium space-y-1.5">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-rose-900 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />{" "}
                          Gagal Melacak Tiket
                        </p>
                        <p className="text-[11px]">{errorMsg}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Customer active tickets list */}
                  <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-500" /> Perangkat
                      Terdaftar Saya
                    </h3>

                    {!activeCustomer ? (
                      <div className="text-center py-8 text-slate-400 dark:text-zinc-500">
                        <User className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        <p className="text-xs font-bold leading-normal">
                          Bukan Pelanggan Terdaftar?
                        </p>
                        <p className="text-[10px] text-slate-400 max-w-[160px] mx-auto leading-normal mt-0.5">
                          Identifikasi diri Anda di atas untuk melihat unit
                          servis Anda secara otomatis.
                        </p>
                      </div>
                    ) : customerTickets.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-zinc-500 font-mono">
                        <AlertTriangle className="w-6 h-6 mx-auto opacity-30 mb-1" />
                        <p className="text-[10px]">
                          Belum ada data pengerjaan.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {customerTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            onClick={() => {
                              setTicketNo(ticket.ticketNo);
                              performSearch(ticket.ticketNo);
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              ticketNo === ticket.ticketNo
                                ? "bg-blue-50/50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900"
                                : "bg-slate-50 dark:bg-zinc-950 border-slate-150 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-900"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold text-accent dark:text-accent">
                                #{ticket.ticketNo}
                              </span>
                              <span
                                className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase font-mono ${
                                  ticket.status === ServiceStatus.DIAMBIL ||
                                  ticket.status === ServiceStatus.SELESAI
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1.5 truncate">
                              {ticket.deviceName}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              S/N: {ticket.deviceSerial || "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* TRACKED TICKET DETAIL & TIMELINE WORKSPACE */}
                {searchedTicket && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-6"
                  >
                    {/* Header Unit Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                            Status: {searchedTicket.status}
                          </span>
                          <span className="text-slate-400 dark:text-zinc-500 font-mono text-xs font-semibold">
                            Tiket: #{searchedTicket.ticketNo}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">
                          {searchedTicket.deviceName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                          Brand / Model:{" "}
                          {searchedTicket.deviceBrandModel || "Generik"}
                        </p>
                      </div>

                      {/* Displaying approximate cost and downpayment if any */}
                      <div className="bg-slate-50 dark:bg-zinc-950 p-3 border border-slate-150 dark:border-zinc-850 rounded-xl text-right">
                        <p className="text-[9px] font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase">
                          Estimasi Biaya Perbaikan
                        </p>
                        <p className="text-base font-black text-blue-700 dark:text-blue-400 mt-0.5">
                          Rp{" "}
                          {(searchedTicket.estimatedCost || 0).toLocaleString(
                            "id-ID",
                          )}
                        </p>
                        {searchedTicket.downPayment > 0 && (
                          <p className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                            DP Dibayar: -Rp{" "}
                            {searchedTicket.downPayment.toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Estimate Approval section (DIGITAL SIGNATURE) */}
                    {(searchedTicket.status ===
                      ServiceStatus.MENUGGU_APPROVAL ||
                      searchedTicket.status ===
                        ServiceStatus.ESTIMATE_PENDING) && (
                      <div className="p-5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/35 rounded-2xl space-y-4 animate-pulse">
                        <h4 className="font-bold text-xs text-amber-900 dark:text-amber-400 flex items-center gap-2 uppercase font-mono tracking-wider">
                          <FileText className="w-4 h-4 text-amber-600" /> Surat
                          Penawaran Resmi & Persetujuan Digital
                        </h4>

                        <div className="bg-white dark:bg-zinc-950 p-4 border border-amber-100 dark:border-amber-900/20 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 space-y-2 font-mono leading-relaxed">
                          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850 pb-1.5">
                            <span>No. Dokumen Penawaran:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              QT-{searchedTicket.ticketNo}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850 pb-1.5">
                            <span>Perangkat Unit:</span>
                            <span>{searchedTicket.deviceName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 dark:border-zinc-850 pb-1.5">
                            <span>Biaya Estimasi Servis:</span>
                            <span className="text-blue-700 dark:text-blue-400 font-extrabold">
                              Rp{" "}
                              {searchedTicket.estimatedCost?.toLocaleString(
                                "id-ID",
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold pt-1.5 text-slate-900 dark:text-white text-xs">
                            <span>Estimasi Total Pembayaran (Pelunasan):</span>
                            <span>
                              Rp{" "}
                              {(
                                (searchedTicket.estimatedCost || 0) -
                                (searchedTicket.downPayment || 0)
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {/* Signature input panel */}
                        <div className="bg-white dark:bg-zinc-950 p-4 border border-slate-250 dark:border-zinc-850 rounded-2xl space-y-3">
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase font-mono pl-1">
                            Isi Lembar Validasi Tanda Tangan:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                                Nama Penyetuju
                              </label>
                              <input
                                type="text"
                                placeholder="cth: Hasanuddin"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg outline-none focus:border-accent font-semibold dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                                Input Goresan Inisial (Ttd Digital)
                              </label>
                              <input
                                type="text"
                                placeholder="cth: /hasan_h/"
                                value={signerText}
                                onChange={(e) => setSignerText(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg outline-none focus:border-accent font-mono italic text-blue-700 dark:text-blue-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              approveServiceEstimate(
                                searchedTicket.id,
                                false,
                                signerName || "Pelanggan",
                                signerText || "DITOLAK",
                              );
                              triggerToast(
                                "Surat penawaran ditolak secara resmi.",
                                "warning",
                              );
                              setSearchedTicket(null);
                              setSignerName("");
                              setSignerText("");
                            }}
                            className="flex-1 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-semibold text-xs py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Tolak
                            Estimasi
                          </button>
                          <button
                            type="button"
                            disabled={!signerName.trim() || !signerText.trim()}
                            onClick={() => {
                              approveServiceEstimate(
                                searchedTicket.id,
                                true,
                                signerName,
                                signerText,
                              );
                              triggerToast(
                                `Estimasi disetujui digital oleh ${signerName}!`,
                                "success",
                              );
                              setSearchedTicket(null);
                              setSignerName("");
                              setSignerText("");
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Setujui & Mulai
                            Reparasi
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Warranty PDF download cards */}
                    {searchedTicket.status === ServiceStatus.DIAMBIL && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs space-y-3">
                        <p className="font-extrabold text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />{" "}
                          Garansi Unit Purna Jual Aktif
                        </p>
                        <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
                          Garansi pengerjaan berlaku{" "}
                          {searchedTicket.warrantyMonths || 3} bulan, berakhir
                          pada:{" "}
                          <strong>
                            {searchedTicket.warrantyEndsAt?.split("T")[0] ||
                              "2026-09-30"}
                          </strong>
                          .
                        </p>
                        <button
                          onClick={() =>
                            triggerToast(
                              "Mengunduh Kartu Garansi Digital PDF...",
                              "success",
                            )
                          }
                          className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-zinc-800 border border-emerald-200 dark:border-emerald-900/30 font-extrabold px-3.5 py-2 rounded-xl text-[10px] cursor-pointer shadow-xs transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh Kartu
                          Garansi Digital
                        </button>
                      </div>
                    )}

                    {/* Vertical Timeline Tracker */}
                    <div className="space-y-4">
                      <p className="font-bold text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                        Histori Perjalanan Unit (SLA Real-time)
                      </p>

                      <div className="space-y-4 pl-4 border-l-2 border-slate-150 dark:border-zinc-800 relative">
                        {searchedTicket.timeline &&
                        searchedTicket.timeline.length > 0 ? (
                          searchedTicket.timeline.map(
                            (event: any, evIdx: number) => (
                              <div
                                key={evIdx}
                                className="relative text-xs space-y-1"
                              >
                                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white dark:border-zinc-900 ring-2 ring-blue-500/20" />
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-800 dark:text-zinc-200 uppercase font-mono text-[10.5px]">
                                    {event.status}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(
                                      event.timestamp,
                                    ).toLocaleDateString("id-ID")}{" "}
                                    •{" "}
                                    {new Date(
                                      event.timestamp,
                                    ).toLocaleTimeString("id-ID")}
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-zinc-400 leading-normal pl-0.5 font-medium">
                                  {event.note}
                                </p>
                                <span className="text-[9px] font-mono font-bold text-slate-400 block pl-0.5">
                                  Operator: {event.operator || "Sistem"}
                                </span>
                              </div>
                            ),
                          )
                        ) : (
                          <div className="text-slate-400 font-mono text-xs">
                            Belum ada aktivitas tercatat.
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB 2: WARRANTY HUB (KLAIM GARANSI) */}
            {activePortalTab === "warranty" && activeCustomer && (
              <motion.div
                key="warranty-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-6"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />{" "}
                    Hub Pengajuan Garansi Mandiri
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Ajukan klaim garansi tanpa harus datang langsung. Cukup
                    pilih perangkat Anda, jelaskan gejalanya, dan tim teknisi
                    kami akan merespons di portal chat secara langsung.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Left Column: Claims Form */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-widest pl-1 font-mono">
                      Formulir Klaim Garansi Baru
                    </h4>

                    <form
                      onSubmit={handleInitiateWarranty}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                          Pilih Perangkat Unit Servis
                        </label>
                        <select
                          value={selectedWarrantyTicketId}
                          onChange={(e) =>
                            setSelectedWarrantyTicketId(e.target.value)
                          }
                          className="w-full text-xs px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white"
                          required
                        >
                          <option value="">
                            -- Pilih Perangkat Selesai --
                          </option>
                          {customerTickets
                            .filter(
                              (s) =>
                                s.status === ServiceStatus.DIAMBIL ||
                                s.status === ServiceStatus.SELESAI,
                            )
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.deviceName} ({s.ticketNo})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                          Keluhan Kerusakan / Masalah yang Muncul
                        </label>
                        <textarea
                          placeholder="Jelaskan secara rinci keluhan atau kerusakan komponen setelah diambil..."
                          rows={4}
                          value={warrantyComplaint}
                          onChange={(e) => setWarrantyComplaint(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white leading-relaxed"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingWarranty}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 disabled:opacity-40"
                      >
                        {isSubmittingWarranty ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                            Mengirim Pengajuan Klaim...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" /> Kirim Klaim
                            Garansi Mandiri
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Warranty lists */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-widest pl-1 font-mono">
                      Status Kelayakan Unit Garansi
                    </h4>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {customerTickets.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 font-mono text-xs">
                          Belum ada unit terdaftar.
                        </div>
                      ) : (
                        customerTickets.map((s) => {
                          const isCompleted =
                            s.status === ServiceStatus.DIAMBIL ||
                            s.status === ServiceStatus.SELESAI;
                          const isClaimActive =
                            s.status === ServiceStatus.KLAIM_GARANSI;
                          let endsDate = s.warrantyEndsAt;
                          if (!endsDate && s.status === ServiceStatus.SELESAI) {
                            const base = s.updatedAt ? new Date(s.updatedAt) : new Date();
                            const dur = (s.warrantyMonths || 3) * 30 * 24 * 60 * 60 * 1000;
                            endsDate = new Date(base.getTime() + dur).toISOString();
                          }
                          const isExpired = endsDate
                            ? new Date(endsDate) < new Date()
                            : true;

                          return (
                            <div
                              key={s.id}
                              className="p-3.5 bg-slate-50 dark:bg-zinc-950/50 border border-slate-150 dark:border-zinc-850 rounded-xl text-xs flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <h5 className="font-extrabold text-slate-800 dark:text-zinc-200">
                                  {s.deviceName}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Tiket: #{s.ticketNo}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Berlaku:{" "}
                                  {s.warrantyEndsAt?.split("T")[0] ||
                                    "3 Bulan dari Selesai"}
                                </p>
                              </div>

                              <div className="text-right">
                                {isClaimActive ? (
                                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 font-extrabold text-[8.5px] px-2 py-0.5 rounded-md font-mono uppercase">
                                    Sedang Ditinjau
                                  </span>
                                ) : !isCompleted ? (
                                  <span className="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 font-extrabold text-[8.5px] px-2 py-0.5 rounded-md font-mono uppercase">
                                    Unit Berjalan
                                  </span>
                                ) : isExpired ? (
                                  <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-400 font-extrabold text-[8.5px] px-2 py-0.5 rounded-md font-mono uppercase">
                                    Garansi Habis
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 font-extrabold text-[8.5px] px-2 py-0.5 rounded-md font-mono uppercase">
                                    Aktif
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: INVOICES & RECEIPTS */}
            {activePortalTab === "invoices" && activeCustomer && (
              <motion.div
                key="invoices-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-6"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" /> Riwayat
                    Kuitansi & Unduh Invoice
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Unduh salinan kuitansi PDF digital / kuitansi transaksi POS
                    dan pengerjaan servis Anda sebagai dokumen laporan keuangan
                    corporate maupun bukti jaminan garansi yang sah.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-widest pl-1 font-mono">
                    Daftar Invoice & Pembayaran Lunas
                  </h4>

                  {customerTransactions.length === 0 &&
                  customerTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-mono text-xs">
                      <FileSpreadsheet className="w-10 h-10 mx-auto opacity-30 mb-2" />
                      Belum ada invoice transaksi terekam untuk pelanggan ini.
                    </div>
                  ) : (
                    <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-150 dark:border-zinc-800">
                            <tr>
                              <th className="px-4 py-3">No. Invoice</th>
                              <th className="px-4 py-3">Tanggal</th>
                              <th className="px-4 py-3">Deskripsi Item</th>
                              <th className="px-4 py-3 text-right">
                                Total Transaksi
                              </th>
                              <th className="px-4 py-3 text-center">Metode</th>
                              <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-zinc-800 font-medium">
                            {/* Render POS transactions */}
                            {customerTransactions.map((tx) => (
                              <tr
                                key={tx.id}
                                className="hover:bg-slate-50/55 dark:hover:bg-zinc-950/40"
                              >
                                <td className="px-4 py-3 font-mono text-[10px] font-bold text-accent dark:text-accent">
                                  {tx.invoiceNo}
                                </td>
                                <td className="px-4 py-3 font-mono text-[9px] text-slate-400">
                                  {new Date(tx.timestamp).toLocaleDateString(
                                    "id-ID",
                                  )}
                                </td>
                                <td className="px-4 py-3 max-w-[150px] truncate">
                                  {tx.items
                                    ?.map((it: any) => it.name)
                                    .join(", ")}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-zinc-200">
                                  Rp{" "}
                                  {(tx.grandTotal || 0).toLocaleString("id-ID")}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[8.5px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase">
                                    {tx.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center space-x-1.5">
                                  <button
                                    onClick={() => setSelectedInvoice(tx)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-[10.5px] font-bold cursor-pointer hover:underline"
                                  >
                                    Lihat
                                  </button>
                                  <button
                                    onClick={() => downloadInvoiceReceipt(tx)}
                                    className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-[10.5px] font-bold cursor-pointer hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <Download className="w-3 h-3 shrink-0" />{" "}
                                    Unduh
                                  </button>
                                </td>
                              </tr>
                            ))}

                            {/* Render Service Ticket payments if completed */}
                            {customerTickets
                              .filter(
                                (ticket) =>
                                  ticket.status === ServiceStatus.DIAMBIL ||
                                  ticket.status === ServiceStatus.SELESAI,
                              )
                              .map((ticket) => (
                                <tr
                                  key={ticket.id}
                                  className="hover:bg-slate-50/55 dark:hover:bg-zinc-950/40"
                                >
                                  <td className="px-4 py-3 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    QT-{ticket.ticketNo}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[9px] text-slate-400">
                                    {ticket.updatedAt
                                      ? new Date(
                                          ticket.updatedAt,
                                        ).toLocaleDateString("id-ID")
                                      : "2026-06-30"}
                                  </td>
                                  <td className="px-4 py-3 max-w-[150px] truncate">
                                    Servis: {ticket.deviceName} (
                                    {ticket.deviceBrandModel})
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-zinc-200">
                                    Rp{" "}
                                    {(ticket.estimatedCost || 0).toLocaleString(
                                      "id-ID",
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[8.5px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase">
                                      SERVIS
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center space-x-1.5">
                                    <button
                                      onClick={() => setSelectedInvoice(ticket)}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-[10.5px] font-bold cursor-pointer hover:underline"
                                    >
                                      Lihat
                                    </button>
                                    <button
                                      onClick={() =>
                                        downloadInvoiceReceipt(ticket)
                                      }
                                      className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-[10.5px] font-bold cursor-pointer hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <Download className="w-3 h-3 shrink-0" />{" "}
                                      Unduh
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* POPUP DETAIL INVOICE MODAL VIEW */}
                {selectedInvoice && createPortal(
                  <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between border-b dark:border-zinc-800 pb-3">
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                          Struk Invoice Penjualan Resmi
                        </h4>
                        <button
                          onClick={() => setSelectedInvoice(null)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                        >
                          <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                        </button>
                      </div>

                      <div className="space-y-4 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                        <div className="text-center py-2 border-b dark:border-zinc-800">
                          <h5 className="font-black text-sm text-slate-900 dark:text-white">
                            {activeTenant?.name?.toUpperCase() ||
                              "KOMPUTER MAKASSAR SERVICE"}
                          </h5>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Makassar, Sulawesi Selatan, Indonesia
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 block">
                              No. Invoice:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {selectedInvoice.invoiceNo ||
                                selectedInvoice.ticketNo}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block">
                              Tanggal:
                            </span>
                            <span>
                              {new Date(
                                selectedInvoice.timestamp ||
                                  selectedInvoice.createdAt ||
                                  Date.now(),
                              ).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">
                              Pelanggan:
                            </span>
                            <span className="font-bold">
                              {activeCustomer.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block">
                              Status:
                            </span>
                            <span className="text-emerald-600 font-bold">
                              LUNAS / SELESAI
                            </span>
                          </div>
                        </div>

                        {/* Items breakdown list */}
                        <div className="border-t border-b dark:border-zinc-800 py-2.5 space-y-1.5">
                          {selectedInvoice.grandTotal ? (
                            selectedInvoice.items?.map(
                              (it: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between"
                                >
                                  <span>
                                    {it.name} (x{it.quantity})
                                  </span>
                                  <span>
                                    Rp {it.total?.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="flex justify-between">
                              <span>
                                Jasa Servis & Perbaikan:{" "}
                                {selectedInvoice.deviceName}
                              </span>
                              <span>
                                Rp{" "}
                                {selectedInvoice.estimatedCost?.toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Financial Totals */}
                        <div className="space-y-1 text-right">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>
                              Rp{" "}
                              {(selectedInvoice.grandTotal
                                ? selectedInvoice.subtotal
                                : selectedInvoice.estimatedCost || 0
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                          {selectedInvoice.discountAmount > 0 && (
                            <div className="flex justify-between text-rose-500">
                              <span>Diskon:</span>
                              <span>
                                -Rp{" "}
                                {selectedInvoice.discountAmount.toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 text-xs border-t dark:border-zinc-850">
                            <span>Total Pembayaran:</span>
                            <span>
                              Rp{" "}
                              {(selectedInvoice.grandTotal
                                ? selectedInvoice.grandTotal
                                : selectedInvoice.estimatedCost || 0
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={() => setSelectedInvoice(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                        >
                          Tutup
                        </button>
                        <button
                          onClick={() => {
                            downloadInvoiceReceipt(selectedInvoice);
                            setSelectedInvoice(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Download className="w-4 h-4 shrink-0" /> Unduh
                          Dokumen
                        </button>
                      </div>
                    </motion.div>
                  </div>,
                  document.body
                )}
              </motion.div>
            )}

            {/* TAB 4: MY PROFILE (UPDATE PERSONAL & CORPORATE) */}
            {activePortalTab === "profile" && activeCustomer && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-6"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" /> Informasi Profil
                    Saya & Korporat
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Kelola data personal, nomor telepon, alamat pengiriman unit,
                    dan detail NPWP perusahaan Anda untuk mempermudah penerbitan
                    faktur pajak (faktur komersial) secara instan.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Segment Select */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                        Klasifikasi Segmen Pelanggan
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setProfileSegment(CustomerSegment.PERSONAL)
                          }
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            profileSegment === CustomerSegment.PERSONAL
                              ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                              : "bg-white border-slate-200 text-slate-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <User className="w-4 h-4 text-sky-500" /> Personal
                          (Perseorangan)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setProfileSegment(CustomerSegment.CORPORATE)
                          }
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            profileSegment === CustomerSegment.CORPORATE
                              ? "bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                              : "bg-white border-slate-200 text-slate-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <Building className="w-4 h-4 text-amber-500" />{" "}
                          Corporate / Perusahaan (B2B)
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                        Nama Lengkap / Kontak PIC
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                        Alamat Email Resmi
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                        No. WhatsApp Aktif
                      </label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white"
                        required
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono pl-1">
                        Alamat Kantor / Domisili
                      </label>
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-accent dark:text-white"
                        required
                      />
                    </div>

                    {/* CORPORATE FIELDS SPECIFIC */}
                    {profileSegment === CustomerSegment.CORPORATE && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-850 pt-4"
                      >
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold text-amber-600 uppercase font-mono pl-1">
                            Nama Badan Usaha / PT / CV
                          </label>
                          <input
                            type="text"
                            placeholder="cth: PT Semen Tonasa Tbk"
                            value={profileCompanyName}
                            onChange={(e) =>
                              setProfileCompanyName(e.target.value)
                            }
                            className="w-full text-xs px-3.5 py-2.5 border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-amber-400 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold text-amber-600 uppercase font-mono pl-1">
                            Nomor Pokok Wajib Pajak (NPWP)
                          </label>
                          <input
                            type="text"
                            placeholder="cth: 01.234.567.8-901.000"
                            value={profileNpwp}
                            onChange={(e) => setProfileNpwp(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-amber-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none focus:border-amber-400 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                  >
                    <Check className="w-4 h-4" /> Simpan Perubahan Profil Saya
                  </button>
                </form>
              </motion.div>
            )}

            {/* TAB 5: SECURE CHAT WITH SUPPORT / AI TECHNICIAN */}
            {activePortalTab === "chat" && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col h-[520px]"
                id="live-chat-panel"
              >
                {/* Chat header details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-zinc-850 pb-3.5 mb-3 shrink-0">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-500 animate-pulse" />{" "}
                      Live Chat Dukungan Teknik (Secure SSL)
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                      Terhubung langsung ke tim teknisi lab atau support CS
                      kami, dipandu oleh asisten AI pintar.
                    </p>
                  </div>

                  {/* Topic Select */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono mr-1">
                      Topik Obrolan:
                    </span>
                    <select
                      value={selectedChatTopic}
                      onChange={(e) => {
                        setSelectedChatTopic(e.target.value);
                        setChatMessages((prev) => [
                          ...prev,
                          {
                            id:
                              "topic-" +
                              Math.random().toString(36).substring(2, 9),
                            sender: "System",
                            role: "model",
                            text: `[Sistem] Topik obrolan dialihkan ke: *${e.target.value === "general" ? "Pertanyaan Umum" : "Tiket #" + e.target.value}*. Bagaimana saya bisa membantu Anda?`,
                            timestamp: new Date().toISOString(),
                          },
                        ]);
                      }}
                      className="text-[11px] px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-lg outline-none font-semibold dark:text-white cursor-pointer"
                    >
                      <option value="general">Umum (Dukungan Pelanggan)</option>
                      {customerTickets.map((s) => (
                        <option key={s.id} value={s.ticketNo}>
                          Servis: {s.deviceName} ({s.ticketNo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bubble conversation display */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-3 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl p-4 border border-slate-100 dark:border-zinc-950">
                  {chatMessages.map((msg) => {
                    const isSystem = msg.sender === "System";
                    const isUser = msg.role === "user";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        } space-y-1`}
                      >
                        <span className="text-[9px] text-slate-400 font-mono font-bold uppercase pl-1 pr-1">
                          {msg.sender}
                        </span>

                        <div
                          className={`max-w-[85%] text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                            isSystem
                              ? "bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 font-mono italic text-[11px]"
                              : isUser
                                ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                                : "bg-white text-slate-800 dark:bg-zinc-900 dark:text-zinc-200 rounded-tl-none border border-slate-200 dark:border-zinc-800 shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-line font-medium">
                            {msg.text}
                          </p>
                        </div>

                        <span className="text-[8.5px] text-slate-400 font-mono pl-1 pr-1">
                          {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}

                  {/* Loading / Typing placeholder */}
                  {isChatLoading && (
                    <div className="flex flex-col items-start space-y-1">
                      <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase animate-pulse">
                        Sistem AI sedang mengetik...
                      </span>
                      <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 text-slate-400 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message input footer */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder={`Ketik pesan Anda terkait ${selectedChatTopic === "general" ? "General Support" : "Servis #" + selectedChatTopic}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isChatLoading}
                    className="w-full text-xs px-3.5 py-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none focus:border-accent transition disabled:opacity-55"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 rounded-xl transition cursor-pointer shrink-0 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-55"
                  >
                    <Send className="w-4 h-4 shrink-0" /> Kirim
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. SEED FAQ SECTION AT THE FOOTER */}
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs"
        id="faq-footer-block"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-850 pb-3 mb-4">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 font-mono">
            <Info className="w-4 h-4 text-indigo-500" /> {portalHelpTitle}{" "}
            (Tanya Jawab Layanan)
          </h4>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
            🚀 Terintegrasi dengan Sistem ERP Multi-Tenant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {portalContactText.split("\n\n").map((faqBlock, i) => {
            const lines = faqBlock.split("\n");
            if (lines.length === 0 || !lines[0].trim()) return null;
            const title = lines[0];
            const content = lines.slice(1).join("\n");

            return (
              <div
                key={i}
                className="p-3.5 bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-zinc-850 rounded-xl space-y-1"
              >
                <p className="text-xs font-black text-slate-800 dark:text-zinc-200 font-mono">
                  💡 {title.replace(/^\?+/, "")}
                </p>
                {content && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 whitespace-pre-line leading-relaxed font-medium">
                    {content}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-medium">
            Gerai Operasional: Senin - Sabtu (08:00 - 17:00 WITA). Minggu Libur.
          </p>
          <button
            type="button"
            onClick={() => {
              const whatsappNum =
                activeTenant?.settings?.notificationSettings?.whatsappNumber ||
                "+628123456789";
              const cleanNum = whatsappNum.replace(/[^0-9]/g, "");
              const text = `Halo Admin ${activeTenant?.name || "Repair Hub"}, saya ingin menanyakan tentang kelanjutan perbaikan unit saya di customer portal.`;

              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard
                  .writeText(text)
                  .then(() => { /* clipboard success — silent */ })
                  .catch(() => { /* clipboard unavailable — fallback to window.open */ });
              }
              try {
                window.open(
                  `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encodeURIComponent(text)}`,
                  "_blank",
                );
              } catch (e) {
                console.error("Popup blocked:", e);
              }
              triggerToast(
                `Membuka Chat WhatsApp ke ${whatsappNum}.\nPesan pembuka otomatis disalin ke clipboard Anda!`,
                "info",
              );
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 shrink-0" /> Hubungi Customer Service
            (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
};
