import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { SubscriptionTier, SaaSInvoice, UserRole } from "../types";
import { usePrintConfig } from "../hooks/usePrintConfig";
import { printFrame } from "../utils/printJob";
import {
  getPrintFontSizePx,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";
import { useSaaSBilling } from "../hooks/useSaaSBilling";
import { readJsonResponse } from "../utils/apiResponse";
import {
  Check,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  QrCode,
  Terminal,
  HelpCircle,
  FileText,
  Download,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building,
  Users,
  HardDrive,
} from "lucide-react";

interface Plan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    users: number;
    branches: number;
    storageMb: number;
    maxServiceTickets: number;
    maxPosTransactions: number;
    features: string[];
  };
}

export default function SaaSSubscription({ readOnlyMode = false, section = "all" }: { readOnlyMode?: boolean; section?: "all" | "billing" | "gateway" }) {
  const { currentUser, currentTenantId, tenants, updateTenant, apiFetch } =
    useSaaS();
  const printConfig = usePrintConfig();
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [simpleView, setSimpleView] = useState<"overview" | "invoices" | "settings">("overview");
  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    return isSuperAdmin ? tenants[0]?.id || "" : currentTenantId;
  });

  const activeTenant = tenants.find((t) => t.id === selectedTenantId);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (tenants.length === 0) {
      if (selectedTenantId) setSelectedTenantId("");
      return;
    }
    if (!activeTenant) setSelectedTenantId(tenants[0].id);
  }, [isSuperAdmin, tenants, selectedTenantId, activeTenant]);

  const {
    plans,
    loading,
    billingError,
    usingFallbackPlans,
    billingCycle,
    setBillingCycle,
    selectedPlan,
    setSelectedPlan,
    invoice,
    setInvoice,
    paymentLoading,
    invoices,
    cronLogs,
    setCronLogs,
    cronLoading,
    paymentTimer,
    showQrModal,
    setShowQrModal,
    detailModalInvoice,
    setDetailModalInvoice,
    loadPlansAndHistory,
    handleSelectPlan,
    handleToggleAutoRenew,
    handleRunCronSimulation,
  } = useSaaSBilling(
    selectedTenantId,
    activeTenant,
    isSuperAdmin ? () => undefined : updateTenant,
    apiFetch,
    readOnlyMode,
  );

  const { showToast } = useToast();

  const planPrices = Object.fromEntries(plans.map((plan) => [plan.tier, plan.priceMonthly]));
  const planDistribution = tenants.reduce<Record<string, number>>((acc, tenant) => {
    const tier = tenant.tier || SubscriptionTier.BASIC;
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});
  const estimatedMrr = tenants.reduce((sum, tenant) => sum + (planPrices[tenant.tier || SubscriptionTier.BASIC] || 0), 0);
  const outstandingInvoices = invoices.filter((inv) => inv.status !== "PAID").length;
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE").length;

  const handlePrintInvoice = (inv: SaaSInvoice) => {
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

    const fontSizePx = getPrintFontSizePx(printConfig);
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName: "SAAS ERP INDONESIA",
      subtitle: "Bukti Pembayaran Langganan",
    });
    const footerHtml = getPrintFooterHtml(
      printConfig,
      "Terima kasih atas kepercayaan Anda.",
    );
    const termsHtml = getPrintTermsHtml(printConfig, "general");

    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Invoice - ${inv.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 10px; font-size: ${fontSizePx}px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="hr"></div>
          <p>Invoice ID: ${inv.id}</p>
          <p>Tanggal: ${inv.date}</p>
          <p>Tenant: ${activeTenant?.name || "Merchant"}</p>
          <div class="hr"></div>
          <p class="bold">Item: Paket SaaS ${inv.tier}</p>
          <p>Siklus: ${inv.billingCycle || "-"}</p>
          <p>Status: ${inv.status === "PAID" ? "PAID / LUNAS" : inv.status}</p>
          <div class="hr"></div>
          <p class="bold">TOTAL: Rp ${inv.amount.toLocaleString()}</p>
          <div class="hr"></div>
          <div class="text-center" style="margin-top: 20px;">
            <p>Terima kasih atas kepercayaan Anda.</p>
            <p style="font-size: 8px;">Digital Signature Verified</p>
          </div>
          ${footerHtml}
          ${termsHtml}
        </body>
      </html>
    `);
    printDoc.close();
    setTimeout(() => {
      if (printIframe.contentWindow) {
        printFrame(printIframe, printConfig, "SaaS Invoice");
      }
    }, 500);
  };

  // Payment Gateway Config State (Super Admin Only)
  const [gatewayConfig, setGatewayConfig] = useState({
    merchantId: "",
    serverKeyMasked: "",
    serverKeyInput: "",
    clientKey: "",
    isProduction: false,
    isEnabled: false,
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState("");
  const [manualConfig, setManualConfig] = useState({
    bankTransferEnabled: false,
    manualQrisEnabled: false,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    instructions: "",
    qrisImageUrl: "",
    qrisObjectPath: "",
    qrisOriginalName: "",
    qrisConfigured: false,
  });
  const [manualConfigSaving, setManualConfigSaving] = useState(false);
  const [manualQrisFile, setManualQrisFile] = useState<File | null>(null);

  // Subscription Plan Editor States (Super Admin Only)
  const [selectedConfigTier, setSelectedConfigTier] =
    useState<SubscriptionTier>(SubscriptionTier.BASIC);
  const [configPlanName, setConfigPlanName] = useState("");
  const [configPlanPriceMonthly, setConfigPlanPriceMonthly] = useState(0);
  const [configPlanPriceYearly, setConfigPlanPriceYearly] = useState(0);
  const [configPlanUserLimit, setConfigPlanUserLimit] = useState(3);
  const [configPlanBranchLimit, setConfigPlanBranchLimit] = useState(1);
  const [configPlanStorageLimitMb, setConfigPlanStorageLimitMb] = useState(500);
  const [configPlanMaxServiceTickets, setConfigPlanMaxServiceTickets] = useState(50);
  const [configPlanMaxPosTransactions, setConfigPlanMaxPosTransactions] = useState(200);
  const [configPlanFeatures, setConfigPlanFeatures] = useState<string[]>([]);
  const [configPlanBulletText, setConfigPlanBulletText] = useState("");
  const [planSuccess, setPlanSuccess] = useState("");
  const [planSaveLoading, setPlanSaveLoading] = useState(false);
  const [manualInvoice, setManualInvoice] = useState<SaaSInvoice | null>(null);
  const [manualMethod, setManualMethod] = useState<"BANK_TRANSFER" | "MANUAL_QRIS">("BANK_TRANSFER");
  const [manualPayerName, setManualPayerName] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualPaidAt, setManualPaidAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [manualProof, setManualProof] = useState<File | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");
  const [invoiceCycleFilter, setInvoiceCycleFilter] = useState("");
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");
  const [invoiceMinAmount, setInvoiceMinAmount] = useState("");
  const [invoiceMaxAmount, setInvoiceMaxAmount] = useState("");

  const filteredInvoices = invoices.filter((item) => {
    const query = invoiceSearch.trim().toLowerCase();
    if (query && ![item.id, item.tier, item.status].some((value) => String(value || "").toLowerCase().includes(query))) return false;
    if (invoiceStatusFilter && item.status !== invoiceStatusFilter) return false;
    if (invoiceCycleFilter && item.billingCycle !== invoiceCycleFilter) return false;
    const invoiceTime = new Date(item.date || (item as any).createdAt || 0).getTime();
    if (invoiceDateFrom && invoiceTime < new Date(`${invoiceDateFrom}T00:00:00`).getTime()) return false;
    if (invoiceDateTo && invoiceTime > new Date(`${invoiceDateTo}T23:59:59`).getTime()) return false;
    if (invoiceMinAmount && Number(item.amount) < Number(invoiceMinAmount)) return false;
    if (invoiceMaxAmount && Number(item.amount) > Number(invoiceMaxAmount)) return false;
    return true;
  });

  const loadManualRequests = async () => {
    const query = selectedTenantId ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : "";
    const response = await apiFetch(`/api/billing/manual-payments${query}`);
    if (response.ok) {
      const data = await response.json();
      setManualRequests(Array.isArray(data.requests) ? data.requests : []);
    }
  };

  useEffect(() => {
    if (selectedTenantId) loadManualRequests().catch(() => setManualRequests([]));
  }, [selectedTenantId, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      apiFetch("/api/billing/manual-payment-config")
        .then((response) => readJsonResponse<any>(response, "Metode pembayaran manual"))
        .then((data) => setManualConfig((current) => ({ ...current, ...data })))
        .catch(() => undefined);
    }
  }, [isSuperAdmin]);

  const handleSubmitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode || !manualInvoice || !manualProof) return;
    if (!manualPayerName.trim() || !manualReference.trim()) {
      showToast("Nama pembayar dan nomor referensi wajib diisi.", "error");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(manualProof.type) || manualProof.size > 5 * 1024 * 1024) {
      showToast("Bukti harus JPG, PNG, atau PDF maksimal 5 MB.", "error");
      return;
    }
    try {
      setManualSubmitting(true);
      const uploadResponse = await apiFetch(`/api/billing/invoices/${manualInvoice.id}/manual-payments/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": selectedTenantId },
        body: JSON.stringify({ tenantId: selectedTenantId, fileName: manualProof.name, contentType: manualProof.type, sizeBytes: manualProof.size }),
      });
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json().catch(() => ({}));
        throw new Error(error.error || "Gagal membuat URL unggah bukti.");
      }
      const upload = await uploadResponse.json();
      const storageResponse = await apiFetch(upload.signedUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": manualProof.type, "X-Tenant-ID": selectedTenantId },
        body: manualProof,
      });
      if (!storageResponse.ok) throw new Error("Gagal mengunggah gambar bukti pembayaran.");

      const submitResponse = await apiFetch(`/api/billing/invoices/${manualInvoice.id}/manual-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": selectedTenantId },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          method: manualMethod,
          paidAt: new Date(manualPaidAt).toISOString(),
          payerName: manualPayerName,
          referenceNumber: manualReference,
          objectPath: upload.objectPath,
          originalName: manualProof.name,
          contentType: manualProof.type,
          sizeBytes: manualProof.size,
        }),
      });
      if (!submitResponse.ok) {
        const error = await submitResponse.json().catch(() => ({}));
        throw new Error(error.error || "Gagal mengirim formulir verifikasi pembayaran.");
      }
      showToast("Bukti pembayaran dikirim dan menunggu verifikasi Super Admin.", "success");
      setManualInvoice(null);
      setManualProof(null);
      setManualReference("");
      await Promise.all([loadPlansAndHistory(), loadManualRequests()]);
    } catch (error: any) {
      showToast(error.message || "Terjadi kesalahan saat memproses pembayaran manual.", "error");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleReviewManual = async (request: any, decision: "approve" | "reject") => {
    if (readOnlyMode) return;
    const reason = decision === "reject" ? window.prompt("Alasan penolakan:") : "";
    if (decision === "reject" && !reason?.trim()) return;
    const response = await apiFetch(`/api/billing/manual-payments/${request.id}/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: request.version, reason }),
    });
    if (!response.ok) {
      showToast((await response.json()).error || "Review gagal diproses.", "error");
      await loadManualRequests();
      return;
    }
    showToast(decision === "approve" ? "Pembayaran disetujui." : "Pembayaran ditolak.", "success");
    await Promise.all([loadPlansAndHistory(), loadManualRequests()]);
  };

  useEffect(() => {
    if (isSuperAdmin && plans.length > 0) {
      const selectedPlanData = plans.find((p) => p.tier === selectedConfigTier);
      if (selectedPlanData) {
        setConfigPlanName(selectedPlanData.name || "");
        setConfigPlanPriceMonthly(selectedPlanData.priceMonthly || 0);
        setConfigPlanPriceYearly(selectedPlanData.priceYearly || 0);
        setConfigPlanUserLimit(selectedPlanData.limits?.users || 3);
        setConfigPlanBranchLimit(selectedPlanData.limits?.branches || 1);
        setConfigPlanStorageLimitMb(selectedPlanData.limits?.storageMb || 500);
        setConfigPlanMaxServiceTickets(selectedPlanData.limits?.maxServiceTickets || 50);
        setConfigPlanMaxPosTransactions(selectedPlanData.limits?.maxPosTransactions || 200);
        setConfigPlanFeatures(selectedPlanData.limits?.features || []);
        setConfigPlanBulletText(
          selectedPlanData.features ? selectedPlanData.features.join("\n") : "",
        );
      }
    }
  }, [selectedConfigTier, plans, isSuperAdmin]);

  const handleSavePlanConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) {
      showToast("Read-only mode is active. Package configuration changes are blocked.", "error");
      return;
    }
    if (!isSuperAdmin) return;
    try {
      setPlanSaveLoading(true);
      setPlanSuccess("");

      const safeMonthly = Math.max(0, Number(configPlanPriceMonthly) || 0);
      const safeYearly = Math.max(0, Number(configPlanPriceYearly) || 0);
      const safeUsers = Math.max(1, Math.floor(Number(configPlanUserLimit) || 1));
      const safeBranches = Math.max(1, Math.floor(Number(configPlanBranchLimit) || 1));
      const safeStorage = Math.max(1, Math.floor(Number(configPlanStorageLimitMb) || 1));
      const safeServiceTickets = Math.max(0, Math.floor(Number(configPlanMaxServiceTickets) || 0));
      const safePosTransactions = Math.max(0, Math.floor(Number(configPlanMaxPosTransactions) || 0));
      const cleanPlanName = configPlanName.trim();

      const updatedPlans = plans.map((p) => {
        if (p.tier === selectedConfigTier) {
          return {
            ...p,
            name: cleanPlanName || p.name,
            priceMonthly: safeMonthly,
            priceYearly: safeYearly,
            features: configPlanBulletText
              .split("\n")
              .map((f) => f.trim())
              .filter((f) => f.length > 0),
            limits: {
              users: safeUsers,
              branches: safeBranches,
              storageMb: safeStorage,
              maxServiceTickets: safeServiceTickets,
              maxPosTransactions: safePosTransactions,
              features: configPlanFeatures,
            },
          };
        }
        return p;
      });

      const res = await apiFetch("/api/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlans),
      });

      if (res.ok) {
        setPlanSuccess(
          "Konfigurasi Paket Langganan berhasil diperbarui secara permanen!",
        );
        await loadPlansAndHistory();
        setTimeout(() => setPlanSuccess(""), 4000);
      } else {
        showToast("Gagal menyimpan konfigurasi paket langganan.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat menyimpan paket langganan.", "error");
    } finally {
      setPlanSaveLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    } else if (!isSuperAdmin) {
      setSelectedTenantId(currentTenantId);
    }
  }, [isSuperAdmin, tenants, currentTenantId]);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchGatewayConfig = async () => {
        try {
          const res = await apiFetch("/api/billing/gateway-config");
          if (res.ok) {
            const data = await res.json();
            setGatewayConfig({
              merchantId: data.merchantId || "",
              serverKeyMasked: data.serverKeyMasked || "",
              serverKeyInput: "",
              clientKey: data.clientKey || "",
              isProduction: !!data.isProduction,
              isEnabled: !!data.isEnabled,
            });
          }
        } catch (err) {
          console.error("Gagal memuat konfigurasi gateway:", err);
        }
      };
      fetchGatewayConfig();
      apiFetch("/api/billing/manual-payment-config")
        .then((response) => readJsonResponse<any>(response, "Konfigurasi pembayaran manual"))
        .then((data) => setManualConfig((current) => ({ ...current, ...data })))
        .catch((err) => console.error("Gagal memuat pembayaran manual:", err));
    }
  }, [isSuperAdmin]);

  const handleSaveManualConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) return showToast("Aktifkan Edit Mode untuk mengubah pembayaran manual.", "error");
    setManualConfigSaving(true);
    try {
      let qrisObjectPath = manualConfig.qrisObjectPath;
      let qrisOriginalName = manualConfig.qrisOriginalName;
      if (manualQrisFile) {
        if (!["image/jpeg", "image/png"].includes(manualQrisFile.type) || manualQrisFile.size > 2 * 1024 * 1024) throw new Error("QRIS harus JPG atau PNG maksimal 2 MB.");
        const upload = await readJsonResponse<any>(await apiFetch("/api/billing/manual-payment-config/qris-upload", { method: "POST", body: JSON.stringify({ fileName: manualQrisFile.name, contentType: manualQrisFile.type, sizeBytes: manualQrisFile.size }) }), "Upload QRIS");
        const storageResponse = await apiFetch(upload.signedUploadUrl, { method: "PUT", headers: { "Content-Type": manualQrisFile.type }, body: manualQrisFile });
        if (!storageResponse.ok) throw new Error("Gambar QRIS gagal diunggah.");
        qrisObjectPath = upload.objectPath;
        qrisOriginalName = manualQrisFile.name;
      }
       const saved = await readJsonResponse<any>(await apiFetch("/api/billing/manual-payment-config", { method: "PUT", body: JSON.stringify({ bankTransferEnabled: manualConfig.bankTransferEnabled, manualQrisEnabled: manualConfig.manualQrisEnabled, bankName: manualConfig.bankName, accountNumber: manualConfig.accountNumber, accountHolder: manualConfig.accountHolder, instructions: manualConfig.instructions, qrisObjectPath, qrisOriginalName }) }), "Pembayaran manual");
      const refreshed = await readJsonResponse<any>(await apiFetch("/api/billing/manual-payment-config"), "Pembayaran manual");
      setManualConfig((current) => ({ ...current, ...saved.config, ...refreshed, qrisObjectPath, qrisOriginalName }));
      setManualQrisFile(null);
      showToast("Konfigurasi pembayaran manual berhasil disimpan.", "success");
    } catch (err: any) { showToast(err.message || "Konfigurasi pembayaran manual gagal disimpan.", "error"); }
    finally { setManualConfigSaving(false); }
  };

  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) {
      showToast("Read-only mode is active. Gateway configuration changes are blocked.", "error");
      return;
    }
    try {
      setSaveLoading(true);
      setConfigSuccess("");
      const res = await apiFetch("/api/billing/gateway-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: gatewayConfig.merchantId.trim(),
          serverKey: gatewayConfig.serverKeyInput.trim() || undefined,
          clientKey: gatewayConfig.clientKey.trim(),
          isProduction: gatewayConfig.isProduction,
          isEnabled: gatewayConfig.isEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGatewayConfig((prev) => ({
          ...prev,
          serverKeyMasked: data.config.serverKeyMasked || prev.serverKeyMasked,
          serverKeyInput: "",
        }));
        setConfigSuccess("Konfigurasi Midtrans berhasil disimpan secara aman!");
        setTimeout(() => setConfigSuccess(""), 4000);
      } else {
        showToast("Gagal menyimpan konfigurasi.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper formatting currency
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    if (tier === SubscriptionTier.ENTERPRISE)
      return <FileText className="w-5 h-5 text-indigo-500" />;
    if (tier === SubscriptionTier.PRO)
      return <CreditCard className="w-5 h-5 text-teal-500" />;
    return <Building className="w-5 h-5 text-slate-500" />;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4">
        <div className="relative mb-6">
          <RefreshCw className="w-12 h-12 md:w-16 md:h-16 text-accent animate-spin" />
          <div className="absolute inset-0 w-12 h-12 md:w-16 md:h-16 bg-indigo-500/30 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="text-center space-y-2 mb-8">
          <p className="text-sm md:text-base text-slate-800 dark:text-slate-200 font-bold">
            Memuat Konfigurasi Billing
          </p>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 animate-pulse">
            Mengambil data plan langganan dan histori pembayaran...
          </p>
        </div>
        
        {/* Skeleton Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-4 animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Badge skeleton */}
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded-lg w-2/3" />
                  <div className="h-3 bg-slate-100 dark:bg-zinc-900 rounded w-1/3" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              </div>
              
              {/* Price skeleton */}
              <div className="space-y-2 py-3">
                <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg w-3/5" />
                <div className="h-3 bg-slate-100 dark:bg-zinc-900 rounded w-2/5" />
              </div>
              
              {/* Divider */}
              <div className="h-px bg-slate-200 dark:bg-zinc-800" />
              
              {/* Specs skeleton */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded col-span-2" />
              </div>
              
              {/* Features skeleton */}
              <div className="space-y-2.5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-900/30 shrink-0" />
                    <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded flex-1" style={{ width: `${90 - j * 10}%` }} />
                  </div>
                ))}
              </div>
              
              {/* Button skeleton */}
              <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-xl mt-4" />
            </div>
          ))}
        </div>
        
        {/* Progress indicator */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="font-mono">Mohon tunggu sebentar...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`billing-view-${simpleView} space-y-6 max-w-7xl mx-auto animate-fadeIn`}
      id="saas-billing-container"
    >
      <style>{`
        .billing-view-overview #billing-invoices,.billing-view-overview #billing-review,.billing-view-overview #billing-config,.billing-view-overview #billing-recurring,.billing-view-overview #saas-plan-editor,.billing-view-overview #saas-gateway-setup{display:none}
        .billing-view-invoices #sa-billing-reconciliation,.billing-view-invoices #billing-tenant-summary,.billing-view-invoices #billing-plans,.billing-view-invoices #billing-config,.billing-view-invoices #billing-recurring,.billing-view-invoices #saas-plan-editor,.billing-view-invoices #saas-gateway-setup{display:none}
        .billing-view-settings #sa-billing-reconciliation,.billing-view-settings #billing-tenant-summary,.billing-view-settings #billing-plans,.billing-view-settings #billing-invoices,.billing-view-settings #billing-review{display:none}
      `}</style>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.24),_transparent_42%),linear-gradient(135deg,#020617,#172554_55%,#312e81)] px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-100"><ShieldCheck className="h-3.5 w-3.5" /> Billing Control Plane</span>
              )}
              <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                {isSuperAdmin ? "Pendapatan langganan dalam satu ruang kerja" : "Kelola Langganan Toko Anda"}
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-slate-300 sm:text-sm">
                {isSuperAdmin 
                  ? "Kelola paket, invoice, metode pembayaran, settlement, dan recurring billing dengan tenant scope serta audit yang jelas."
                  : "Upgrade paket, pantau riwayat tagihan, dan aktifkan fitur tambahan untuk mendukung operasional bisnis Anda."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {isSuperAdmin && [{label:"Tenant",value:tenants.length},{label:"Invoice",value:invoices.length},{label:"Perlu review",value:manualRequests.filter((item)=>item.status==="SUBMITTED").length},{label:"Overdue",value:overdueInvoices}].map((item)=><div key={item.label} className="min-w-24 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p><p className="mt-1 text-xl font-black">{item.value}</p></div>)}
            </div>
          </div>
        </div>
        {isSuperAdmin && (
          <nav className="grid grid-cols-3 gap-2 border-t border-white/5 bg-slate-950 p-3" aria-label="Navigasi billing">
            {([['overview','Ringkasan'],['invoices','Tagihan'],['settings','Pengaturan']] as const).map(([view,label])=><button key={view} type="button" onClick={()=>setSimpleView(view)} aria-pressed={simpleView===view} className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${simpleView===view?'bg-white text-slate-950 shadow':'border border-slate-700 text-slate-300 hover:border-indigo-400 hover:text-white'}`}>{label}</button>)}
          </nav>
        )}
      </section>

      {(billingError || usingFallbackPlans) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">Billing belum tersambung sempurna</p>
              <p className="mt-1 text-xs leading-relaxed">
                {billingError || "Paket fallback lokal sedang digunakan karena API plan tidak tersedia."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadPlansAndHistory()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
            </button>
          </div>
        </div>
      )}
      {/* Super Admin Tenant Selector dropdown */}
      {isSuperAdmin && (
        <div id="billing-context" className="scroll-mt-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-5 h-5 text-accent" /> Pilih Tenant
              untuk Dikelola (SaaS Billing)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sebagai Super Admin, Anda dapat memantau billing, mengubah paket,
              membuat tagihan QRIS manual, atau melihat histori invoice tenant
              mana pun.
            </p>
          </div>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full md:w-80 text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 font-bold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:border-accent transition-colors"
          >
            {tenants.length === 0 ? (
              <option value="">Belum ada tenant tersedia</option>
            ) : (
              tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || "Tenant tanpa nama"} (Tenant ID: {t.subdomain || t.id}) — Paket: {t.tier || SubscriptionTier.BASIC}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="sa-billing-reconciliation">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Estimated MRR</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">Rp {estimatedMrr.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Outstanding</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{outstandingInvoices} Invoice</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Overdue</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{overdueInvoices} Invoice</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Plan Mix</p>
            <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 mt-2">
              BASIC {planDistribution[SubscriptionTier.BASIC] || 0} · PRO {planDistribution[SubscriptionTier.PRO] || 0} · ENT {planDistribution[SubscriptionTier.ENTERPRISE] || 0}
            </p>
          </div>
        </div>
      )}

      {/* 1. Header Banner & Current Subscription Stats */}
      <div id="billing-tenant-summary" className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute right-0 top-0 w-60 md:w-80 h-60 md:h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-40 md:w-60 h-40 md:h-60 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] md:text-[10px] font-extrabold uppercase px-2 md:px-2.5 py-1 rounded-full border border-accent/20 tracking-wider flex items-center gap-1 md:gap-1.5">
                <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5" /> SECURE INTEGRATED QRIS
                BILLING
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight">
              Status Paket Langganan Tenant
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 max-w-2xl">
              Kelola plan langganan ERP, batasan kapasitas (users/cabang),
              histori struk invoice, dan sistem auto-debit QRIS.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shrink-0 w-full md:w-auto">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-accent/30">
              {getTierIcon(activeTenant?.tier || SubscriptionTier.BASIC)}
            </div>
            <div className="flex-1 md:flex-none">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Paket Aktif Saat Ini
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs md:text-sm font-black text-indigo-300">
                  {activeTenant?.tier === "ENTERPRISE"
                    ? "Enterprise Multi-Tenant"
                    : activeTenant?.tier === "PRO"
                      ? "Professional ERP"
                      : "Basic Growth"}
                </p>
                <span
                  className={`px-1.5 md:px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase ${
                    activeTenant?.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  }`}
                >
                  {activeTenant?.status || "NO_TENANT"}
                </span>
              </div>
              <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5">
                Habis Masa Aktif:{" "}
                <span className="font-mono text-white font-bold">
                  {activeTenant?.trialEndsAt
                    ? new Date(activeTenant.trialEndsAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" },
                      )
                    : "-"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities Progress Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="w-4 h-4 md:w-4.5 md:h-4.5 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1 text-[11px] md:text-xs">
                <span className="text-slate-400 font-bold truncate">
                  Kapasitas Pengguna
                </span>
                <span className="text-white font-mono font-bold text-[10px] md:text-[11px] ml-2">
                  Maks {activeTenant?.limits?.users || 3} Staff
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 md:h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (3 / (activeTenant?.limits?.users || 3)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Building className="w-4 h-4 md:w-4.5 md:h-4.5 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1 text-[11px] md:text-xs">
                <span className="text-slate-400 font-bold truncate">
                  Cabang / Warehouses
                </span>
                <span className="text-white font-mono font-bold text-[10px] md:text-[11px] ml-2">
                  Maks {activeTenant?.limits?.branches || 1} Cabang
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 md:h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (1 / (activeTenant?.limits?.branches || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <HardDrive className="w-4 h-4 md:w-4.5 md:h-4.5 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1 text-[11px] md:text-xs">
                <span className="text-slate-400 font-bold truncate">
                  Cloud Storage Owner
                </span>
                <span className="text-white font-mono font-bold text-[10px] md:text-[11px] ml-2">
                  {(activeTenant?.limits?.storageMb || 500) >= 1024
                    ? `${((activeTenant?.limits?.storageMb || 500) / 1024).toFixed(1)} GB`
                    : `${activeTenant?.limits?.storageMb || 500} MB`}
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 md:h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-500"
                  style={{ width: "25%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Plan Switcher & Subscription Packages Cards */}
      <div id="billing-plans" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
              Pilihan Paket SaaS ERP
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sesuaikan paket yang tepat untuk menunjang skala operasional
              reparasi gadget Anda.
            </p>
          </div>

          {/* Toggle Monthly/Yearly */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-950 p-1 md:p-1.5 rounded-lg md:rounded-xl border border-slate-200 dark:border-zinc-800 w-full sm:w-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all relative flex items-center justify-center gap-1 ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              Tahunan
              <span className="bg-red-500 text-white text-[7px] md:text-[8px] font-extrabold px-1 md:px-1.5 py-0.5 rounded-full animate-bounce shrink-0">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {plans.length === 0 ? (
            <div className="lg:col-span-3 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-zinc-700" />
              <p className="text-sm font-black text-slate-700 dark:text-zinc-200">
                Paket billing belum tersedia
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Cek endpoint billing atau konfigurasi plan super admin.
              </p>
            </div>
          ) : (
            plans.map((p) => {
              const isCurrent = activeTenant?.tier === p.tier;
              const price =
                billingCycle === "yearly" ? p.priceYearly : p.priceMonthly;
              const periodLabel = billingCycle === "yearly" ? "/tahun" : "/bulan";

              return (
                <div
                  key={p.tier}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col justify-between shadow-sm relative transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    isCurrent
                      ? "border-2 border-accent dark:border-accent ring-4 ring-indigo-50 dark:ring-indigo-950/20"
                      : p.tier === "PRO"
                        ? "border-teal-300 dark:border-teal-900"
                        : "border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  {/* Hot Badge */}
                  {p.tier === "PRO" && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />{" "}
                      Pilihan Terpopuler
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                          TIER: {p.tier}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="bg-indigo-100 dark:bg-indigo-950/40 text-accent dark:text-indigo-300 text-[10px] font-extrabold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paket Anda
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="my-4 md:my-5">
                      <p className="text-xl md:text-2xl font-black text-slate-950 dark:text-zinc-100 flex items-baseline gap-1">
                        {formatRupiah(price)}
                        <span className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-medium">
                          {periodLabel}
                        </span>
                      </p>
                      {billingCycle === "yearly" && (
                        <p className="text-[11px] md:text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          Hemat{" "}
                          {formatRupiah(p.priceMonthly * 12 - p.priceYearly)}{" "}
                          dibandingkan bayar bulanan
                        </p>
                      )}
                    </div>

                    <hr className="border-slate-100 dark:border-zinc-900 my-4" />

                    {/* Limits Spec Pill */}
                    <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 dark:bg-zinc-950 p-2.5 md:p-3 rounded-xl border border-slate-100 dark:border-zinc-800 text-[11px] md:text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        🧑‍💻 <span>Staff: <strong className="text-slate-900 dark:text-white">Maks {p.limits.users}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        🏢 <span>Cabang: <strong className="text-slate-900 dark:text-white">Maks {p.limits.branches}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        🎫 <span>Tiket Servis: <strong className="text-slate-900 dark:text-white">Maks {p.limits.maxServiceTickets}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        🛒 <span>Transaksi POS: <strong className="text-slate-900 dark:text-white">Maks {p.limits.maxPosTransactions}</strong></span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        📂 <span>Cloud Space:{" "}
                        <strong className="text-slate-900 dark:text-white">
                          {p.limits.storageMb >= 1024
                            ? `${p.limits.storageMb / 1024} GB`
                            : `${p.limits.storageMb} MB`}
                        </strong></span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2 md:space-y-2.5 mb-5 md:mb-6 text-xs md:text-sm text-slate-700 dark:text-slate-200">
                      {p.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 md:gap-2.5">
                          <Check className="w-4 h-4 md:w-4.5 md:h-4.5 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full p-0.5" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(p)}
                    disabled={readOnlyMode || !activeTenant || (isCurrent && activeTenant?.status === "ACTIVE" && billingCycle === "monthly")}
                    className={`w-full py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                      isCurrent || !activeTenant
                        ? "bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-200 dark:border-zinc-800"
                        : p.tier === "PRO"
                          ? "bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg hover:shadow-teal-500/20 shadow-md cursor-pointer"
                          : "bg-accent hover:bg-accent-hover text-white hover:shadow-lg hover:shadow-accent/20 shadow-md cursor-pointer"
                    }`}
                  >
                    {isCurrent && activeTenant?.status === "ACTIVE" ? "Paket Sedang Aktif" : `Upgrade ke ${p.tier}`}{" "}
                    {!isCurrent && <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Secure Recurring Automated Billing System */}
      <div id="billing-recurring" className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="w-10 h-10 bg-accent-lighter dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-center text-accent">
            <RefreshCw className="w-5 h-5 animate-spin animate-duration-10000" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-200 uppercase">
              Sistem Auto-Renew Terjadwal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Untuk mengamankan operasional tenant tanpa interupsi, modul
              pemrosesan aman kami menjalankan pemindaian otomatis (cron-job)
              secara berkala.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-xl p-3 md:p-4 text-xs md:text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
            <p className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-accent" /> Kriteria
              Auto-Renewal:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Status subscription tagihan LUNAS</li>
              <li>Opsi perpanjangan (Auto-Renew) aktif</li>
              <li>Masa aktif mencapai tanggal jatuh tempo</li>
            </ul>
          </div>
          {isSuperAdmin && <button
            onClick={handleRunCronSimulation}
            disabled={readOnlyMode || cronLoading}
            className="w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-900/50 disabled:cursor-not-allowed text-white font-mono text-xs md:text-sm font-bold py-2.5 md:py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-800 hover:shadow-lg hover:shadow-slate-950/50 transition-all"
          >
            {cronLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> Menjalankan
                Cron...
              </>
            ) : (
              <>
                <Terminal className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" /> Jalankan
                Cron Job
              </>
            )}
          </button>}
        </div>

        {/* Live Rolling Logs Console Output */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />{" "}
              SECURE CRON TERMINAL (LIVE STATUS)
            </span>
            <span>PORT: 3000 // AUTO_SCHEDULER</span>
          </div>

          <div className="flex-1 font-mono text-[10px] text-indigo-300 space-y-1.5 py-3 overflow-y-auto max-h-[160px] custom-scrollbar leading-relaxed">
            {cronLogs.length === 0 ? (
              <p className="text-slate-600 italic">
                Klik tombol "Jalankan Cron Job" untuk memantau sistem pemrosesan
                background otomatis yang memeriksa tagihan & melakukan
                auto-renewal...
              </p>
            ) : (
              cronLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes("[FATAL")
                      ? "text-red-400"
                      : log.includes("[COMPLETED")
                        ? "text-emerald-400 font-bold"
                        : log.includes("[START")
                          ? "text-white font-bold"
                          : "text-indigo-200"
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-900 text-[8px] font-mono text-slate-600 flex justify-between">
            <span>DATABASE ENCRYPTION: AES-256</span>
            <span>AUTOMATED CRON JOB ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Super Admin Plan Editor (SaaS Tiers & Packages Config) */}
      {isSuperAdmin && (
        <div
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6"
          id="saas-plan-editor"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-zinc-800 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 dark:bg-teal-950/20 rounded-xl text-teal-600">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
                    ⚙️ Konfigurasi Batasan Fitur &amp; Limit per Paket Langganan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modifikasi tarif harga, batasan kuota cabang, limit staff,
                    dan modul yang diaktifkan secara global per tier paket
                    langganan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePlanConfig} className="space-y-6"><fieldset disabled={readOnlyMode || usingFallbackPlans} className="contents disabled:opacity-60">
            {/* Package Tier Selector Tabs */}
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
                Pilih Paket untuk Dikonfigurasi:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    tier: SubscriptionTier.BASIC,
                    label: "BASIC Growth",
                    desc: "Mulai dari Rp 99rb/bln",
                  },
                  {
                    tier: SubscriptionTier.PRO,
                    label: "PRO Professional",
                    desc: "Mulai dari Rp 250rb/bln",
                  },
                  {
                    tier: SubscriptionTier.ENTERPRISE,
                    label: "ENTERPRISE",
                    desc: "Mulai dari Rp 1.5jt/bln",
                  },
                ].map((item) => (
                  <button
                    key={item.tier}
                    type="button"
                    onClick={() => setSelectedConfigTier(item.tier)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedConfigTier === item.tier
                        ? "border-2 border-accent bg-accent-lighter/20 dark:bg-indigo-950/10 dark:border-accent text-indigo-950 dark:text-white ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950 text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <p className="text-xs font-black">{item.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Nama Paket Langganan
                </label>
                <input
                  type="text"
                  required
                  value={configPlanName}
                  onChange={(e) => setConfigPlanName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Harga Bulanan (IDR)
                </label>
                <input
                  type="number"
                  required
                  value={configPlanPriceMonthly}
                  onChange={(e) =>
                    setConfigPlanPriceMonthly(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Harga Tahunan (IDR)
                </label>
                <input
                  type="number"
                  required
                  value={configPlanPriceYearly}
                  onChange={(e) =>
                    setConfigPlanPriceYearly(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Limits Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Maksimum Staff User
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={configPlanUserLimit}
                  onChange={(e) =>
                    setConfigPlanUserLimit(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Maksimum Cabang / Gudang
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={configPlanBranchLimit}
                  onChange={(e) =>
                    setConfigPlanBranchLimit(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Kapasitas Cloud Space (MB)
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={configPlanStorageLimitMb}
                  onChange={(e) =>
                    setConfigPlanStorageLimitMb(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Maksimum Tiket Servis / Bulan
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={configPlanMaxServiceTickets}
                  onChange={(e) =>
                    setConfigPlanMaxServiceTickets(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Maksimum Transaksi POS / Bulan
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={configPlanMaxPosTransactions}
                  onChange={(e) =>
                    setConfigPlanMaxPosTransactions(Number(e.target.value))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Modules Checkboxes */}
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
                Modul / Fitur yang Aktif pada Paket Ini:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-zinc-900">
                {[
                  {
                    id: "SERVICE",
                    label: "Servis",
                    desc: "Penerimaan, estimasi & reparasi",
                  },
                  {
                    id: "POS",
                    label: "POS",
                    desc: "Pembayaran & mutasi kas",
                  },
                  {
                    id: "ACCOUNTING",
                    label: "Keuangan",
                    desc: "Ledger, COA, Laba-Rugi",
                  },
                  {
                    id: "HRM",
                    label: "HR",
                    desc: "Presensi harian & payroll",
                  },
                  {
                    id: "CRM",
                    label: "CRM",
                    desc: "Database kontak & riwayat",
                  },
                  {
                    id: "SECURITY",
                    label: "Keamanan & Audit",
                    desc: "Audit log aktivitas",
                  },
                  {
                    id: "RENTAL",
                    label: "Sewa HP Pengganti",
                    desc: "Peminjaman unit tablet/HP",
                  },
                  {
                    id: "MARKETPLACE",
                    label: "Integrasi Tokopedia/Shopee",
                    desc: "Sync stok & penjualan",
                  },
                  {
                    id: "WHATSAPP",
                    label: "WhatsApp Gateway",
                    desc: "Kirim update & WA broadcast",
                  },
                  {
                    id: "TELEGRAM",
                    label: "Telegram Alert",
                    desc: "Alert/notifikasi log sistem",
                  },
                ].map((feature) => {
                  const isChecked = configPlanFeatures.includes(feature.id);
                  return (
                    <label
                      key={feature.id}
                      className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 dark:border-emerald-700/50 text-emerald-950 dark:text-emerald-400"
                          : "border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfigPlanFeatures([
                                ...configPlanFeatures,
                                feature.id,
                              ]);
                            } else {
                              setConfigPlanFeatures(
                                configPlanFeatures.filter(
                                  (f) => f !== feature.id,
                                ),
                              );
                            }
                          }}
                          className="rounded text-accent focus:ring-accent border-slate-300 dark:border-zinc-700 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs font-bold leading-none">
                          {feature.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                        {feature.desc}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bullet List Texts */}
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                Fasilitas Deskriptif (Satu Baris per Bullet Point)
              </label>
              <textarea
                rows={4}
                value={configPlanBulletText}
                onChange={(e) => setConfigPlanBulletText(e.target.value)}
                placeholder="Semua Fitur Basic&#10;Double-Entry Accounting&#10;WhatsApp Broadcast"
                className="w-full text-xs font-sans px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors leading-relaxed"
              />
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 block">
                Tuliskan fasilitas pemasaran yang akan ditampilkan sebagai
                daftar bullet point pada kartu paket di atas (Gunakan Enter
                untuk baris baru).
              </span>
            </div>

            {planSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/40">
                ✓ {planSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={readOnlyMode || usingFallbackPlans || planSaveLoading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {planSaveLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Simpan Paket &amp; Terapkan Secara Global
              </button>
            </div>
          </fieldset></form>
        </div>
      )}

      {isSuperAdmin && (
        <form onSubmit={handleSaveManualConfig} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" id="billing-config"><fieldset disabled={readOnlyMode} className="contents disabled:opacity-60">
          <div className="border-b border-slate-100 pb-4 dark:border-zinc-800"><h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Pembayaran Manual</h3><p className="mt-1 text-xs text-slate-500">Atur rekening tujuan, QRIS statis merchant, dan instruksi yang dilihat tenant.</p></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-zinc-800"><label className="flex items-center justify-between text-xs font-bold"><span>Aktifkan transfer bank</span><input type="checkbox" checked={manualConfig.bankTransferEnabled} onChange={(e) => setManualConfig({ ...manualConfig, bankTransferEnabled: e.target.checked })} /></label><label className="block text-xs font-bold">Nama bank<input value={manualConfig.bankName} onChange={(e) => setManualConfig({ ...manualConfig, bankName: e.target.value })} placeholder="BCA / BRI / Mandiri" className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="block text-xs font-bold">Nomor rekening<input value={manualConfig.accountNumber} onChange={(e) => setManualConfig({ ...manualConfig, accountNumber: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="block text-xs font-bold">Nama pemilik rekening<input value={manualConfig.accountHolder} onChange={(e) => setManualConfig({ ...manualConfig, accountHolder: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label></section>
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-zinc-800"><label className="flex items-center justify-between text-xs font-bold"><span>Aktifkan QRIS statis</span><input type="checkbox" checked={manualConfig.manualQrisEnabled} onChange={(e) => setManualConfig({ ...manualConfig, manualQrisEnabled: e.target.checked })} /></label>{manualConfig.qrisImageUrl && <img src={manualConfig.qrisImageUrl} alt="QRIS statis merchant" className="mx-auto h-44 w-44 rounded-xl border bg-white object-contain p-2" />}<label htmlFor="manual-qris-upload" className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-xs font-black text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"><QrCode className="h-4 w-4" /> Pilih Gambar QRIS</label><input id="manual-qris-upload" type="file" accept="image/jpeg,image/png" onChange={(e) => setManualQrisFile(e.target.files?.[0] || null)} className="sr-only" /><p className="text-center text-[11px] text-slate-500">{manualQrisFile?.name || manualConfig.qrisOriginalName || "JPG atau PNG, maksimal 2 MB"}</p></section>
          </div>
          <label className="mt-4 block text-xs font-bold">Instruksi pembayaran<textarea rows={3} value={manualConfig.instructions} onChange={(e) => setManualConfig({ ...manualConfig, instructions: e.target.value })} placeholder="Contoh: Cantumkan nomor invoice pada berita transfer." className="mt-1 w-full rounded-xl border border-slate-200 p-3 dark:border-zinc-700 dark:bg-zinc-950" /></label>
          <button type="submit" disabled={readOnlyMode || manualConfigSaving} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{manualConfigSaving ? "Menyimpan…" : "Simpan Pembayaran Manual"}</button>
        </fieldset></form>
      )}

      {/* Super Admin Payment Gateway Setup (Midtrans QRIS) */}
      {isSuperAdmin && (
        <div
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6"
          id="saas-gateway-setup"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-zinc-800 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-accent-lighter dark:bg-indigo-950/40 rounded-xl text-accent">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
                    ⚙️ Pengaturan Real Payment Gateway (Midtrans QRIS)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hubungkan sistem SaaS ERP ke Midtrans untuk memproses
                    transaksi QRIS riil secara otomatis (Option B).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  gatewayConfig.isEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                    : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 border border-slate-200 dark:border-zinc-700/50"
                }`}
              >
                {gatewayConfig.isEnabled
                  ? "🔴 Live Gateway Active"
                  : "⚪ Local Billing (Tanpa Gateway)"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveGatewayConfig} className="space-y-5"><fieldset disabled={readOnlyMode} className="contents disabled:opacity-60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Toggle Enable/Disable Gateway */}
              <div className="md:col-span-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                    Aktifkan Kredensial Midtrans
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jika diaktifkan, pembuatan tagihan baru akan langsung
                    menembak API Midtrans asli untuk menerbitkan QRIS resmi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGatewayConfig((prev) => ({
                      ...prev,
                      isEnabled: !prev.isEnabled,
                    }))
                  }
                  className="text-accent hover:text-accent transition-colors cursor-pointer"
                >
                  {gatewayConfig.isEnabled ? (
                    <ToggleRight className="w-10 h-10 text-emerald-600 fill-emerald-100 dark:fill-emerald-950/20" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                  )}
                </button>
              </div>

              {/* Merchant ID */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Merchant ID (MID)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: M123456 atau G123456"
                  value={gatewayConfig.merchantId}
                  onChange={(e) =>
                    setGatewayConfig((prev) => ({
                      ...prev,
                      merchantId: e.target.value,
                    }))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Environment Mode */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Mode Lingkungan (Environment)
                </label>
                <select
                  value={gatewayConfig.isProduction ? "production" : "sandbox"}
                  onChange={(e) =>
                    setGatewayConfig((prev) => ({
                      ...prev,
                      isProduction: e.target.value === "production",
                    }))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                >
                  <option value="sandbox">Sandbox (Testing / Uji Coba)</option>
                  <option value="production">
                    Production (Real / Live Payment)
                  </option>
                </select>
              </div>

              {/* Client Key */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Client Key
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SB-Mid-client-xxxxxxxx"
                  value={gatewayConfig.clientKey}
                  onChange={(e) =>
                    setGatewayConfig((prev) => ({
                      ...prev,
                      clientKey: e.target.value,
                    }))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Server Key */}
              <div className="md:col-span-3 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Server Key (Sangat Rahasia)
                </label>
                <input
                  type="password"
                  placeholder={
                    gatewayConfig.serverKeyMasked
                      ? `Tersimpan: ${gatewayConfig.serverKeyMasked}`
                      : "Masukkan Server Key Midtrans"
                  }
                  value={gatewayConfig.serverKeyInput}
                  onChange={(e) =>
                    setGatewayConfig((prev) => ({
                      ...prev,
                      serverKeyInput: e.target.value,
                    }))
                  }
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-accent transition-colors"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  * Server Key dienkripsi dan disimpan dengan aman secara
                  server-side. Jangan pernah membagikan kunci ini ke siapa pun.
                  Kosongkan jika tidak ingin mengubah Server Key lama.
                </p>
              </div>
            </div>

            {configSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/40">
                ✓ {configSuccess}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={readOnlyMode || saveLoading}
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {saveLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Simpan Konfigurasi Gateway
              </button>
            </div>
          </fieldset></form>

          {/* Edu section */}
          <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
              💡 Panduan Alur Pembayaran &amp; Pencairan Dana (SaaS Owner):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-zinc-300">
                  1. Alur Masuk Uang (Auto-Settled):
                </p>
                <p>
                  Ketika penyewa memindai QRIS dan membayar, dana akan langsung
                  masuk ke{" "}
                  <strong>
                    virtual wallet/rekening penampung Midtrans milik Super Admin
                  </strong>
                  . Tidak ada uang yang tertahan di server aplikasi kita.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-zinc-300">
                  2. Pencairan ke Rekening Bank (Withdrawal):
                </p>
                <p>
                  Super Admin dapat mencairkan saldo tersebut ke rekening bank
                  asli terdaftar (BRI, Mandiri, BCA, dll) kapan pun secara
                  real-time via dashboard Midtrans, atau mengatur jadwal
                  otomatis (auto-disbursement) setiap hari kerja.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Billing Invoices History List */}
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
        id="billing-invoices"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-200 uppercase">
              Riwayat Tagihan &amp; Faktur Struk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daftar transaksi, rincian pembayaran, dan status tagihan
              perpanjangan paket ERP.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase bg-slate-200/50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md border border-slate-300/30 dark:border-zinc-700/30">
            Total Transaksi: {invoices.length}
          </span>
        </div>

        <div className="border-b border-slate-100 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder="Cari ID invoice, paket, status..." className="min-w-56 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-accent/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200" />
            <select aria-label="Filter status invoice" value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"><option value="">Semua status</option><option value="PAID">Lunas</option><option value="UNPAID">Belum lunas</option><option value="PENDING_VERIFICATION">Menunggu verifikasi</option><option value="OVERDUE">Terlambat</option></select>
            <select aria-label="Filter siklus invoice" value={invoiceCycleFilter} onChange={(event) => setInvoiceCycleFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"><option value="">Semua siklus</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option></select>
            <input aria-label="Tanggal invoice mulai" type="date" value={invoiceDateFrom} onChange={(event) => setInvoiceDateFrom(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <input aria-label="Tanggal invoice akhir" type="date" value={invoiceDateTo} onChange={(event) => setInvoiceDateTo(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <input aria-label="Nominal minimum" type="number" min="0" value={invoiceMinAmount} onChange={(event) => setInvoiceMinAmount(event.target.value)} placeholder="Min nominal" className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <input aria-label="Nominal maksimum" type="number" min="0" value={invoiceMaxAmount} onChange={(event) => setInvoiceMaxAmount(event.target.value)} placeholder="Maks nominal" className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950" />
            <button type="button" onClick={() => { setInvoiceSearch(""); setInvoiceStatusFilter(""); setInvoiceCycleFilter(""); setInvoiceDateFrom(""); setInvoiceDateTo(""); setInvoiceMinAmount(""); setInvoiceMaxAmount(""); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-zinc-700 dark:text-zinc-300">Reset filter</button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Menampilkan {filteredInvoices.length} dari {invoices.length} invoice.</p>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2 animate-pulse" />
            <p className="text-xs font-bold">
              Belum ada riwayat tagihan terdaftar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 font-mono uppercase">
                  <th className="p-4">ID Invoice</th>
                  <th className="p-4">Tanggal Tagihan</th>
                  <th className="p-4">Jatuh Tempo</th>
                  <th className="p-4">Paket ERP</th>
                  <th className="p-4">Jumlah Biaya</th>
                  <th className="p-4">Auto-Renew</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-zinc-200">
                      {inv.id}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {inv.date}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {inv.dueDate}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 px-2 py-0.5 rounded font-bold font-mono text-[9px]">
                        {inv.tier} (
                        {inv.billingCycle === "yearly" ? "Thn" : "Bln"})
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-950 dark:text-zinc-100 font-mono">
                      {formatRupiah(inv.amount)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => {
                          if (readOnlyMode) return;
                          handleToggleAutoRenew(inv.id, inv.autoRenew ?? true);
                        }}
                        disabled={readOnlyMode}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                        title={
                          inv.autoRenew
                            ? "Matikan Perpanjangan Otomatis"
                            : "Aktifkan Perpanjangan Otomatis"
                        }
                      >
                        {(inv.autoRenew ?? true) ? (
                          <ToggleRight className="w-7 h-7 text-emerald-600 fill-emerald-100 dark:fill-emerald-950/20" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                        )}
                        <span className="text-[10px] font-medium font-mono text-slate-500 dark:text-slate-400">
                          {(inv.autoRenew ?? true) ? "ON" : "OFF"}
                        </span>
                      </button>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30"
                            : inv.status === "UNPAID"
                              ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 dark:border-orange-500/30"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30"
                        }`}
                      >
                        {inv.status === "PAID"
                          ? "LUNAS"
                          : inv.status === "UNPAID"
                            ? "BELUM LUNAS"
                            : inv.status === "PENDING_VERIFICATION"
                              ? "MENUNGGU VERIFIKASI"
                              : inv.status === "CANCELLED"
                                ? "DIBATALKAN"
                                : "TERLAMBAT"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.status !== "PAID" && inv.status !== "PENDING_VERIFICATION" && (
                          <button
                            onClick={() => {
                              if (readOnlyMode) return;
                              setManualInvoice(inv);
                            }}
                            disabled={readOnlyMode}
                            className="px-2.5 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold rounded-lg text-[10px] transition-all"
                          >
                            Bayar Manual
                          </button>
                        )}
                        <button
                          onClick={() => setDetailModalInvoice(inv)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                        >
                          Rincian
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 rounded-lg transition-all"
                          title="Cetak Struk Transaksi PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {manualInvoice && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitManualPayment} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 md:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Pembayaran Manual</h3>
                <p className="text-xs text-slate-500 mt-1">Invoice {manualInvoice.id} · {formatRupiah(manualInvoice.amount)}</p>
              </div>
              <button type="button" onClick={() => setManualInvoice(null)} className="text-xs font-bold text-slate-500">Tutup</button>
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Metode pembayaran manual">
              {([...(manualConfig.bankTransferEnabled ? ["BANK_TRANSFER" as const] : []), ...(manualConfig.manualQrisEnabled ? ["MANUAL_QRIS" as const] : [])]).map((method) => (
                <button key={method} type="button" onClick={() => setManualMethod(method)} className={`rounded-xl border p-3 text-xs font-bold ${manualMethod === method ? "border-accent bg-accent-lighter text-accent dark:bg-indigo-950/30 dark:text-indigo-300" : "border-slate-200 dark:border-zinc-700"}`}>
                  {method === "BANK_TRANSFER" ? "Transfer Bank" : "QRIS Manual"}
                </button>
              ))}
            </div>
            {(manualConfig.bankTransferEnabled || manualConfig.manualQrisEnabled) ? <>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 text-xs text-slate-600 dark:text-zinc-300">
              {manualMethod === "BANK_TRANSFER" ? <div><p>Transfer ke <b>{manualConfig.bankName} · {manualConfig.accountNumber}</b></p><p>a.n. <b>{manualConfig.accountHolder}</b></p></div> : <div className="text-center">{manualConfig.qrisImageUrl ? <img src={manualConfig.qrisImageUrl} alt="QRIS pembayaran" className="mx-auto mb-2 h-56 w-56 rounded-xl bg-white object-contain p-2" /> : <p>Gambar QRIS belum tersedia.</p>}</div>}
              {manualConfig.instructions && <p className="mt-2 whitespace-pre-wrap border-t border-slate-200 pt-2 dark:border-zinc-800">{manualConfig.instructions}</p>}
            </div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">Nama pembayar
              <input value={manualPayerName} onChange={(e) => setManualPayerName(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2.5" />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">Nomor referensi transaksi
              <input value={manualReference} onChange={(e) => setManualReference(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2.5" />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">Tanggal pembayaran
              <input type="datetime-local" value={manualPaidAt} onChange={(e) => setManualPaidAt(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2.5" />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">Bukti pembayaran (JPG/PNG/PDF, maks. 5 MB)
              <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setManualProof(e.target.files?.[0] || null)} required className="mt-1 block w-full text-xs" />
            </label>
            <button type="submit" disabled={readOnlyMode || manualSubmitting} className="w-full rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 p-3 text-sm font-black text-white">
              {manualSubmitting ? "Mengunggah bukti..." : "Kirim untuk Verifikasi"}
            </button></> : <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">Super Admin belum mengaktifkan metode pembayaran manual.</p>}
          </form>
        </div>, document.body,
      )}

      {isSuperAdmin && (
        <section id="billing-review" className="scroll-mt-24 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10 p-4 md:p-5">
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Antrean Verifikasi Pembayaran Manual</h3>
          <div className="mt-3 space-y-2">
            {manualRequests.filter((request) => request.status === "SUBMITTED").length === 0 ? (
              <div className="rounded-xl bg-white/40 dark:bg-zinc-900/40 p-8 text-center border border-dashed border-amber-200 dark:border-amber-900/30">
                <CheckCircle2 className="mx-auto h-8 w-8 text-amber-300 dark:text-amber-800 mb-2" />
                <p className="text-xs font-bold text-slate-500">Antrean kosong. Semua pembayaran manual sudah diproses.</p>
              </div>
            ) : (
              manualRequests.filter((request) => request.status === "SUBMITTED").map((request) => (
                <div key={request.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3">
                  <div className="text-xs">
                    <p className="font-black">{request.tenant_name} · {request.invoice_id}</p>
                    <p className="text-slate-500 mt-1">{request.method === "BANK_TRANSFER" ? "Transfer Bank" : "QRIS Manual"} · {formatRupiah(Number(request.amount))} · Ref {request.reference_number}</p>
                    <p className={`mt-1 text-[10px] font-bold ${Date.now() - new Date(request.submitted_at).getTime() > 24 * 60 * 60 * 1000 ? "text-rose-600" : "text-amber-600"}`}>Menunggu {Math.max(0, Math.floor((Date.now() - new Date(request.submitted_at).getTime()) / 3600000))} jam · SLA 24 jam</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { try { const result = await readJsonResponse<any>(await apiFetch(`/api/billing/manual-payments/${request.id}/proof-url`), "Bukti pembayaran"); const proofResponse = await apiFetch(result.fileUrl); if (!proofResponse.ok) throw new Error("Bukti pembayaran gagal dimuat."); const proofUrl = URL.createObjectURL(await proofResponse.blob()); window.open(proofUrl, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(proofUrl), 60000); } catch (err: any) { showToast(err.message, "error"); } }} className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs font-bold text-accent">Lihat bukti</button>
                    <button onClick={() => handleReviewManual(request, "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">Setujui</button>
                    <button onClick={() => handleReviewManual(request, "reject")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">Tolak</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 5. QRIS checkout Modal */}
      {showQrModal && invoice && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl w-full max-w-md p-4 md:p-6 text-slate-100 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Top Indicator */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                <span className="font-extrabold text-xs md:text-sm text-white uppercase tracking-wider">
                  Gateway QRIS Interaktif
                </span>
              </div>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setInvoice(null);
                }}
                className="text-slate-400 hover:text-white font-mono text-xs px-2 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 font-bold transition-all"
              >
                Tutup
              </button>
            </div>

            {/* QRIS BRANDING BANNER - Indonesian National Specification Design */}
            <div className="my-4 md:my-5 bg-white rounded-xl md:rounded-2xl p-3 md:p-4 text-slate-900 flex flex-col items-center border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="w-full flex justify-between items-center mb-3">
                <span className="text-[12px] md:text-[14px] font-black tracking-tighter text-indigo-950 italic flex items-center gap-0.5">
                  <span className="text-red-600 font-black">QR</span>IS
                </span>
                <span className="text-[8px] md:text-[9px] font-mono text-slate-400 tracking-wider">
                  GPN / BANK INDONESIA
                </span>
              </div>

              {/* QR Image Fetch from Live Server API */}
              <div className="bg-slate-50 p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-100 relative">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invoice.qrisData)}`}
                  alt="QRIS Code"
                  referrerPolicy="no-referrer"
                  className="w-36 h-36 md:w-44 md:h-44 border border-slate-100 bg-white"
                />
                {/* Scan line overlay */}
                <div className="absolute top-2 md:top-2.5 left-2 md:left-2.5 right-2 md:right-2.5 h-0.5 bg-red-500/50 animate-bounce shadow-md" />
              </div>

              <div className="w-full text-center mt-3 md:mt-3.5 space-y-1">
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  SaaS ERP Indonesia
                </p>
                <p className="text-[8px] md:text-[9px] text-slate-400 font-mono">
                  NMID: ID1020304050607
                </p>
                <p className="text-[12px] md:text-[13px] font-black text-slate-950 font-mono tracking-tight mt-1">
                  {formatRupiah(invoice.amount)}
                </p>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg md:rounded-xl p-2.5 md:p-3 flex items-center justify-between text-xs mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-orange-400">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse" />
                <span className="font-bold text-[10px] md:text-xs">Masa Berlaku Tagihan QRIS:</span>
              </div>
              <span className="font-mono font-black text-white text-xs md:text-sm bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30">
                {formatTime(paymentTimer)}
              </span>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-2 text-[10px] md:text-[11px] text-slate-400 leading-relaxed mb-4 md:mb-6">
              <p className="font-bold text-slate-200 text-xs md:text-sm">
                Panduan Pembayaran QRIS:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>
                  Buka aplikasi e-wallet (GoPay, OVO, Dana) atau M-Banking Anda.
                </li>
                <li>Pindai/Scan QR code di atas dengan kamera ponsel Anda.</li>
                <li>
                  Konfirmasikan nominal transfer dan lakukan pembayaran aman.
                </li>
              </ol>
            </div>

            {/* Secure Payment Control Button */}
            <div className="space-y-2 md:space-y-2.5">
              <div className="rounded-xl border border-accent/30 bg-indigo-500/10 p-3 text-xs text-indigo-100">
                Pembayaran diterima oleh Midtrans dan akan berubah menjadi LUNAS hanya setelah webhook terverifikasi. Tidak ada tombol konfirmasi manual pada alur ini.
              </div>

              <button
                onClick={() => {
                  setShowQrModal(false);
                  setInvoice(null);
                }}
                disabled={paymentLoading}
                className="w-full bg-slate-800/80 hover:bg-slate-800 disabled:bg-slate-800/30 disabled:cursor-not-allowed text-slate-300 font-bold text-[10px] md:text-[11px] py-2 rounded-lg transition-all"
              >
                Batal & Pilih Paket Lain
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice Detail modal */}
      {detailModalInvoice && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 rounded-2xl md:rounded-3xl w-full max-w-lg p-4 md:p-6 shadow-2xl relative animate-fadeIn my-8">
            <div className="flex justify-between items-start md:items-center pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4 gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm md:text-base text-slate-900 dark:text-zinc-100 uppercase truncate">
                  Rincian Faktur / Invoice
                </h4>
                <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-mono uppercase truncate">
                  ID: {detailModalInvoice.id}
                </p>
              </div>
              <button
                onClick={() => setDetailModalInvoice(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-mono text-xs px-2 md:px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold transition-all cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 md:space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-slate-50 dark:bg-zinc-950 p-3 md:p-3.5 rounded-xl md:rounded-2xl border border-slate-100 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 uppercase font-mono">
                    Diterbitkan Untuk
                  </p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5 text-sm md:text-base">
                    {activeTenant?.name || "Tenant"}
                  </p>
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Tenant ID: {activeTenant?.subdomain}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 uppercase font-mono">
                    Diterbitkan Oleh
                  </p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5 text-sm md:text-base">
                    SaaS ERP Indonesia Inc.
                  </p>
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                    Kawasan Megamas Blok C1, Jakarta
                  </p>
                </div>
              </div>

              <div className="border-t border-b border-slate-100 dark:border-zinc-800 py-3 space-y-2 md:space-y-2.5">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Tanggal Faktur:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 text-right">
                    {detailModalInvoice.date}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Batas Jatuh Tempo:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 text-right">
                    {detailModalInvoice.dueDate}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Deskripsi Item:</span>
                  <span className="font-bold text-accent dark:text-accent text-right">
                    Paket SaaS {detailModalInvoice.tier} (
                    {detailModalInvoice.billingCycle === "yearly"
                      ? "Per Tahun"
                      : "Per Bulan"}
                    )
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    Pemberitahuan Auto-Renew:
                  </span>
                  <span className="font-mono text-slate-900 dark:text-zinc-100">
                    {(detailModalInvoice.autoRenew ?? true)
                      ? "AKTIF"
                      : "NONAKTIF"}
                  </span>
                </div>
                {(detailModalInvoice as any).prorationNotes && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-2.5 rounded-lg">
                    <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3" /> Penyesuaian Pro-rata
                    </p>
                    <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed italic">
                      {(detailModalInvoice as any).prorationNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-2 text-sm md:text-base">
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  Total Tagihan Lunas:
                </span>
                <span className="text-base md:text-lg font-black text-slate-950 dark:text-white font-mono">
                  {formatRupiah(detailModalInvoice.amount)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800" id="invoice-status-timeline">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Timeline Invoice</p>
                <div className="space-y-3">
                  {[
                    { label: "Invoice dibuat", date: detailModalInvoice.date, done: true },
                    { label: detailModalInvoice.qrisData ? "QRIS gateway diterbitkan" : "Metode pembayaran manual dipilih", date: detailModalInvoice.date, done: true },
                    { label: detailModalInvoice.status === "PENDING_VERIFICATION" ? "Bukti menunggu verifikasi" : "Pembayaran diproses", date: detailModalInvoice.status === "PENDING_VERIFICATION" ? "Saat ini" : "-", done: ["PENDING_VERIFICATION", "PAID"].includes(detailModalInvoice.status) },
                    { label: "Settlement dikonfirmasi", date: detailModalInvoice.status === "PAID" ? "Terverifikasi" : "Belum terjadi", done: detailModalInvoice.status === "PAID" },
                  ].map((event, index) => <div key={event.label} className="flex gap-3"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black ${event.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-zinc-700"}`}>{index + 1}</span><span><b className="block text-xs text-slate-800 dark:text-zinc-200">{event.label}</b><span className="text-[10px] text-slate-400">{event.date}</span></span></div>)}
                </div>
              </div>

              <div className={`border rounded-xl p-3 flex items-center gap-2.5 text-[10px] md:text-xs ${detailModalInvoice.status === "PAID" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-400"}`}>
                {detailModalInvoice.status === "PAID" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Clock className="w-5 h-5 shrink-0" />}
                <div className="flex-1">
                  <p className="font-bold">{detailModalInvoice.status === "PAID" ? "PEMBAYARAN DIKONFIRMASI LUNAS" : `STATUS: ${detailModalInvoice.status}`}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Transaksi ID: {detailModalInvoice.id.replace("saas-inv-", "TX-")}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePrintInvoice(detailModalInvoice)}
              className="w-full bg-slate-950 hover:bg-slate-900 dark:bg-accent dark:hover:bg-accent-hover text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl mt-4 md:mt-5 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-xl"
            >
              <Download className="w-4 h-4" /> Cetak / Download Invoice PDF
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
