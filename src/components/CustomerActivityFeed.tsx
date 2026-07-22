import React, { useState, useEffect, useMemo } from "react";
import { safeLocalStorage } from "../utils/safeStorage";

const localStorage = safeLocalStorage;
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  ArrowLeft,
  MessageSquare,
  Wrench,
  FileText,
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  User,
  Clock,
  Phone,
  Mail,
  CreditCard,
  Award,
  Bookmark,
  Share2,
  Calendar,
  CheckCircle2,
  Sliders,
  DollarSign,
} from "lucide-react";
import { CustomerSegment, ServiceStatus, PaymentMethod } from "../types";

interface CustomerActivityFeedProps {
  customerId: string;
  onBack: () => void;
}

interface CombinedEvent {
  id: string;
  type: "WHATSAPP" | "SERVICE_TICKET" | "INVOICE";
  timestamp: string;
  title: string;
  badge: string;
  badgeColor: string;
  content: string;
  status: string;
  meta: any;
}

export const CustomerActivityFeed: React.FC<CustomerActivityFeedProps> = ({
  customerId,
  onBack,
}) => {
  const { showToast } = useToast();
  const {
    customers,
    services,
    transactions,
    currentUser,
    currentTenantId,
    addLog,
  } = useSaaS();

  // Load WhatsApp Logs from Local Storage to integrate with the feed
  const [waLogs, setWaLogs] = useState<any[]>([]);

  // Function to load logs from local storage
  const loadWaLogs = () => {
    const saved = localStorage.getItem(
      "saas_wa_logs_" + (currentTenantId || "default"),
    );
    if (saved) {
      try {
        setWaLogs(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading WhatsApp logs", e);
      }
    }
  };

  // Load once and listen for custom storage changes
  useEffect(() => {
    loadWaLogs();

    // Support local sync in single session
    const handleStorageChange = () => {
      loadWaLogs();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Filter templates from localStorage for the composer
  const templates = useMemo(() => {
    const saved = localStorage.getItem(
      "saas_wa_templates_" + (currentTenantId || "default"),
    );
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: "tpl-1",
        name: "Pemberitahuan Servis Selesai",
        category: "SERVICE_UPDATE",
        content:
          "Halo *{customer_name}*, unit servis Anda *{device_name}* dengan Tiket *{ticket_no}* saat ini berstatus: *{ticket_status}*.\n\nCatatan: {status_note}\n\nTerima kasih.",
      },
      {
        id: "tpl-2",
        name: "Pengingat Tagihan Invoice",
        category: "INVOICE_REMINDER",
        content:
          "Yth. *{customer_name}*, kami menginfokan tagihan Invoice *{invoice_no}* sebesar *Rp {invoice_amount}* saat ini belum terbayar (BELUM LUNAS).\n\nHormat kami.",
      },
    ];
  }, []);

  // Find the selected customer
  const customer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Find customer-specific datasets
  const customerTickets = useMemo(() => {
    return services.filter(
      (s) => s.customerId === customerId && s.tenantId === currentTenantId,
    );
  }, [services, customerId, currentTenantId]);

  const customerTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.customerId === customerId && t.tenantId === currentTenantId,
    );
  }, [transactions, customerId, currentTenantId]);

  const customerWaLogs = useMemo(() => {
    if (!customer) return [];
    return waLogs.filter(
      (log) =>
        log.recipientPhone.replace(/[\s-]/g, "") ===
          customer.phone.replace(/[\s-]/g, "") ||
        log.recipientName.toLowerCase() === customer.name.toLowerCase(),
    );
  }, [waLogs, customer]);

  // Combined Chronological Feed
  const chronologicalFeed = useMemo<CombinedEvent[]>(() => {
    const events: CombinedEvent[] = [];

    // 1. Add WhatsApp Messages
    customerWaLogs.forEach((log) => {
      events.push({
        id: log.id,
        type: "WHATSAPP",
        timestamp: log.timestamp,
        title: `Pesan WhatsApp (${log.type === "MANUAL_CHAT" ? "Manual Chat" : "Sistem Otomatis"})`,
        badge: "WHATSAPP",
        badgeColor: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        content: log.message,
        status: log.status,
        meta: {
          channel: log.channel,
          senderName: log.senderName,
          status: log.status,
        },
      });
    });

    // 2. Add Service Tickets
    customerTickets.forEach((ticket) => {
      events.push({
        id: ticket.id,
        type: "SERVICE_TICKET",
        timestamp: ticket.timeline[0]?.timestamp || new Date().toISOString(), // Use start timeline date
        title: `Servis Ticket: ${ticket.ticketNo}`,
        badge: "SERVICE TICKET",
        badgeColor: "bg-blue-100 text-blue-800 border border-blue-200",
        content: `Unit: *${ticket.deviceBrandModel}* (${ticket.deviceName})\nKerusakan: _${ticket.customerComplaints}_\nEstimasi Biaya: *Rp ${(ticket.estimatedCost ?? 0).toLocaleString()}*`,
        status: ticket.status,
        meta: {
          ticketNo: ticket.ticketNo,
          status: ticket.status,
          assignedTechId: ticket.assignedTechId || "Belum ditugaskan",
        },
      });
    });

    // 3. Add POS Transactions (Invoices)
    customerTransactions.forEach((tx) => {
      events.push({
        id: tx.id,
        type: "INVOICE",
        timestamp: tx.timestamp,
        title: `Faktur Pembelian: ${tx.invoiceNo}`,
        badge: "INVOICE",
        badgeColor: "bg-amber-100 text-amber-800 border border-amber-200",
        content: `Pembelian senilai *Rp ${(tx.grandTotal ?? 0).toLocaleString()}* via *${tx.paymentMethod}*. ${tx.isRefunded ? "⛔ DIREFUND" : "✅ LUNAS"}`,
        status: tx.isRefunded ? "REFUNDED" : "PAID",
        meta: {
          invoiceNo: tx.invoiceNo,
          paymentMethod: tx.paymentMethod,
          isRefunded: tx.isRefunded,
        },
      });
    });

    // Sort descending (latest events first)
    return events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [customerWaLogs, customerTickets, customerTransactions]);

  // Composer States
  const [composerTemplateId, setComposerTemplateId] =
    useState<string>("custom");
  const [composerMessage, setComposerMessage] = useState<string>("");

  useEffect(() => {
    if (!customer) return;

    if (composerTemplateId === "custom") {
      setComposerMessage(
        `Halo Kak ${customer.name}, ada yang bisa kami bantu mengenai layanan perbaikan Anda hari ini?`,
      );
      return;
    }

    const tpl = templates.find((t) => t.id === composerTemplateId);
    if (!tpl) return;

    // Resolve variables dynamically
    let msg = tpl.content;
    msg = msg.replace(/{customer_name}/g, customer.name);

    if (tpl.category === "SERVICE_UPDATE") {
      const latestTicket = customerTickets[0] || {
        ticketNo: "TKT-001",
        deviceName: "MacBook Air M1 2020",
        status: "PENGERJAAN",
        estimatedCost: 1200000,
      };
      msg = msg
        .replace(/{device_name}/g, latestTicket.deviceName)
        .replace(/{ticket_no}/g, latestTicket.ticketNo)
        .replace(/{ticket_status}/g, latestTicket.status.replace("_", " "))
        .replace(
          /{status_note}/g,
          "Unit telah diperiksa oleh Teknisi Senior kami.",
        );
    } else if (tpl.category === "INVOICE_REMINDER") {
      const latestTx = customerTransactions[0] || {
        invoiceNo: "INV-10922",
        grandTotal: 1500000,
      };
      msg = msg
        .replace(/{invoice_no}/g, latestTx.invoiceNo)
        .replace(
          /{invoice_amount}/g,
          (latestTx.grandTotal ?? 0).toLocaleString(),
        )
        .replace(
          /{payment_link}/g,
          `https://rpr.mks/pay-${latestTx.invoiceNo.toLowerCase()}`,
        );
    }

    setComposerMessage(msg);
  }, [
    composerTemplateId,
    customer,
    customerTickets,
    customerTransactions,
    templates,
  ]);

  // Quick Send WA action
  const handleComposerSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!composerMessage.trim()) return;

    // Simulate real-time delivery status logic (85% delivered/read)
    const possibleStatuses: Array<"SENT" | "DELIVERED" | "READ" | "FAILED"> = [
      "READ",
      "DELIVERED",
      "READ",
      "SENT",
    ];
    const chosenStatus =
      possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];

    const newLog = {
      id: "wa-" + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      recipientName: customer.name,
      recipientPhone: customer.phone,
      type: composerTemplateId === "custom" ? "MANUAL_CHAT" : "SERVICE_UPDATE",
      message: composerMessage,
      status: chosenStatus,
      senderName: `${currentUser.name} (CRM Chat)`,
      channel: "Meta Cloud API",
    };

    // Append to local storage
    const savedLogs = localStorage.getItem(
      "saas_wa_logs_" + (currentTenantId || "default"),
    );
    let logsArray = [];
    if (savedLogs) {
      try {
        logsArray = JSON.parse(savedLogs);
      } catch (err) {}
    }

    const updated = [newLog, ...logsArray];
    localStorage.setItem(
      "saas_wa_logs_" + (currentTenantId || "default"),
      JSON.stringify(updated),
    );
    setWaLogs(updated);

    addLog(
      "WhatsApp Direct Sent from CRM Profile",
      `Mengirim pesan WhatsApp CRM ke ${customer.name} via Profil Detail. Status: ${chosenStatus}`,
      "SERVICE",
    );

    showToast(
      `WhatsApp terkirim ke ${customer.name}! Status: ${chosenStatus}`,
      "success",
    );

    // Clear composer
    setComposerTemplateId("custom");
  };

  if (!customer) {
    return (
      <div className="p-10 text-center text-slate-500 font-medium">
        <p>Customer tidak ditemukan.</p>
        <button
          onClick={onBack}
          className="mt-4 text-xs font-bold text-blue-600 hover:underline"
        >
          Kembali ke Database
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" id="crm-profile-activity-feed">
      {/* Header and Back navigation */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <button
          onClick={onBack}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition duration-200 cursor-pointer text-slate-500 hover:text-slate-800"
          title="Kembali ke Daftar Pelanggan"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase font-mono bg-emerald-50 px-2 py-0.5 rounded">
            Informasi CRM & Profil Aktivitas
          </span>
          <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight mt-1">
            Detail Profil: {customer.name}
          </h2>
        </div>
      </div>

      {/* Main Grid: Info + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Profile overview & CRM quick statistics (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Main Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                  {customer.name}
                </h3>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-[8.5px] font-bold font-mono uppercase ${
                    customer.segment === CustomerSegment.CORPORATE
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-slate-100 text-slate-800 border border-slate-200"
                  }`}
                >
                  {customer.segment}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-semibold">
                  {customer.phone}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Referral:{" "}
                  <strong className="font-mono">{customer.referralCode}</strong>
                </span>
              </div>
            </div>

            {/* Loyalty points & credit metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Loyalty Points
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-800">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span className="font-mono font-extrabold text-xs">
                    {customer.loyaltyPoints} pts
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Store Credit
                </p>
                <div className="flex items-center justify-center gap-1 mt-1 text-emerald-600">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-mono font-extrabold text-xs">
                    Rp {(customer.storeCredit ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick WhatsApp Composer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Kirim Pesan WhatsApp CRM
            </h3>

            <form onSubmit={handleComposerSend} className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-bold">
                  Pilih Template
                </label>
                <select
                  value={composerTemplateId}
                  onChange={(e) => setComposerTemplateId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white cursor-pointer text-xs"
                >
                  <option value="custom">Ketik Pesan Custom Bebas</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-bold">
                  Rancangan Pesan (WhatsApp MD)
                </label>
                <textarea
                  rows={4}
                  value={composerMessage}
                  onChange={(e) => setComposerMessage(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-sans leading-relaxed text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp Sekarang</span>
              </button>
            </form>
          </div>

          {/* Card 3: Brief Summary KPIs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider font-mono">
              Overview Rekening & Transaksi
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Tiket Servis:</span>
                <span className="font-bold font-mono text-blue-600">
                  {customerTickets.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Transaksi POS:</span>
                <span className="font-bold font-mono text-amber-600">
                  {customerTransactions.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-1.5 border-t border-slate-200/60 font-bold">
                <span>Total Kontribusi Sales:</span>
                <span className="font-mono text-emerald-600">
                  Rp{" "}
                  {customerTransactions
                    .reduce(
                      (acc, curr) =>
                        acc + (curr.isRefunded ? 0 : (curr.grandTotal ?? 0)),
                      0,
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Chronological Activity Feed (Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Kronologi Histori Aktivitas (Activity Feed)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Urutan kronologis seluruh komunikasi WhatsApp, transaksi
                  invoice, & perubahan status servis.
                </p>
              </div>

              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                {chronologicalFeed.length} Events Total
              </span>
            </div>

            {/* Vertical Timeline implementation */}
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {chronologicalFeed.length > 0 ? (
                chronologicalFeed.map((event, idx) => {
                  return (
                    <div
                      key={event.id}
                      className="relative group animate-fadeIn"
                    >
                      {/* Timeline Node Icon marker */}
                      <span
                        className={`absolute -left-6 top-1 h-5.5 w-5.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${
                          event.type === "WHATSAPP"
                            ? "bg-emerald-600 text-white"
                            : event.type === "SERVICE_TICKET"
                              ? "bg-blue-600 text-white"
                              : "bg-amber-600 text-white"
                        }`}
                      >
                        {event.type === "WHATSAPP" && (
                          <MessageSquare className="w-2.5 h-2.5" />
                        )}
                        {event.type === "SERVICE_TICKET" && (
                          <Wrench className="w-2.5 h-2.5" />
                        )}
                        {event.type === "INVOICE" && (
                          <FileText className="w-2.5 h-2.5" />
                        )}
                      </span>

                      {/* Event Details Bubble */}
                      <div className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 rounded-2xl p-4 transition duration-200 space-y-2">
                        {/* Event header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[11px] text-slate-800">
                              {event.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold font-mono uppercase ${event.badgeColor}`}
                            >
                              {event.badge}
                            </span>
                          </div>

                          <div className="text-slate-400 text-[10px] font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(event.timestamp).toLocaleString(
                                "id-ID",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Content text block with simulated markdown rendering */}
                        <div className="text-xs text-slate-600 leading-relaxed font-sans bg-white border border-slate-100/80 rounded-xl p-3">
                          <p className="whitespace-pre-wrap">
                            {event.content.split("\n").map((line, lIdx) => {
                              const escaped = line
                                .replace(/&/g, "&amp;")
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;")
                                .replace(/\"/g, "&quot;")
                                .replace(/'/g, "&#039;");
                              const parts = escaped.split(/(\*[^*]+\*|_[^_]+_)/g);
                              return (
                                <span
                                  key={lIdx}
                                  className="block min-h-[12px]"
                                >
                                  {parts.map((part, pIdx) => {
                                    if (/^\*[^*]+\*$/.test(part)) return <strong key={pIdx}>{part.slice(1, -1)}</strong>;
                                    if (/^_[^_]+_$/.test(part)) return <em key={pIdx}>{part.slice(1, -1)}</em>;
                                    return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                                  })}
                                </span>
                              );
                            })}
                          </p>
                        </div>

                        {/* Status indicators and action summaries */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200/50 pt-1.5 mt-2">
                          <div>
                            {event.type === "WHATSAPP" && (
                              <span>
                                Channel: {event.meta.channel} · Staf:{" "}
                                {event.meta.senderName}
                              </span>
                            )}
                            {event.type === "SERVICE_TICKET" && (
                              <span>Petugas: {event.meta.assignedTechId}</span>
                            )}
                            {event.type === "INVOICE" && (
                              <span>Metode: {event.meta.paymentMethod}</span>
                            )}
                          </div>

                          {/* Delivery status indicator badge */}
                          <div>
                            {event.type === "WHATSAPP" && (
                              <div className="flex items-center gap-1 font-bold">
                                {event.status === "READ" && (
                                  <span className="text-blue-600 flex items-center gap-0.5">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>READ</span>
                                  </span>
                                )}
                                {event.status === "DELIVERED" && (
                                  <span className="text-emerald-600 flex items-center gap-0.5">
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                    <span>DELIVERED</span>
                                  </span>
                                )}
                                {event.status === "SENT" && (
                                  <span className="text-slate-500 flex items-center gap-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>SENT</span>
                                  </span>
                                )}
                                {event.status === "FAILED" && (
                                  <span className="text-red-500 flex items-center gap-0.5">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>FAILED</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {event.type === "SERVICE_TICKET" && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] tracking-wide uppercase ${
                                  event.status === ServiceStatus.DIAMBIL
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                }`}
                              >
                                Status: {event.status}
                              </span>
                            )}

                            {event.type === "INVOICE" && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] tracking-wide uppercase ${
                                  event.status === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}
                              >
                                {event.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 italic py-16">
                  Tidak ditemukan histori aktivitas terkait customer ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
