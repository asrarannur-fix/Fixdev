import React, { useState, useEffect, useMemo } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  MessageSquare,
  Send,
  Settings2,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Smartphone,
  Sliders,
  Database,
  Check,
  CheckCheck,
  HelpCircle,
  FileText,
  Calendar,
  User,
  Plus,
  Trash2,
  Bell,
  Search,
  Filter,
  CheckCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
  Info,
  Layers,
  Sparkles,
  Play,
  Pause as PauseIcon,
  PlusCircle,
  BookOpen,
  Terminal,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  type:
    | "SERVICE_UPDATE"
    | "INVOICE_REMINDER"
    | "PROMOTION"
    | "MANUAL_CHAT"
    | "BROADCAST"
    | "APPOINTMENT_CONFIRM";
  message: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  senderName: string;
  channel: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "SERVICE_UPDATE" | "INVOICE_REMINDER" | "PROMOTION" | "CUSTOM";
  content: string;
}

export interface WhatsAppQueueItem {
  id: string;
  recipientName: string;
  recipientPhone: string;
  type: "SERVICE_UPDATE" | "INVOICE_REMINDER" | "PROMOTION" | "CUSTOM" | "APPOINTMENT_CONFIRM";
  message: string;
  scheduledTime: string;
  status: "PENDING" | "PAUSED";
}

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "tpl-1",
    name: "Pemberitahuan Servis Selesai",
    category: "SERVICE_UPDATE",
    content:
      "Halo *{customer_name}*, unit servis Anda *{device_name}* dengan Tiket *{ticket_no}* saat ini berstatus: *{ticket_status}*.\n\nCatatan: {status_note}\n\nTerima kasih telah memercayai Mac Repair Center Makassar.",
  },
  {
    id: "tpl-2",
    name: "Pengingat Tagihan Invoice",
    category: "INVOICE_REMINDER",
    content:
      "Yth. *{customer_name}*, kami menginfokan tagihan Invoice *{invoice_no}* sebesar *Rp {invoice_amount}* saat ini belum terbayar (BELUM LUNAS).\n\nAnda dapat melakukan pembayaran online atau konfirmasi di: {payment_link}\n\nHormat kami, Tim Keuangan.",
  },
  {
    id: "tpl-3",
    name: "Promo Servis Akhir Bulan",
    category: "PROMOTION",
    content:
      "Kabar gembira *{customer_name}*! Dapatkan Diskon *20%* untuk pembersihan thermal paste & debu iMac/MacBook Anda khusus minggu ini.\n\nTunjukkan pesan WA ini ke kasir kami untuk klaim. Promo valid s/d akhir bulan!",
  },
  {
    id: "tpl-4",
    name: "Konfirmasi Kunjungan Lapangan",
    category: "CUSTOM",
    content:
      "Halo *{customer_name}*, kami mengonfirmasi jadwal kunjungan Teknisi Lapangan kami pada tanggal *{visit_date}* pukul *{visit_time}*.\n\nTeknisi: {technician_name}\nLayanan: {visit_issue}\n\nMohon pastikan Anda berada di lokasi. Terima kasih.",
  },
];

const DEFAULT_TRIGGERS = {
  serviceUpdate: { enabled: true, templateId: "tpl-1" },
  invoiceReminder: { enabled: true, templateId: "tpl-2" },
  appointmentConfirm: { enabled: true, templateId: "tpl-4" },
};

const getSeedQueue = () => [
  {
    id: "q-1",
    recipientName: "Siti Rahma B2B",
    recipientPhone: "+62 852-1122-3344",
    type: "INVOICE_REMINDER" as const,
    message:
      "Yth. *Siti Rahma B2B*, kami menginfokan tagihan Invoice *INV-10928* sebesar *Rp 6,500,000* saat ini belum terbayar (BELUM LUNAS).\n\nSilakan selesaikan pembayaran sebelum tanggal jatuh tempo.",
    scheduledTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: "PENDING" as const,
  },
  {
    id: "q-2",
    recipientName: "Hendra Wijaya",
    recipientPhone: "+62 811-9080-7060",
    type: "SERVICE_UPDATE" as const,
    message:
      "Halo *Hendra Wijaya*, unit servis Anda *iMac 27-inch* dengan Tiket *TKT-002* saat ini berstatus: *DIAGNOSA SELESAI*.\n\nCatatan: Butuh penggantian SSD dan instal ulang OS. Estimasi biaya Rp 1.200.000.",
    scheduledTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    status: "PENDING" as const,
  },
  {
    id: "q-3",
    recipientName: "Rudi Hartono",
    recipientPhone: "+62 821-4455-6677",
    type: "PROMOTION" as const,
    message:
      "Kabar gembira *Rudi Hartono*! Dapatkan Diskon *20%* untuk pembersihan thermal paste & debu iMac/MacBook Anda khusus minggu ini.",
    scheduledTime: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    status: "PAUSED" as const,
  },
];

const getSeedLogs = () => [
  {
    id: "wa-1",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    recipientName: "Budi Santoso",
    recipientPhone: "+62 812-3456-7890",
    type: "SERVICE_UPDATE" as const,
    message:
      "Halo *Budi Santoso*, unit servis Anda *MacBook Pro 13 2017* dengan Tiket *TKT-001* saat ini berstatus: *SELESAI QC*.\n\nCatatan: Lolos uji rendering GPU selama 2 jam. Suhu stabil 65°C.\n\nTerima kasih telah memercayai Mac Repair Center Makassar.",
    status: "READ" as const,
    senderName: "Sistem Otomatis",
    channel: "Meta Cloud API",
  },
  {
    id: "wa-2",
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
    recipientName: "Siti Rahma B2B",
    recipientPhone: "+62 852-1122-3344",
    type: "INVOICE_REMINDER" as const,
    message:
      "Yth. *Siti Rahma B2B*, kami menginfokan tagihan Invoice *INV-10928* sebesar *Rp 6,500,000* saat ini belum terbayar (BELUM LUNAS).\n\nAnda dapat melakukan pembayaran online atau konfirmasi di: https://rpr.mks/pay-10928\n\nHormat kami, Tim Keuangan.",
    status: "DELIVERED" as const,
    senderName: "Sistem Otomatis",
    channel: "Meta Cloud API",
  },
  {
    id: "wa-3",
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    recipientName: "Hendra Wijaya",
    recipientPhone: "+62 811-9080-7060",
    type: "MANUAL_CHAT" as const,
    message:
      "Selamat siang Pak Hendra, pengerjaan upgrade SSD iMac 27-inch Bapak sudah dimulai ya. Estimasi selesai jam 4 sore ini. Kami fotokan perkembangannya nanti.",
    status: "READ" as const,
    senderName: "Yusuf (Customer Service)",
    channel: "Local Session Node",
  },
  {
    id: "wa-4",
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
    recipientName: "Amanda Putri",
    recipientPhone: "+62 813-5566-7788",
    type: "APPOINTMENT_CONFIRM" as const,
    message:
      "Halo *Amanda Putri*, kami mengonfirmasi jadwal kunjungan Teknisi Lapangan kami pada tanggal *2026-07-01* pukul *10:00 AM*.\n\nTeknisi: Fajar Rahmad\nLayanan: Perbaikan Jaringan Wi-Fi Kantor\n\nMohon pastikan Anda berada di lokasi. Terima kasih.",
    status: "SENT" as const,
    senderName: "Sistem Otomatis",
    channel: "Meta Cloud API",
  },
  {
    id: "wa-5",
    timestamp: new Date(Date.now() - 480 * 60000).toISOString(),
    recipientName: "Rudi Hartono",
    recipientPhone: "+62 821-4455-6677",
    type: "SERVICE_UPDATE" as const,
    message:
      "Halo *Rudi Hartono*, unit servis Anda *Asus ROG GL503* dengan Tiket *TKT-003* saat ini berstatus: *DIAGNOSA SELESAI*.\n\nCatatan: Kerusakan pada IC Power regulator, estimasi biaya Rp 850.000.\n\nTerima kasih.",
    status: "FAILED" as const,
    senderName: "Sistem Otomatis",
    channel: "Meta Cloud API",
  },
];

export const WhatsAppConnector: React.FC = () => {
  const {
    customers,
    services,
    transactions,
    fieldVisits,
    currentTenantId,
    currentUser,
    tenants,
    updateTenant,
    addLog,
  } = useSaaS();

  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === currentTenantId),
    [tenants, currentTenantId],
  );
  const waCfg = activeTenant?.settings?.waConfig;

  // Filter lists based on current Tenant
  const tenantCustomers = useMemo(
    () => customers.filter((c) => c.tenantId === currentTenantId),
    [customers, currentTenantId],
  );
  const tenantServices = useMemo(
    () => services.filter((s) => s.tenantId === currentTenantId),
    [services, currentTenantId],
  );
  const tenantTransactions = useMemo(
    () => transactions.filter((t) => t.tenantId === currentTenantId),
    [transactions, currentTenantId],
  );
  const tenantVisits = useMemo(
    () => fieldVisits.filter((v) => v.tenantId === currentTenantId),
    [fieldVisits, currentTenantId],
  );

  // Active module tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "templates" | "queue" | "contactHistory" | "settings"
  >("dashboard");

  // State for API configuration
  const [gateway, setGateway] = useState<"fonnte" | "meta" | "wablas" | "local">(
    () => (waCfg?.gateway as any) || "fonnte",
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    () => waCfg?.isConnected ?? false,
  );
  const [apiToken, setApiToken] = useState<string>(
    () => waCfg?.apiToken || "",
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    () => waCfg?.phoneNumber || "+62 811-445-9921",
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<number>(0);

  // States for Reusable Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => {
    if (waCfg?.templates) return waCfg.templates as WhatsAppTemplate[];
    const saved = localStorage.getItem(`saas_wa_templates_${currentTenantId}`);
    if (saved) return JSON.parse(saved);
    return DEFAULT_TEMPLATES;
  });

  // States for Automated Triggers config
  const [triggers, setTriggers] = useState(() => {
    if (waCfg?.triggers) return waCfg.triggers;
    const saved = localStorage.getItem(`wa_triggers_${currentTenantId}`);
    if (saved) return JSON.parse(saved);
    return DEFAULT_TRIGGERS;
  });

  // State for Pending Automated Message Queue
  const [queue, setQueue] = useState<WhatsAppQueueItem[]>(() => {
    const saved = localStorage.getItem(`saas_wa_queue_${currentTenantId}`);
    if (saved) return JSON.parse(saved);
    return getSeedQueue();
  });

  // State for WhatsApp delivery log with persistent local storage
  const [logs, setLogs] = useState<WhatsAppLog[]>(() => {
    const saved = localStorage.getItem(`saas_wa_logs_${currentTenantId}`);
    if (saved) return JSON.parse(saved);
    return getSeedLogs();
  });

  // Sync state when tenant changes
  useEffect(() => {
    if (!currentTenantId) return;

    // Load templates
    const savedTpl = localStorage.getItem(`saas_wa_templates_${currentTenantId}`);
    if (savedTpl) {
      try { setTemplates(JSON.parse(savedTpl)); } catch (e) { console.error(e); }
    } else if (waCfg?.templates) {
      setTemplates(waCfg.templates as WhatsAppTemplate[]);
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }

    // Load triggers
    const savedTrig = localStorage.getItem(`wa_triggers_${currentTenantId}`);
    if (savedTrig) {
      try { setTriggers(JSON.parse(savedTrig)); } catch (e) { console.error(e); }
    } else if (waCfg?.triggers) {
      setTriggers(waCfg.triggers);
    } else {
      setTriggers(DEFAULT_TRIGGERS);
    }

    // Load queue
    const savedQueue = localStorage.getItem(`saas_wa_queue_${currentTenantId}`);
    if (savedQueue) {
      try { setQueue(JSON.parse(savedQueue)); } catch (e) { console.error(e); }
    } else {
      setQueue(getSeedQueue());
    }

    // Load logs
    const savedLogs = localStorage.getItem(`saas_wa_logs_${currentTenantId}`);
    if (savedLogs) {
      try { setLogs(JSON.parse(savedLogs)); } catch (e) { console.error(e); }
    } else {
      setLogs(getSeedLogs());
    }
  }, [currentTenantId, waCfg]);

  // Manual Composer states
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("custom");
  const [manualMessage, setManualMessage] = useState<string>("");
  const [manualSearchQuery, setManualSearchQuery] = useState<string>("");

  // WhatsApp Meta Cloud API & Gateway Configuration states
  const [waSendingMethod, setWaSendingMethod] = useState<"API" | "MANUAL">(
    () => (waCfg?.sendingMethod as "API" | "MANUAL") || "MANUAL",
  );
  const [waSyncEstimate, setWaSyncEstimate] = useState<boolean>(
    () => waCfg?.syncEstimate ?? true,
  );
  const [waPhoneId, setWaPhoneId] = useState(
    () => waCfg?.phoneId || "105938472910398",
  );
  const [waWabaId, setWaWabaId] = useState(
    () => waCfg?.wabaId || "394029481029302",
  );
  const [waWebhookSecret, setWaWebhookSecret] = useState(
    () => waCfg?.webhookSecret || "saas_verify_token_tamalanrea_2026",
  );
  const waCallbackUrl = (waCfg as any)?.callbackUrl
    || (import.meta as any).env?.VITE_WA_CALLBACK_URL
    || `${window.location.origin}/api/v1/webhooks/whatsapp`;
  const [whatsappKey, setWhatsappKey] = useState(
    () => waCfg?.whatsappKey || "waba_mock_api_key_placeholder",
  );

  const debouncedWaConfig = useDebounce({
    gateway,
    isConnected,
    apiToken: apiToken.trim(),
    phoneNumber: phoneNumber.trim(),
    triggers,
    templates,
    sendingMethod: waSendingMethod,
    syncEstimate: waSyncEstimate,
    phoneId: waPhoneId.trim(),
    wabaId: waWabaId.trim(),
    webhookSecret: waWebhookSecret.trim(),
    whatsappKey: whatsappKey.trim(),
  }, 1000);

  // Simulators states
  const [simWaIncomingText, setSimWaIncomingText] = useState(
    "status TKT/2606/0001",
  );
  const [simWaWebhookLogs, setSimWaWebhookLogs] = useState<string[]>([]);
  const [isSimulatingWaWebhook, setIsSimulatingWaWebhook] =
    useState<boolean>(false);

  const handleSimulateWaWebhook = () => {
    if (!simWaIncomingText.trim()) return;
    setIsSimulatingWaWebhook(true);
    const trimmedInput = simWaIncomingText.trim();
    setSimWaWebhookLogs([
      `📡 [Web Server] Request POST diterima pada route: ${waCallbackUrl}`,
      `🔐 [Keamanan] Memvalidasi signature webhook (X-Hub-Signature-256)...`,
      `✓ [Keamanan] Signature valid! Webhook secret "${waWebhookSecret}" cocok.`,
    ]);

    setTimeout(() => {
      const q = trimmedInput.toLowerCase();
      setSimWaWebhookLogs((prev) => [
        ...prev,
        `🔍 [CRM Parser] Menganalisis pesan masuk: "${trimmedInput}"`,
      ]);

      setTimeout(() => {
        let responseText = "";
        const matchTicket = tenantServices.find(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.ticketNo.toLowerCase().includes(q) ||
            (q.includes("status") && q.includes(s.id.toLowerCase())) ||
            (q.includes("status") && q.includes(s.ticketNo.toLowerCase())),
        );

        if (matchTicket) {
          const cust = tenantCustomers.find(
            (c) => c.id === matchTicket.customerId,
          );
          responseText = `Halo Kak *${cust?.name || "Pelanggan"}*,\n\nBerikut adalah status perangkat *${matchTicket.deviceName}* Anda:\n\n• *Nomor Tiket*: ${matchTicket.ticketNo}\n• *Suhu/Keluhan*: ${matchTicket.customerComplaints}\n• *Status*: ${matchTicket.status}\n• *Biaya Estimasi*: Rp ${(matchTicket.estimatedCost || 0).toLocaleString()}\n\nUnit Anda sedang diproses oleh teknisi kami. Terima kasih!`;
          setSimWaWebhookLogs((prev) => [
            ...prev,
            `✓ [Database] Menemukan data Servis: ${matchTicket.ticketNo} (${matchTicket.deviceName})`,
            `👤 [SaaS CRM] Relasi pelanggan ditemukan: ${cust?.name || "Unregistered"}`,
          ]);
        } else if (q.includes("halo") || q.includes("hi") || q.includes("p")) {
          responseText =
            "Halo! Selamat datang di bot layanan otomatis *Komputer Makassar Service*. Kirimkan nomor tiket servis Anda (contoh: *TKT/2606/0001*) untuk cek status otomatis.";
          setSimWaWebhookLogs((prev) => [
            ...prev,
            `ℹ️ [CRM Parser] Trigger pencarian tidak spesifik. Mengembalikan template Welcome Greeting.`,
          ]);
        } else {
          responseText =
            "Mohon maaf, nomor tiket tidak ditemukan di database kami. Silakan ketik nomor tiket dengan format *TKT/2606/XXXX* secara lengkap.";
          setSimWaWebhookLogs((prev) => [
            ...prev,
            `⚠️ [CRM Parser] No matching ticket found for "${trimmedInput}"`,
          ]);
        }

        setTimeout(() => {
          setSimWaWebhookLogs((prev) => [
            ...prev,
            `📤 [Meta API] Mengirim response JSON payload via API (Phone ID: ${waPhoneId})`,
            `📝 [JSON Outbound]:\n${JSON.stringify(
              {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "+628123456789",
                type: "text",
                text: { body: responseText },
              },
              null,
              2,
            )}`,
            `✓ [API Selesai] HTTP 200 OK. Respon berhasil dikirim via WhatsApp API.`,
          ]);
          setIsSimulatingWaWebhook(false);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Search log state
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [logFilterType, setLogFilterType] = useState<string>("ALL");

  // Template editor states
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<
    "SERVICE_UPDATE" | "INVOICE_REMINDER" | "PROMOTION" | "CUSTOM"
  >("CUSTOM");
  const [tplContent, setTplContent] = useState("");

  // Contact history drilldown states
  const [drilldownCustomerId, setDrilldownCustomerId] = useState<string>("");
  const [drilldownSearchQuery, setDrilldownSearchQuery] = useState<string>("");

  // Save WA config to DB via updateTenant
  useEffect(() => {
    if (!currentTenantId || !activeTenant) return;
    const current = activeTenant?.settings?.waConfig || {};
    updateTenant(currentTenantId, {
      settings: {
        ...(activeTenant?.settings || {}),
        waConfig: {
          ...current,
          ...debouncedWaConfig,
        },
      },
    });
  }, [debouncedWaConfig, currentTenantId, activeTenant, updateTenant]);

  useEffect(() => {
    if (!currentTenantId) return;
    localStorage.setItem(`saas_wa_logs_${currentTenantId}`, JSON.stringify(logs));
    window.dispatchEvent(new Event("storage"));
  }, [logs, currentTenantId]);

  useEffect(() => {
    if (!currentTenantId) return;
    localStorage.setItem(`saas_wa_queue_${currentTenantId}`, JSON.stringify(queue));
  }, [queue, currentTenantId]);

  // Handler to simulate QR Code scan
  const startQRScan = () => {
    if (isConnected) {
      setIsConnected(false);
      addLog(
        "WhatsApp Disconnected",
        `Memutuskan koneksi WhatsApp dari nomor ${phoneNumber}`,
        "SECURITY",
        "MEDIUM",
      );
      return;
    }

    setIsScanning(true);
    setScanStep(1);

    setTimeout(() => {
      setScanStep(2);
      setTimeout(() => {
        setScanStep(3);
        setTimeout(() => {
          setIsConnected(true);
          setIsScanning(false);
          setScanStep(0);
          setPhoneNumber("+62 811-445-9921");
          addLog(
            "WhatsApp Pairing Success",
            "Berhasil mengoneksikan WhatsApp API Node menggunakan scan QR Code Web Session.",
            "ADMIN",
            "MEDIUM",
          );
        }, 1200);
      }, 1200);
    }, 1200);
  };

  // Helper to test connection
  const testConnection = () => {
    showToast(
      "Koneksi WhatsApp Gateway AKTIF!\nPing Response: 18ms\nWhatsApp Web Node Version: v2.24.12\nQuota: 14,821 / 15,000 Pesan.",
      "success",
    );
  };

  // Toggle dynamic triggers
  const handleToggleTrigger = (
    triggerKey: "serviceUpdate" | "invoiceReminder" | "appointmentConfirm",
  ) => {
    setTriggers((prev) => {
      const next = { ...prev };
      next[triggerKey].enabled = !next[triggerKey].enabled;
      addLog(
        "WhatsApp Trigger Config",
        `Mengubah trigger ${triggerKey} menjadi ${next[triggerKey].enabled ? "AKTIF" : "NONAKTIF"}`,
        "SYSTEM",
      );
      return next;
    });
  };

  const handleUpdateTriggerTemplate = (
    triggerKey: "serviceUpdate" | "invoiceReminder" | "appointmentConfirm",
    tplId: string,
  ) => {
    setTriggers((prev) => {
      const next = { ...prev };
      next[triggerKey].templateId = tplId;
      return next;
    });
  };

  // Populate composer when template or customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setManualMessage("");
      return;
    }

    const custObj = tenantCustomers.find((c) => c.id === selectedCustomer);
    if (!custObj) return;

    if (selectedTemplateId === "custom") {
      setManualMessage(
        `Halo Kak ${custObj.name}, ada yang bisa kami bantu hari ini?`,
      );
      return;
    }

    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    // Resolve variables
    let msg = tpl.content;
    msg = msg.replace(/{customer_name}/g, custObj.name);

    if (tpl.category === "SERVICE_UPDATE") {
      const ticket = tenantServices.find(
        (s) => s.customerId === selectedCustomer,
      ) || {
        ticketNo: "TKT-20811",
        deviceName: "MacBook Pro 15 2018",
        status: "DIAGNOSA_SELESAI",
        estimatedCost: 850000,
      };
      msg = msg
        .replace(/{device_name}/g, ticket.deviceName)
        .replace(/{ticket_no}/g, ticket.ticketNo)
        .replace(/{ticket_status}/g, ticket.status.replace("_", " "))
        .replace(
          /{status_note}/g,
          "Estimasi biaya perbaikan Rp " +
            (ticket.estimatedCost ?? 0).toLocaleString() +
            ". Menunggu persetujuan Anda.",
        );
    } else if (tpl.category === "INVOICE_REMINDER") {
      const tx = tenantTransactions.find(
        (t) => t.customerId === selectedCustomer,
      ) || {
        invoiceNo: "INV-10992",
        grandTotal: 1500000,
      };
      msg = msg
        .replace(/{invoice_no}/g, tx.invoiceNo)
        .replace(/{invoice_amount}/g, (tx.grandTotal ?? 0).toLocaleString())
        .replace(
          /{payment_link}/g,
          `https://rpr.mks/pay-${tx.invoiceNo.toLowerCase()}`,
        );
    } else if (tpl.category === "CUSTOM") {
      const visit = tenantVisits.find(
        (v) => v.customerId === selectedCustomer,
      ) || {
        scheduledDate: "2026-07-02",
        scheduledTime: "10:00 WITA",
        technicianName: "Fajar Rahmad",
        issue: "Perbaikan Wi-Fi Kantor Sederhana",
      };
      msg = msg
        .replace(/{visit_date}/g, visit.scheduledDate)
        .replace(/{visit_time}/g, visit.scheduledTime)
        .replace(/{technician_name}/g, visit.technicianName)
        .replace(/{visit_issue}/g, visit.issue);
    }

    setManualMessage(msg);
  }, [
    selectedCustomer,
    selectedTemplateId,
    templates,
    tenantCustomers,
    tenantServices,
    tenantTransactions,
    tenantVisits,
  ]);

  // Handle Manual Message Submission
  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      showToast("Pilih pelanggan penerima terlebih dahulu!", "error");
      return;
    }
    if (!manualMessage.trim()) {
      showToast("Pesan tidak boleh kosong!", "error");
      return;
    }
    if (!isConnected) {
      showToast(
        "WhatsApp Gateway belum terkoneksi! Silakan pairing terlebih dahulu.",
        "error",
      );
      return;
    }

    const custObj = tenantCustomers.find((c) => c.id === selectedCustomer);
    if (!custObj) return;

    // Determine target status randomly for simulation of live delivery (90% Delivered/Read, 10% Failed)
    const statuses: Array<"SENT" | "DELIVERED" | "READ" | "FAILED"> = [
      "READ",
      "DELIVERED",
      "READ",
      "SENT",
      "FAILED",
    ];
    const simulatedStatus =
      statuses[Math.floor(Math.random() * statuses.length)];

    const newLog: WhatsAppLog = {
      id: "wa-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      recipientName: custObj.name,
      recipientPhone: custObj.phone,
      type: selectedTemplateId === "custom" ? "MANUAL_CHAT" : "BROADCAST",
      message: manualMessage,
      status: simulatedStatus,
      senderName: `${currentUser.name} (Staf)`,
      channel:
        gateway === "meta"
          ? "Meta Cloud API"
          : gateway === "wablas"
            ? "Unofficial Gateway (Wablas)"
            : "Local Session Node",
    };

    setLogs((prev) => [newLog, ...prev]);
    addLog(
      "WhatsApp Direct Sent",
      `Mengirim pesan manual via WhatsApp ke ${custObj.name} dengan status ${simulatedStatus}`,
      "SERVICE",
    );

    showToast(
      `WhatsApp berhasil dikirim ke ${custObj.name}! Status: ${simulatedStatus}.`,
      "success",
    );
    setManualMessage("");
    setSelectedTemplateId("custom");
  };

  // Re-send log item
  const handleResendLog = (logItem: WhatsAppLog) => {
    if (!isConnected) {
      showToast("WhatsApp API belum terkoneksi!", "error");
      return;
    }

    const reLogged: WhatsAppLog = {
      ...logItem,
      id: "wa-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      status: "SENT",
      senderName: `${currentUser.name} (Resend)`,
    };

    setLogs((prev) => [reLogged, ...prev]);
    addLog(
      "WhatsApp Re-sent",
      `Mengirim ulang WhatsApp ke ${logItem.recipientName}`,
      "SERVICE",
    );
    showToast("Pesan ditambahkan ke antrean gateway!", "success");
  };

  // Template Manager: Add or Update Reusable template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplContent.trim()) {
      showToast("Nama dan konten template wajib diisi!", "error");
      return;
    }

    if (editingTemplateId) {
      // Edit
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplateId
            ? {
                ...t,
                name: tplName,
                category: tplCategory,
                content: tplContent,
              }
            : t,
        ),
      );
      showToast("Template berhasil diperbarui!", "success");
    } else {
      // Add
      const newTpl: WhatsAppTemplate = {
        id: "tpl-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: tplName,
        category: tplCategory,
        content: tplContent,
      };
      setTemplates((prev) => [...prev, newTpl]);
      showToast("Template baru berhasil ditambahkan!", "success");
    }

    // Reset editor
    setEditingTemplateId(null);
    setTplName("");
    setTplCategory("CUSTOM");
    setTplContent("");
  };

  const handleEditTemplateClick = (tpl: WhatsAppTemplate) => {
    setEditingTemplateId(tpl.id);
    setTplName(tpl.name);
    setTplCategory(tpl.category);
    setTplContent(tpl.content);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (
      await showConfirm({
        title: "Hapus Template WhatsApp",
        message:
          "Apakah Anda yakin ingin menghapus template ini? Alur kerja otomatisasi yang menggunakan template ini mungkin akan gagal.",
        confirmLabel: "Ya, Hapus",
        type: "danger",
      })
    ) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Queue actions
  const handleTriggerQueueItem = (item: WhatsAppQueueItem) => {
    if (!isConnected) {
      showToast(
        "WhatsApp Gateway tidak terhubung! Tidak dapat mengirim.",
        "error",
      );
      return;
    }

    // Move to logs
    const statuses: Array<"SENT" | "DELIVERED" | "READ" | "FAILED"> = [
      "READ",
      "DELIVERED",
      "READ",
    ];
    const simStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const newLog: WhatsAppLog = {
      id: "wa-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      recipientName: item.recipientName,
      recipientPhone: item.recipientPhone,
      type: item.type as any,
      message: item.message,
      status: simStatus,
      senderName: "Sistem Otomatis (Queue Trigger)",
      channel: gateway === "meta" ? "Meta Cloud API" : "Local Session Node",
    };

    setLogs((prev) => [newLog, ...prev]);
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    addLog(
      "WhatsApp Queue Dispatched",
      `Mengirim pesan otomatis terjadwal ke ${item.recipientName}. Status: ${simStatus}`,
      "SERVICE",
    );
    showToast(
      `Pesan untuk ${item.recipientName} dikirim dari antrean!`,
      "success",
    );
  };

  const handleToggleQueuePause = (itemId: string) => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id === itemId) {
          const nextStatus = q.status === "PENDING" ? "PAUSED" : "PENDING";
          return { ...q, status: nextStatus };
        }
        return q;
      }),
    );
  };

  const handleDeleteQueueItem = async (itemId: string) => {
    if (
      await showConfirm({
        title: "Hapus Antrean Pesan",
        message:
          "Hapus pesan ini dari antrean automated trigger? Pesan tidak akan dikirim ke pelanggan.",
        confirmLabel: "Hapus Pesan",
        type: "warning",
      })
    ) {
      setQueue((prev) => prev.filter((q) => q.id !== itemId));
    }
  };

  // Filter logs for the table
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.recipientName
          .toLowerCase()
          .includes(logSearchQuery.toLowerCase()) ||
        log.recipientPhone.includes(logSearchQuery) ||
        log.message.toLowerCase().includes(logSearchQuery.toLowerCase());

      const matchesFilter =
        logFilterType === "ALL" || log.type === logFilterType;
      return matchesSearch && matchesFilter;
    });
  }, [logs, logSearchQuery, logFilterType]);

  // Contact History Filter
  const drilldownHistory = useMemo(() => {
    if (!drilldownCustomerId) return [];
    const cust = tenantCustomers.find((c) => c.id === drilldownCustomerId);
    if (!cust) return [];

    return logs.filter(
      (log) =>
        log.recipientPhone.replace(/[\s-]/g, "") ===
          cust.phone.replace(/[\s-]/g, "") ||
        log.recipientName.toLowerCase() === cust.name.toLowerCase(),
    );
  }, [logs, drilldownCustomerId, tenantCustomers]);

  return (
    <div className="space-y-6 animate-fadeIn" id="whatsapp-connector-module">
      {/* Title & Introduction Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600/15 to-teal-600/5 dark:from-emerald-950/20 dark:to-teal-950/5 p-5 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                WhatsApp CRM & Gateway Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Manajemen automasi follow-up tagihan, status servis real-time,
                template broadcast, & histori komunikasi CRM.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Subtabs */}
        <div
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 self-start md:self-auto shadow-inner"
          id="whatsapp-subtabs-container"
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            id="whatsapp-tab-dashboard"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "dashboard"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-800/80 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dashboard & Logs</span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            id="whatsapp-tab-templates"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "templates"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-800/80 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Template Editor</span>
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            id="whatsapp-tab-queue"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "queue"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-800/80 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Antrean Tertunda</span>
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("contactHistory")}
            id="whatsapp-tab-contactHistory"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "contactHistory"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-800/80 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>CRM Contact History</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            id="whatsapp-tab-settings"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              activeTab === "settings"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-800/80 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Pengaturan Gateway</span>
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: DASHBOARD & LOGS */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gateway Settings Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Connection Status & QR Code scanner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-emerald-500" />
                    Konfigurasi WhatsApp Gateway
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                    />
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">
                      {isConnected ? "CONNECTED" : "DISCONNECTED"}
                    </span>
                  </div>
                </div>

                {/* Gateway Selectors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    {
                      id: "fonnte",
                      title: "Fonnte API",
                      note: "Token per penyewa",
                    },
                    {
                      id: "meta",
                      title: "Meta Cloud API",
                      note: "Official Integration",
                    },
                    {
                      id: "wablas",
                      title: "Wablas API",
                      note: "Third-party Service",
                    },
                    {
                      id: "local",
                      title: "Local Session",
                      note: "Scan Web QR Node",
                    },
                  ].map((gw) => (
                    <button
                      key={gw.id}
                      onClick={() => setGateway(gw.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        gateway === gw.id
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50"
                      }`}
                    >
                      <p className="font-sans text-[11px]">{gw.title}</p>
                      <span className="text-[8px] font-mono opacity-80 block mt-1 font-normal">
                        {gw.note}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs pt-1">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-slate-400 mb-1.5 font-bold tracking-wider">
                      {gateway === "fonnte"
                        ? "FONNTE ENDPOINT"
                        : gateway === "meta"
                          ? "META BUSINESS PHONE ID"
                          : "GATEWAY URL ENDPOINT"}
                    </label>
                    <input
                      type="text"
                      value={
                        gateway === "fonnte"
                          ? "https://api.fonnte.com/send"
                          : gateway === "meta"
                            ? "109827391920839"
                            : gateway === "wablas"
                              ? "https://api.wablas.com/api/v2/send-message"
                              : "http://localhost:3000/api/wa/session"
                      }
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 outline-none font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-slate-400 mb-1.5 font-bold tracking-wider">
                      {gateway === "fonnte" ? "FONNTE TOKEN PENYEWA" : "API BEARER ACCESS TOKEN"}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2 text-slate-700 dark:text-slate-300 outline-none font-mono text-[11px]"
                      />
                      <div className="absolute right-2.5 top-1.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <Copy
                          className="w-3.5 h-3.5"
                          onClick={() => {
                            navigator.clipboard.writeText(apiToken);
                            showToast(
                              "API Token tersalin ke clipboard!",
                              "success",
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Connection QR Scan */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner shrink-0">
                      {isConnected ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                      ) : isScanning ? (
                        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                      ) : (
                        <QrCode className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                        {isConnected
                          ? `Sesi Aktif: ${phoneNumber}`
                          : "WhatsApp Terputus"}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                        {isConnected
                          ? "Koneksi stabil. Token gateway penyewa aktif untuk antrean otomatis."
                          : isScanning
                            ? `Menginisialisasi QR handshake (${scanStep}/3)...`
                            : "Pilih Fonnte lalu masukkan Token API milik penyewa ini."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    {isConnected && (
                      <button
                        onClick={testConnection}
                        className="flex-1 md:flex-initial bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl transition duration-150 cursor-pointer"
                      >
                        Ping Test
                      </button>
                    )}
                    <button
                      onClick={startQRScan}
                      disabled={isScanning}
                      className={`flex-1 md:flex-initial font-bold text-xs px-4 py-2 rounded-xl text-white shadow-sm transition duration-150 cursor-pointer ${
                        isConnected
                          ? "bg-red-600 hover:bg-red-700"
                          : isScanning
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isConnected
                        ? "Putuskan"
                        : isScanning
                          ? `Pairing (${scanStep}/3)`
                          : "Koneksikan WA"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Automated Workflows trigger mappings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-500" />
                    Pemicu Notifikasi Otomatis (Trigger Workflows)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ERP Webhook Hooks
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Service Update trigger card */}
                  <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          1. Update Status Tiket Servis
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal pl-4">
                        Dikirim otomatis saat status pengerjaan unit berubah di
                        Dashboard Servis.
                      </p>
                      <div className="pl-4 pt-1.5 flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Template aktif:</span>
                        <select
                          value={triggers.serviceUpdate.templateId}
                          onChange={(e) =>
                            handleUpdateTriggerTemplate(
                              "serviceUpdate",
                              e.target.value,
                            )
                          }
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10.5px] cursor-pointer"
                        >
                          {templates
                            .filter((t) => t.category === "SERVICE_UPDATE")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleTrigger("serviceUpdate")}
                      className="cursor-pointer"
                    >
                      {triggers.serviceUpdate.enabled ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <span className="text-[9px] font-bold">AKTIF</span>
                          <ToggleRight className="w-7 h-7" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[9px] font-bold">MATI</span>
                          <ToggleLeft className="w-7 h-7" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Invoice Reminder trigger card */}
                  <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          2. Pengingat Invoice Unpaid
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal pl-4">
                        Mengirimkan rincian tagihan & tautan bayar online untuk
                        faktur belum lunas.
                      </p>
                      <div className="pl-4 pt-1.5 flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Template aktif:</span>
                        <select
                          value={triggers.invoiceReminder.templateId}
                          onChange={(e) =>
                            handleUpdateTriggerTemplate(
                              "invoiceReminder",
                              e.target.value,
                            )
                          }
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10.5px] cursor-pointer"
                        >
                          {templates
                            .filter((t) => t.category === "INVOICE_REMINDER")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleTrigger("invoiceReminder")}
                      className="cursor-pointer"
                    >
                      {triggers.invoiceReminder.enabled ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <span className="text-[9px] font-bold">AKTIF</span>
                          <ToggleRight className="w-7 h-7" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[9px] font-bold">MATI</span>
                          <ToggleLeft className="w-7 h-7" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Appointment Confirmation trigger card */}
                  <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          3. Janji Temu Field Service
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal pl-4">
                        Konfirmasi jadwal kunjungan teknisi lapangan otomatis ke
                        WhatsApp customer.
                      </p>
                      <div className="pl-4 pt-1.5 flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Template aktif:</span>
                        <select
                          value={triggers.appointmentConfirm.templateId}
                          onChange={(e) =>
                            handleUpdateTriggerTemplate(
                              "appointmentConfirm",
                              e.target.value,
                            )
                          }
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10.5px] cursor-pointer"
                        >
                          {templates
                            .filter((t) => t.category === "CUSTOM")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleTrigger("appointmentConfirm")}
                      className="cursor-pointer"
                    >
                      {triggers.appointmentConfirm.enabled ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <span className="text-[9px] font-bold">AKTIF</span>
                          <ToggleRight className="w-7 h-7" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[9px] font-bold">MATI</span>
                          <ToggleLeft className="w-7 h-7" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Messenger Composer & Phone Mockup */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-500" />
                  Kirim WhatsApp CRM Direct
                </h3>

                <form onSubmit={handleSendManual} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Pilih Customer Penerima
                    </label>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Cari penerima..."
                        value={manualSearchQuery}
                        onChange={(e) => setManualSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none cursor-pointer text-xs"
                      required
                    >
                      <option value="">
                        -- Pilih Nomor Handphone Pelanggan --
                      </option>
                      {tenantCustomers
                        .filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(manualSearchQuery.toLowerCase()),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Gunakan Reusable Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none cursor-pointer text-xs"
                    >
                      <option value="custom">Ketik Pesan Custom Bebas</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          [{tpl.category}] {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Rancangan Isi Pesan (Markdown)
                    </label>
                    <textarea
                      rows={4}
                      value={manualMessage}
                      onChange={(e) => setManualMessage(e.target.value)}
                      placeholder="Gunakan *tebal* atau _miring_ untuk mempercantik chat WA..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none font-sans leading-relaxed"
                      required
                    />
                  </div>

                  {/* Phone Mockup Screen */}
                  <div className="space-y-1 bg-[#ece5dd] dark:bg-[#0b141a] p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[140px] relative font-sans text-slate-900 shadow-inner">
                    <div className="flex items-center gap-2 border-b border-emerald-900/10 dark:border-slate-800 pb-1.5 mb-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[8px] font-bold">
                        {selectedCustomer
                          ? tenantCustomers
                              .find((c) => c.id === selectedCustomer)
                              ?.name.slice(0, 2)
                              .toUpperCase()
                          : "CS"}
                      </div>
                      <div>
                        <p className="font-bold text-[9px] text-slate-800 dark:text-slate-200 leading-none">
                          {selectedCustomer
                            ? tenantCustomers.find(
                                (c) => c.id === selectedCustomer,
                              )?.name
                            : "Simulasi Penerima"}
                        </p>
                      </div>
                    </div>

                    {manualMessage ? (
                      <div className="max-w-[90%] bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 rounded-xl rounded-tr-none px-2.5 py-1.5 text-[10px] shadow-sm ml-auto font-sans">
                        <p className="whitespace-pre-wrap font-sans text-left">
                          {manualMessage.split("\n").map((line, lIdx) => {
                            const escaped = line
                              .replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;")
                              .replace(/"/g, "&quot;")
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
                        <div className="text-right text-[7.5px] text-slate-400 dark:text-emerald-300 mt-1 flex items-center justify-end gap-0.5">
                          <span>Sekarang</span>
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-[9.5px] italic text-slate-400 py-6">
                        Ketik pesan di atas untuk simulasi visualisasi gelembung
                        chat WhatsApp...
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Pesan WhatsApp CRM</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Delivery Logs / Comm logs table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Antrean WhatsApp & Log Histori Pengiriman
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Seluruh notifikasi otomatis & manual dicatat real-time beserta
                  indikator efficacy delivery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Cari kata kunci..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10.5px] outline-none w-32 focus:w-44 transition-all"
                  />
                </div>

                <select
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10.5px] outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Jenis</option>
                  <option value="SERVICE_UPDATE">Servis</option>
                  <option value="INVOICE_REMINDER">Invoice</option>
                  <option value="APPOINTMENT_CONFIRM">Kunjungan</option>
                  <option value="MANUAL_CHAT">Manual</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 uppercase text-[9px] font-mono border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Penerima & Nomor</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Isi Notifikasi</th>
                    <th className="px-5 py-3">Node Channel</th>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3">Status Kirim</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                      >
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {log.recipientName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {log.recipientPhone}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                              log.type === "SERVICE_UPDATE"
                                ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 border border-blue-100/30"
                                : log.type === "INVOICE_REMINDER"
                                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 border border-amber-100/30"
                                  : log.type === "PROMOTION"
                                    ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300 border border-purple-100/30"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {log.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-xs md:max-w-sm">
                          <p
                            className="truncate text-slate-600 dark:text-slate-300 font-sans"
                            title={log.message}
                          >
                            {log.message}
                          </p>
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {log.channel}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleString("id-ID", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          {log.status === "READ" && (
                            <span className="text-blue-600 font-bold flex items-center gap-1 text-[10px] tracking-wide">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>READ</span>
                            </span>
                          )}
                          {log.status === "DELIVERED" && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px] tracking-wide">
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>DELIVERED</span>
                            </span>
                          )}
                          {log.status === "SENT" && (
                            <span className="text-slate-500 font-bold flex items-center gap-1 text-[10px] tracking-wide">
                              <Check className="w-3.5 h-3.5" />
                              <span>SENT</span>
                            </span>
                          )}
                          {log.status === "FAILED" && (
                            <span className="text-red-500 font-bold flex items-center gap-1 text-[10px] tracking-wide">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleResendLog(log)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer flex items-center gap-0.5 justify-end ml-auto"
                          >
                            <RefreshCw className="w-2.5 h-2.5 animate-hover" />
                            <span>Kirim Ulang</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-slate-400 italic"
                      >
                        Tidak ditemukan catatan log pengiriman WhatsApp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/30 px-5 py-3 text-[10px] border-t border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 flex justify-between items-center font-mono">
              <span>
                💡 Multi-tenant isolate: `{currentTenantId}` database security
                rules fully active.
              </span>
              <span>Total API Calls: {logs.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: TEMPLATE EDITOR */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Template Creator Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              {editingTemplateId
                ? "Edit Template WhatsApp"
                : "Buat Template WhatsApp Reusable"}
            </h3>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                  Nama / Judul Template
                </label>
                <input
                  type="text"
                  placeholder="Misal: Tagihan Jatuh Tempo H+1"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                  Kategori Pesan
                </label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none cursor-pointer"
                >
                  <option value="SERVICE_UPDATE">
                    Update Status Servis (Automated)
                  </option>
                  <option value="INVOICE_REMINDER">
                    Pengingat Tagihan Invoice (Automated)
                  </option>
                  <option value="PROMOTION">
                    Promosi / Penawaran (Marketing Campaign)
                  </option>
                  <option value="CUSTOM">Custom / Umum (Support & Chat)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                    Konten Pesan WhatsApp (Mendukung Dynamic Tags)
                  </label>
                  <span className="text-[9px] text-slate-400 italic">
                    Klik tag untuk memasukkan
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Ketik template pesan Anda..."
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none font-sans leading-relaxed"
                  required
                />

                {/* Variable Tags Helpers */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {[
                    { tag: "{customer_name}", desc: "Nama Pelanggan" },
                    { tag: "{ticket_no}", desc: "No Tiket" },
                    { tag: "{device_name}", desc: "Nama Unit" },
                    { tag: "{ticket_status}", desc: "Status Servis" },
                    { tag: "{invoice_no}", desc: "No Invoice" },
                    { tag: "{invoice_amount}", desc: "Total Invoice" },
                    { tag: "{visit_date}", desc: "Tgl Kunjungan" },
                    { tag: "{visit_time}", desc: "Jam Kunjungan" },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() =>
                        setTplContent((prev) => prev + " " + v.tag)
                      }
                      className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-[8.5px] font-mono px-2 py-1 rounded-md transition border border-slate-200/50 dark:border-slate-700 cursor-pointer"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl shadow-sm transition"
                >
                  {editingTemplateId
                    ? "Simpan Perubahan"
                    : "Simpan Template Baru"}
                </button>
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTplName("");
                      setTplCategory("CUSTOM");
                      setTplContent("");
                    }}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Template Catalog / List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Katalog Template Terdaftar
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Gunakan template yang telah dibuat untuk mempercepat
                    komunikasi logistik & invoicing.
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                  {templates.length} Active Templates
                </span>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-slate-200 dark:hover:border-slate-700 transition bg-slate-50/20 dark:bg-slate-950/10"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {tpl.name}
                        </p>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[7.5px] font-bold font-mono uppercase ${
                            tpl.category === "SERVICE_UPDATE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                              : tpl.category === "INVOICE_REMINDER"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                : tpl.category === "PROMOTION"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {tpl.category.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditTemplateClick(tpl)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="text-[10px] text-red-600 dark:text-red-400 font-extrabold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {tpl.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 3: PENDING AUTOMATED QUEUE */}
      {activeTab === "queue" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Antrean Pesan Otomatis Tertunda (Pending Automated Queue)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Automasi asinkron yang dijadwalkan sistem ERP untuk dikirimkan
                secara sekuensial.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
              {queue.length} Scheduled
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase text-[9px] font-mono border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Penerima</th>
                  <th className="px-4 py-3">Kategori Pemicu</th>
                  <th className="px-4 py-3">Draft Isi Pesan</th>
                  <th className="px-4 py-3">Waktu Eksekusi</th>
                  <th className="px-4 py-3">Status Antrean</th>
                  <th className="px-4 py-3 text-right">Aksi Manual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                {queue.length > 0 ? (
                  queue.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.recipientName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.recipientPhone}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                            item.type === "SERVICE_UPDATE"
                              ? "bg-blue-100 text-blue-800"
                              : item.type === "INVOICE_REMINDER"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {item.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p
                          className="truncate text-slate-600 dark:text-slate-300"
                          title={item.message}
                        >
                          {item.message}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px]">
                        {new Date(item.scheduledTime).toLocaleString("id-ID", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.status === "PENDING" ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>WAITING</span>
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 w-fit">
                            <PauseIcon className="w-3 h-3 text-slate-500" />
                            <span>PAUSED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleTriggerQueueItem(item)}
                          className="text-[10.5px] text-emerald-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                          title="Kirim Paksa Sekarang"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>Kirim Sekarang</span>
                        </button>
                        <button
                          onClick={() => handleToggleQueuePause(item.id)}
                          className="text-[10.5px] text-blue-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                        >
                          {item.status === "PENDING" ? "Pause" : "Resume"}
                        </button>
                        <button
                          onClick={() => handleDeleteQueueItem(item.id)}
                          className="text-[10.5px] text-red-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Batal</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400 italic"
                    >
                      Tidak ada antrean pesan terjadwal yang aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDER TAB 4: CRM CONTACT HISTORY DRILLDOWN */}
      {activeTab === "contactHistory" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Riwayat Komunikasi Spesifik Customer (Drilldown)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Inspeksi korespondensi terarah WhatsApp dari satu basis profil
              customer CRM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Customer List selector */}
            <div className="md:col-span-1 border-r border-slate-100 dark:border-slate-800/80 pr-2 space-y-3.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari customer..."
                  value={drilldownSearchQuery}
                  onChange={(e) => setDrilldownSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none w-full"
                />
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {tenantCustomers
                  .filter((c) =>
                    c.name
                      .toLowerCase()
                      .includes(drilldownSearchQuery.toLowerCase()),
                  )
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setDrilldownCustomerId(c.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition duration-150 cursor-pointer block ${
                        drilldownCustomerId === c.id
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 font-bold"
                          : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <p className="truncate font-sans">{c.name}</p>
                      <p className="text-[9.5px] text-slate-400 mt-0.5 font-mono">
                        {c.phone}
                      </p>
                    </button>
                  ))}
              </div>
            </div>

            {/* Drilldown results */}
            <div className="md:col-span-3 space-y-4">
              {drilldownCustomerId ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200">
                        {
                          tenantCustomers.find(
                            (c) => c.id === drilldownCustomerId,
                          )?.name
                        }
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {
                          tenantCustomers.find(
                            (c) => c.id === drilldownCustomerId,
                          )?.phone
                        }{" "}
                        ·{" "}
                        {
                          tenantCustomers.find(
                            (c) => c.id === drilldownCustomerId,
                          )?.email
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[9px]">
                        {drilldownHistory.length} Messages Found
                      </span>
                    </div>
                  </div>

                  {/* Drilldown chronological feed */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {drilldownHistory.length > 0 ? (
                      drilldownHistory.map((log) => (
                        <div
                          key={log.id}
                          className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-1.5 shadow-sm text-[11px]"
                        >
                          <div className="flex justify-between items-start text-[10px]">
                            <span className="text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {log.status === "READ" && (
                              <span className="text-blue-600 font-bold flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3" />
                                <span>READ</span>
                              </span>
                            )}
                            {log.status === "DELIVERED" && (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3 text-slate-400" />
                                <span>DELIVERED</span>
                              </span>
                            )}
                            {log.status === "SENT" && (
                              <span className="text-slate-500 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" />
                                <span>SENT</span>
                              </span>
                            )}
                            {log.status === "FAILED" && (
                              <span className="text-red-500 font-bold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" />
                                <span>FAILED</span>
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-sans leading-relaxed text-slate-700 dark:text-slate-300">
                            {log.message}
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Channel: {log.channel}</span>
                            <span>Dikirim oleh: {log.senderName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 italic py-12">
                        Belum ada korespondensi WhatsApp dengan customer ini.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                  <User className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs">
                    Pilih salah satu customer di kolom kiri untuk melihat
                    riwayat korespondensi WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 5: GATEWAY CONFIGURATION & SANDBOX TESTER */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Main settings section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Config Panel */}
              <div className="lg:col-span-6 space-y-5 text-xs">
                {/* Method selector */}
                <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/5 border border-emerald-200/50 dark:border-emerald-950 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-300 font-extrabold">
                    <MessageSquare className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>Metode Pengiriman Notifikasi WhatsApp</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pilih bagaimana sistem mengirimkan notifikasi status servis
                    (Tanda Terima, Diagnosa, Estimasi Biaya, Perbaikan Selesai,
                    dan Klaim Garansi) ke nomor WhatsApp pelanggan.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setWaSendingMethod("API");
                        addLog(
                          "WhatsApp Settings Update",
                          "Mengubah metode pengiriman menjadi Otomatis via API",
                          "SYSTEM",
                        );
                      }}
                      className={`p-3.5 rounded-xl border text-left flex gap-3 transition-all cursor-pointer ${
                        waSendingMethod === "API"
                          ? "bg-white dark:bg-slate-950 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-white/50 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          waSendingMethod === "API"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {waSendingMethod === "API" && (
                          <span className="text-[10px]">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          Otomatis via Meta Cloud API
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          Sistem langsung mengirimkan pesan ke nomor pelanggan
                          secara background, dan mencatat log Meta Cloud API
                          secara otomatis.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWaSendingMethod("MANUAL");
                        addLog(
                          "WhatsApp Settings Update",
                          "Mengubah metode pengiriman menjadi Manual via wa.me",
                          "SYSTEM",
                        );
                      }}
                      className={`p-3.5 rounded-xl border text-left flex gap-3 transition-all cursor-pointer ${
                        waSendingMethod === "MANUAL"
                          ? "bg-white dark:bg-slate-950 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-white/50 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          waSendingMethod === "MANUAL"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {waSendingMethod === "MANUAL" && (
                          <span className="text-[10px]">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          Manual (WhatsApp Web / Link wa.me)
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          Saat status berubah, pop-up draf notifikasi akan
                          muncul. Operator dapat meninjau, mengedit, lalu
                          mengirim manual via WhatsApp Web.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Sync Estimate Option */}
                  <div className="border-t border-emerald-100/70 pt-3.5 mt-3.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Sinkronkan Rincian Estimasi Biaya
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Sertakan rincian estimasi biaya perbaikan dan daftar
                        suku cadang yang digunakan ke dalam draf pesan WhatsApp
                        secara otomatis.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={waSyncEstimate}
                        onChange={(e) => {
                          setWaSyncEstimate(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative after:duration-200"></div>
                    </label>
                  </div>
                </div>

                {/* Credentials block */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-300 font-bold">
                    <Settings2 className="w-4 h-4 text-indigo-600" />
                    <span>Kredensial Meta WhatsApp Business Cloud API</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Gunakan panel developer Meta di{" "}
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline font-mono"
                    >
                      developers.facebook.com
                    </a>{" "}
                    untuk mendaftarkan nomor resmi dan mendapatkan Token Akses
                    Permanen Sistem.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={waPhoneId}
                        onChange={(e) => {
                          setWaPhoneId(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 focus:border-slate-300 dark:border-slate-800 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                        WABA ID (Business Account ID)
                      </label>
                      <input
                        type="text"
                        value={waWabaId}
                        onChange={(e) => {
                          setWaWabaId(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 focus:border-slate-300 dark:border-slate-800 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                        Verify Token (Webhook Secret)
                      </label>
                      <input
                        type="password"
                        value={waWebhookSecret}
                        onChange={(e) => {
                          setWaWebhookSecret(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 focus:border-slate-300 dark:border-slate-800 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                        Webhook Callback URL
                      </label>
                      <input
                        type="text"
                        value={waCallbackUrl}
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl outline-none font-mono text-slate-400 cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      System Permanent User Access Token (Bearer Key)
                    </label>
                    <input
                      type="password"
                      value={whatsappKey}
                      onChange={(e) => {
                        setWhatsappKey(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 focus:border-slate-300 dark:border-slate-800 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Right Sandbox Tester Panel */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                        Uji Webhook Live & Bot CRM
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
                      PORT 3000 Web Receiver
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ketik pesan WhatsApp seolah-olah dikirim oleh pelanggan
                    untuk memicu validasi, parsing string tiket, querying
                    database, dan template auto-reply di backend.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={simWaIncomingText}
                      onChange={(e) => setSimWaIncomingText(e.target.value)}
                      placeholder="Contoh: status TKT/2606/0001"
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 outline-none"
                    />
                    <button
                      onClick={handleSimulateWaWebhook}
                      disabled={isSimulatingWaWebhook || !simWaIncomingText}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs"
                    >
                      {isSimulatingWaWebhook ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Kirim & Uji</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Console logs output */}
                  {simWaWebhookLogs.length > 0 && (
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-1.5 font-mono text-[10px] text-slate-300 max-h-56 overflow-y-auto">
                      <div className="text-slate-500 font-bold text-[9px] uppercase border-b border-slate-900 pb-1 flex justify-between items-center">
                        <span>SANDBOX STANDARD OUT (STDOUT)</span>
                        <button
                          onClick={() => setSimWaWebhookLogs([])}
                          className="hover:text-white transition cursor-pointer text-[8px]"
                        >
                          Clear
                        </button>
                      </div>
                      {simWaWebhookLogs.map((logLine, idx) => (
                        <div
                          key={idx}
                          className="leading-relaxed whitespace-pre-wrap"
                        >
                          {logLine}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
