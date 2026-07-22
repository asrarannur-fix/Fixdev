import { useState, useEffect, useRef } from "react";
import { SubscriptionTier } from "../types";
import { useToast } from "../components/ui/Toast";

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    users: number;
    branches: number;
    storageMb: number;
    features: string[];
  };
}

export const DEFAULT_PLANS: Plan[] = [
  {
    tier: SubscriptionTier.BASIC,
    name: "Basic Growth Plan",
    priceMonthly: 99000,
    priceYearly: 990000,
    features: ["POS Kasir Utama", "Daftar Servis Dasar", "1 Gudang / Cabang", "Maks 3 Staff User", "Penyimpanan 500MB"],
    limits: { users: 3, branches: 1, storageMb: 500, features: ["POS", "SERVICE"] },
  },
  {
    tier: SubscriptionTier.PRO,
    name: "SaaS Professional ERP",
    priceMonthly: 250000,
    priceYearly: 2400000,
    features: ["Semua Fitur Basic", "Double-Entry Accounting & Ledger", "WhatsApp Broadcast", "Multi-Branch & Cabang (Maks 5)", "Maks 15 Staff User", "Penyimpanan 2GB"],
    limits: { users: 15, branches: 5, storageMb: 2048, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM"] },
  },
  {
    tier: SubscriptionTier.ENTERPRISE,
    name: "Enterprise Multi-Tenant ERP",
    priceMonthly: 1500000,
    priceYearly: 15000000,
    features: ["Semua Fitur Pro", "Integrasi Marketplace Sync", "Workflow Builder (Automasi)", "Proteksi Keamanan & Fraud Detector", "Hingga 20 Cabang", "Hingga 100 Staff User", "Penyimpanan 10GB", "Custom Domain & White-Label"],
    limits: { users: 100, branches: 20, storageMb: 10240, features: ["POS", "SERVICE", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM", "MARKETPLACE", "RENTAL", "SECURITY"] },
  },
];

export function useSaaSBilling(
  selectedTenantId: string,
  activeTenant: any,
  updateTenant: (id: string, data: any) => void,
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
  readOnlyMode = false,
) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [usingFallbackPlans, setUsingFallbackPlans] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const [cronLoading, setCronLoading] = useState<boolean>(false);
  const [paymentTimer, setPaymentTimer] = useState<number>(180);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [detailModalInvoice, setDetailModalInvoice] = useState<any | null>(
    null,
  );
  const latestRequestId = useRef<number>(0);
  const activeTenantRef = useRef(activeTenant);
  activeTenantRef.current = activeTenant;

  // Load plans & history
  const loadPlansAndHistory = async () => {
    if (!selectedTenantId) return;
    const controller = new AbortController();
    const requestId = ++latestRequestId.current;
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      setLoading(true);
      setBillingError(null);
      setUsingFallbackPlans(false);
      const plansRes = await apiFetch("/api/billing/plans", { signal: controller.signal });
      if (requestId !== latestRequestId.current) return;

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (requestId !== latestRequestId.current) return;
        setPlans(Array.isArray(plansData) && plansData.length > 0 ? plansData : DEFAULT_PLANS);
      } else {
        const detail = await plansRes.text();
        if (requestId !== latestRequestId.current) return;
        setPlans(DEFAULT_PLANS);
        setUsingFallbackPlans(true);
        setBillingError(`Paket billing gagal dimuat (HTTP ${plansRes.status}). ${detail.slice(0, 180)}`);
      }

      const subRes = await apiFetch(
        `/api/billing/subscription?tenantId=${selectedTenantId}`,
        { signal: controller.signal },
      );
      if (requestId !== latestRequestId.current) return;

      if (subRes.ok) {
        const subData = await subRes.json();
        if (requestId !== latestRequestId.current) return;
        const nextInvoices = Array.isArray(subData.invoices) ? subData.invoices : [];
        setInvoices(nextInvoices);

        const tenant = activeTenantRef.current;
        if (
          tenant &&
          (!tenant.billingHistory ||
            tenant.billingHistory.length === 0)
        ) {
          updateTenant(selectedTenantId, { billingHistory: nextInvoices });
        }
      } else {
        const detail = await subRes.text();
        if (requestId !== latestRequestId.current) return;
        const migrationHint = /relation|saas_invoices|app_settings/i.test(detail)
          ? " Schema billing belum diterapkan. Jalankan migration 005 dan 006 dari menu Database."
          : "";
        setBillingError(`Riwayat billing gagal dimuat (HTTP ${subRes.status}).${migrationHint} ${detail.slice(0, 180)}`);
        setInvoices([]);
      }
    } catch (err: any) {
      if (requestId !== latestRequestId.current) return;
      const message = err?.name === "AbortError"
        ? "Billing timeout setelah 8 detik. Periksa sesi login dan koneksi API."
        : err?.message || "Gagal memuat billing.";
      setBillingError(message);
      showToast(message, "error");
    } finally {
      if (requestId === latestRequestId.current) {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    latestRequestId.current += 1;
    setInvoice(null);
    setShowQrModal(false);
    setDetailModalInvoice(null);
    if (selectedTenantId) {
      loadPlansAndHistory();
    } else {
      setInvoices([]);
      setLoading(false);
    }
  }, [selectedTenantId]);

  // QRIS Payment countdown timer
  useEffect(() => {
    let interval: any = null;
    if (showQrModal && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer((prev) => prev - 1);
      }, 1000);
    } else if (paymentTimer === 0) {
      setShowQrModal(false);
      setInvoice(null);
      showToast(
        "Waktu pembayaran QRIS habis. Silakan buat tagihan kembali.",
        "error",
      );
    }
    return () => clearInterval(interval);
  }, [showQrModal, paymentTimer]);

  // Handle plan selection & invoice creation
  const handleSelectPlan = async (plan: Plan, paymentChannel: "MIDTRANS" | "MANUAL" = "MANUAL") => {
    if (readOnlyMode) {
      showToast("Aktifkan Edit Mode untuk membuat invoice.", "error");
      return;
    }
    if (!selectedTenantId || !activeTenant) {
      showToast("Pilih tenant aktif sebelum membuat invoice.", "error");
      return;
    }
    try {
      setPaymentLoading(true);
      const merchantName = activeTenant
        ? activeTenant.name
        : "SaaS ERP Merchant";
      const response = await apiFetch("/api/billing/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          tier: plan.tier,
          billingCycle,
          paymentChannel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
        if (paymentChannel === "MIDTRANS" && data.invoice.qrisData) {
          setPaymentTimer(180);
          setShowQrModal(true);
        } else {
          setShowQrModal(false);
          showToast("Invoice manual dibuat. Lengkapi formulir dan unggah bukti pembayaran.", "success");
          await loadPlansAndHistory();
        }
      } else {
        showToast("Gagal membuat invoice tagihan.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Toggle Auto-Renew state
  const handleToggleAutoRenew = async (
    invoiceId: string,
    currentVal: boolean,
  ) => {
    try {
      const response = await apiFetch("/api/billing/toggle-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          autoRenew: !currentVal,
        }),
      });

      if (response.ok) {
        loadPlansAndHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run Cron simulation
  const handleRunCronSimulation = async () => {
    if (readOnlyMode) {
      showToast("Aktifkan Edit Mode untuk menjalankan cron billing.", "error");
      return;
    }
    try {
      setCronLoading(true);
      setCronLogs([
        "[START] Memulai pemindaian terjadwal recurring billing...",
        `[TIME] ${new Date().toLocaleTimeString()}`,
      ]);

      const response = await apiFetch("/api/billing/simulate-recurring-cron", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const logs = Array.isArray(data.logs) ? data.logs : [];
        setTimeout(() => {
          setCronLogs((prev) => [
            ...prev,
            "[INFO] Memeriksa semua tenant dengan subscription status = ACTIVE...",
            `[DB] Ditemukan ${invoices.length} rekaman invoice pembayaran.`,
            ...logs.map((log: string) => `[RECURRING] ${log}`),
            `[SUCCESS] Sinkronisasi cron berhasil diselesaikan secara aman pada ${new Date().toLocaleTimeString()}`,
          ]);
          loadPlansAndHistory();
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setCronLogs((prev) => [
        ...prev,
        "[ERROR] Terjadi kesalahan fatal koneksi cron.",
      ]);
    } finally {
      setTimeout(() => setCronLoading(false), 1000);
    }
  };

  return {
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
  };
}
