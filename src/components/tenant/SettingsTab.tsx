import * as React from "react";
import { useState, useMemo } from "react";
import {
  Building2,
  Sliders,
  Receipt,
  Lock,
  Zap,
  FileText,
  ChevronRight,
  HelpCircle,
  Save,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Copy,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Brush,
  Ticket,
  X,
  Paintbrush,
  Wrench,
  Fingerprint,
  MapPin,
  Search,
  Server,
  Smartphone,
  Globe,
  MessageSquare,
  Shield,
  Settings,
  GitBranch,
  Printer,
  Code,
  CreditCard,
  ArrowRightLeft,
  Play,
  Pencil,
  Check,
  Barcode,
  ShieldCheck,
  Eye,
  CheckSquare,
  Plus,
  Sparkles,
  RefreshCw,
  Send,
  Database,
  FileSpreadsheet,
  Gift,
  ClipboardCheck,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { RBACManager } from "../RBACManager";
import { BranchesManagerPanel } from "./settings/panels/BranchesManagerPanel";
import { ModuleParameterConfig } from "../ModuleParameterConfig";
import SaaSSubscription from "../SaaSSubscription";
import { DeveloperApiManager } from "../DeveloperApiManager";
import { DataImporter } from "../DataImporter";
import { WhatsAppConnector } from "../WhatsAppConnector";
import { NotificationEngine } from "../NotificationEngine";
import { TelegramBotManager } from "../TelegramBotManager";
import { VoucherManager } from "../VoucherManager";
import { MaintenanceContractManager } from "../MaintenanceContractManager";
import { SystemBackup } from "./SystemBackup";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { OperationalSettingsPanel } from "./OperationalSettingsPanel";
import { AppSettingsPanel } from "./AppSettingsPanel";
import { BRANDING_PRESETS } from "../../config/BrandingPresets";

import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from "../../types";
import { GROUP_ORDER, getSettingsTabs } from "../../config/settingsConfigs";

interface SettingsTabProps {
  activeSubTab: string;
  currentTenantId: string;
  setActiveSubTab?: (tab: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  activeSubTab,
  currentTenantId,
  setActiveSubTab,
}) => {
  const {
    tenants,
    branches,
    updateTenant,
    addBranch,
    updateBranch,
    deleteBranch,
    workflows,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    currentUser,
    switchBranch,
    currentBranchId,
  } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const tenantObj = tenants.find((t: Tenant) => t.id === currentTenantId);
  const tenantBranchesCount = branches.filter(
    (b: Branch) => b.tenantId === currentTenantId,
  ).length;

  const currentUserPermissions = useMemo(() => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      return ["admin_access"];
    }
    return (
      tenantObj?.rbacMatrix?.[currentUser?.role] ??
      currentUser?.permissions ??
      []
    );
  }, [tenantObj, currentUser]);

  const isSuperAdmin =
    currentUser?.role === UserRole.SUPER_ADMIN ||
    currentUserPermissions?.includes("admin_access");

  // Local state for Settings
  const [searchQuery, setSearchQuery] = useState("");
  const [skActiveTab, setSkActiveTab] = useState("general");
  const [brandingPreviewTab, setBrandingPreviewTab] = useState("login");
  const [domainVerified, setDomainVerified] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  
  // Single branding state object
  const [branding, setBranding] = useState<TenantBranding>({
    primaryColor: tenantObj?.branding?.primaryColor || BRANDING_PRESETS.blue.primaryColor,
    secondaryColor: tenantObj?.branding?.secondaryColor || BRANDING_PRESETS.blue.secondaryColor,
    logoUrl: tenantObj?.branding?.logoUrl || "",
    slogan: tenantObj?.branding?.slogan || "",
    fontFamily: tenantObj?.branding?.fontFamily || BRANDING_PRESETS.blue.fontFamily,
    portalHelpTitle: tenantObj?.branding?.portalHelpTitle || "Pusat Bantuan & Garansi",
    portalContactText: tenantObj?.branding?.portalContactText || "0812-3456-7890 | support@fixdev.com",
    customDomain: tenantObj?.branding?.customDomain || "repair.fixdev.com",
    accentColor: tenantObj?.branding?.accentColor || BRANDING_PRESETS.blue.secondaryColor,
    whiteLabelEnabled: tenantObj?.branding?.whiteLabelEnabled || false,
    logo: tenantObj?.branding?.logo || "",
  });

  const verifyDomain = (domain: string) => {
    setIsVerifyingDomain(true);
    setTimeout(() => {
      setIsVerifyingDomain(false);
      setDomainVerified(true);
    }, 1500);
  };

  const [printPaperSize, setPrintPaperSize] = useState(
    tenantObj?.settings?.printConfig?.paperSize || "thermal_80",
  );
  const [paperSize, setPaperSize] = useState(
    tenantObj?.settings?.printConfig?.paperSize || "thermal_80",
  );
  const [labelWidth, setLabelWidth] = useState(
    tenantObj?.settings?.printConfig?.labelWidth ?? 58,
  );
  const [labelHeight, setLabelHeight] = useState(
    tenantObj?.settings?.printConfig?.labelHeight ?? 40,
  );
  const [labelFontSize, setLabelFontSize] = useState<string>(
    tenantObj?.settings?.printConfig?.labelFontSize || "sm",
  );
  const [labelShowQr, setLabelShowQr] = useState(
    tenantObj?.settings?.printConfig?.labelShowQr ?? true,
  );
  const [labelShowLogo, setLabelShowLogo] = useState(
    tenantObj?.settings?.printConfig?.labelShowLogo ?? true,
  );
  const [labelCustomText, setLabelCustomText] = useState(
    tenantObj?.settings?.printConfig?.labelCustomText || "",
  );
  const [customHeaderTitle, setCustomHeaderTitle] = useState(
    tenantObj?.settings?.printConfig?.customHeaderTitle || "",
  );
  const [customFooterText, setCustomFooterText] = useState(
    tenantObj?.settings?.printConfig?.customFooterText || "",
  );
  const activeTenant = tenantObj;
  const [printFontSize, setPrintFontSize] = useState(
    tenantObj?.settings?.printConfig?.printFontSize || "normal",
  );
  const [printMargin, setPrintMargin] = useState<number>(
    tenantObj?.settings?.printConfig?.printMargin ?? 12,
  );
  const [printHeaderLogo, setPrintHeaderLogo] = useState(
    tenantObj?.settings?.printConfig?.printHeaderLogo ?? true,
  );
  const [printQrCode, setPrintQrCode] = useState(
    tenantObj?.settings?.printConfig?.printQrCode ?? true,
  );
  const [printCustomerNotes, setPrintCustomerNotes] = useState(
    tenantObj?.settings?.printConfig?.printCustomerNotes ?? true,
  );
  const [printTermsAndConditions, setPrintTermsAndConditions] = useState(
    tenantObj?.settings?.printConfig?.printTermsAndConditions ?? true,
  );
  const [showTermsInTracking, setShowTermsInTracking] = useState(
    tenantObj?.settings?.printConfig?.showTermsInTracking ?? true,
  );
  const [printPreviewType, setPrintPreviewType] = useState<"nota" | "label">(
    "nota",
  );

  const [termsSalesText, setTermsSalesText] = useState(
    tenantObj?.settings?.printConfig?.termsSalesText || "",
  );
  const [termsRentalText, setTermsRentalText] = useState(
    tenantObj?.settings?.printConfig?.termsRentalText || "",
  );
  const [termsAndConditionsText, setTermsAndConditionsText] = useState(
    tenantObj?.settings?.printConfig?.termsAndConditionsText || "",
  );

  const [showAddWorkflowModal, setShowAddWorkflowModal] = useState(false);
  const [wfName, setWfName] = useState("");
  const [wfTriggerType, setWfTriggerType] = useState<
    "INVOICE_UNPAID" | "TICKET_CREATED" | "STOCK_LOW" | "SHIFT_CLOSED"
  >("TICKET_CREATED");
  const [wfTriggerCondition, setWfTriggerCondition] = useState("");
  const [wfActionType, setWfActionType] = useState<
    "WHATSAPP" | "EMAIL" | "JOURNAL_ENTRY" | "FRAUD_ALERT"
  >("WHATSAPP");
  const [wfActionPayload, setWfActionPayload] = useState("");

  const executeWorkflow = (wf: any) => {};
  const handleDirectPrintLabel = (ticket: any) => {};
  const savePrinterSettings = (options?: any) => {
    if (!options) return;
    // Bangun printConfig baru berdasarkan nilai yang berubah
    const current = tenantObj?.settings?.printConfig || {};
    const updated: Record<string, any> = { ...current };

    if (options.paperSize !== undefined) {
      setPaperSize(options.paperSize);
      updated.paperSize = options.paperSize;
    }
    if (options.printQrCode !== undefined) {
      setPrintQrCode(options.printQrCode);
      updated.printQrCode = options.printQrCode;
    }
    if (options.printHeaderLogo !== undefined) {
      setPrintHeaderLogo(options.printHeaderLogo);
      updated.printHeaderLogo = options.printHeaderLogo;
    }
    if (options.printCustomerNotes !== undefined) {
      setPrintCustomerNotes(options.printCustomerNotes);
      updated.printCustomerNotes = options.printCustomerNotes;
    }
    if (options.printTermsAndConditions !== undefined) {
      setPrintTermsAndConditions(options.printTermsAndConditions);
      updated.printTermsAndConditions = options.printTermsAndConditions;
    }
    if (options.showTermsInTracking !== undefined) {
      setShowTermsInTracking(options.showTermsInTracking);
      updated.showTermsInTracking = options.showTermsInTracking;
    }
    if (options.printFontSize !== undefined) {
      setPrintFontSize(options.printFontSize);
      updated.printFontSize = options.printFontSize;
    }
    if (options.printMargin !== undefined) {
      setPrintMargin(options.printMargin);
      updated.printMargin = options.printMargin;
    }
    if (options.customHeaderTitle !== undefined) {
      setCustomHeaderTitle(options.customHeaderTitle);
      updated.customHeaderTitle = options.customHeaderTitle;
    }
    if (options.customFooterText !== undefined) {
      setCustomFooterText(options.customFooterText);
      updated.customFooterText = options.customFooterText;
    }
    if (options.termsAndConditionsText !== undefined) {
      setTermsAndConditionsText(options.termsAndConditionsText);
      updated.termsAndConditionsText = options.termsAndConditionsText;
    }
    if (options.labelWidth !== undefined) {
      setLabelWidth(options.labelWidth);
      updated.labelWidth = options.labelWidth;
    }
    if (options.labelHeight !== undefined) {
      setLabelHeight(options.labelHeight);
      updated.labelHeight = options.labelHeight;
    }
    if (options.labelFontSize !== undefined) {
      setLabelFontSize(options.labelFontSize);
      updated.labelFontSize = options.labelFontSize;
    }
    if (options.labelShowQr !== undefined) {
      setLabelShowQr(options.labelShowQr);
      updated.labelShowQr = options.labelShowQr;
    }
    if (options.labelShowLogo !== undefined) {
      setLabelShowLogo(options.labelShowLogo);
      updated.labelShowLogo = options.labelShowLogo;
    }
    if (options.labelCustomText !== undefined) {
      setLabelCustomText(options.labelCustomText);
      updated.labelCustomText = options.labelCustomText;
    }
    if (options.termsSalesText !== undefined) {
      setTermsSalesText(options.termsSalesText);
      updated.termsSalesText = options.termsSalesText;
    }
    if (options.termsRentalText !== undefined) {
      setTermsRentalText(options.termsRentalText);
      updated.termsRentalText = options.termsRentalText;
    }

    // Simpan ke tenant.settings.printConfig → updateTenant → sync DB
    updateTenant(currentTenantId, {
      settings: {
        ...(tenantObj?.settings || {}),
        printConfig: updated,
      },
    });
    showToast("Pengaturan cetak berhasil disimpan!", "success");
  };

  const settingsTabs = useMemo(
    () => getSettingsTabs(isSuperAdmin),
    [isSuperAdmin],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedSearchQuery
        ? settingsTabs.filter((t) => {
            const groupLabel = GROUP_ORDER.find((g) => g.key === t.group)?.label || "";
            return (
              t.label.toLowerCase().includes(normalizedSearchQuery) ||
              t.desc.toLowerCase().includes(normalizedSearchQuery) ||
              t.id.toLowerCase().includes(normalizedSearchQuery) ||
              groupLabel.toLowerCase().includes(normalizedSearchQuery)
            );
          })
        : settingsTabs,
    [normalizedSearchQuery, settingsTabs],
  );
  const effectiveActiveSubTab = useMemo<string | null>(() => {
    if (!normalizedSearchQuery) return activeSubTab;
    if (filtered.some((t) => t.id === activeSubTab)) {
      return activeSubTab;
    }
    return filtered[0]?.id || null;
  }, [normalizedSearchQuery, filtered, activeSubTab]);
  const activeTabObj = useMemo(
    () =>
      effectiveActiveSubTab
        ? settingsTabs.find((t) => t.id === effectiveActiveSubTab)
        : {
            id: "default",
            label: normalizedSearchQuery ? "Tidak ada hasil" : "Pusat Pengaturan",
            desc: normalizedSearchQuery
              ? `Tidak ditemukan pengaturan untuk "${searchQuery}".`
              : "Kelola semua pengaturan bisnis Anda",
            icon: Settings,
            group: GROUP_ORDER[0]?.key || "perusahaan",
          },
    [settingsTabs, effectiveActiveSubTab, normalizedSearchQuery, searchQuery],
  );
  const activeBranch = branches.find((b) => b.id === currentBranchId);
  const groupOrder = GROUP_ORDER;
  const activeGroup = activeTabObj.group || groupOrder[0]?.key || "perusahaan";
  const activeGroupLabel =
    groupOrder.find((g) => g.key === activeGroup)?.label || "Pengaturan";
  const testTicket = {};

  return (
    <>
      <div className="space-y-6" id="settings-pane">
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-700 bg-slate-950 p-4 text-slate-100 sticky top-6 self-start max-h-[calc(100vh-96px)] overflow-y-auto">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pengaturan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm bg-slate-900 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {groupOrder.map((g) => {
                  const groupTabs = settingsTabs.filter((t) => t.group === g.key);
                  if (groupTabs.length === 0) return null;
                  const isActiveGroup = activeGroup === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setActiveSubTab?.(groupTabs[0].id)}
                      className={`w-full text-left px-3 py-2 rounded-full text-[11px] font-semibold border transition ${
                        isActiveGroup
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{g.label}</span>
                        <span className="text-[10px] rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
                          {groupTabs.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {searchQuery && (
                <div className="flex flex-wrap gap-2">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveSubTab?.(t.id)}
                      className={`px-2.5 py-1 text-[10px] rounded-full border transition ${
                        effectiveActiveSubTab === t.id
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-[11px] text-slate-400">Tidak ditemukan.</p>
                  )}
                </div>
              )}
            </div>
          </aside>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Tab bar inside card */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50/50 p-4">
              {settingsTabs
                .filter((t) => t.group === activeGroup)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveSubTab?.(t.id)}
                    className={`text-[11px] font-semibold rounded-full px-3 py-2 border transition ${
                      effectiveActiveSubTab === t.id
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
        {effectiveActiveSubTab === "maintenance-contract" && (
          <div className="animate-fadeIn">
            <MaintenanceContractManager />
          </div>
        )}

        {effectiveActiveSubTab === "storage" && (
          <div className="animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                    Cloud Storage
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    System Managed vs Custom S3/R2 Storage Providers
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-slate-700 mb-2">Default (System Managed)</h5>
                  <p className="text-[10px] text-slate-500 mb-3">
                    File disimpan di storage sistem default yang dikelola otomatis.
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
                    <CheckCircle2 className="w-3 h-3" /> Aktif
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 opacity-75">
                  <h5 className="text-xs font-bold text-slate-700 mb-2">Custom S3 / R2</h5>
                  <p className="text-[10px] text-slate-500 mb-3">
                    Hubungkan bucket S3 atau Cloudflare R2 sendiri untuk kontrol penuh.
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-1">
                    Belum dikonfigurasi
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {effectiveActiveSubTab === "security" && (
          <div className="animate-fadeIn">
            <SecuritySettingsPanel
              currentTenantId={currentTenantId}
              tenantObj={tenantObj}
              updateTenant={updateTenant}
              showToast={showToast}
            />
          </div>
        )}

        {effectiveActiveSubTab === "operational-config" && (
          <div className="animate-fadeIn">
            <OperationalSettingsPanel
              currentTenantId={currentTenantId}
              tenantObj={tenantObj}
              updateTenant={updateTenant}
            />
          </div>
        )}

        {effectiveActiveSubTab === "app-config" && (
          <div className="animate-fadeIn">
            <AppSettingsPanel
              currentTenantId={currentTenantId}
              tenantObj={tenantObj}
              updateTenant={updateTenant}
            />
          </div>
        )}

        {effectiveActiveSubTab === "backup" && (
          <div className="animate-fadeIn">
            <SystemBackup />
          </div>
        )}

        {effectiveActiveSubTab === "whatsapp" && (
          <div className="animate-fadeIn">
            <WhatsAppConnector />
          </div>
        )}

        {effectiveActiveSubTab === "telegram" && (
          <div className="animate-fadeIn">
            <TelegramBotManager />
          </div>
        )}

        {effectiveActiveSubTab === "notifications" && (
          <div className="animate-fadeIn">
            <NotificationEngine />
          </div>
        )}

        {effectiveActiveSubTab === "workflows" && (
          <div className="w-full max-w-6xl animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                Aturan Alur Kerja (Workflow Rules)
              </h4>
              <button
                onClick={() => {
                  setWfName("");
                  setWfTriggerType("INVOICE_UNPAID");
                  setWfTriggerCondition("> 30");
                  setWfActionType("WHATSAPP");
                  setWfActionPayload(
                    "Halo {customer_name}, invoice tagihan Anda #{invoice_no} senilai Rp {amount} telah tertunggak lebih dari {condition} hari. Mohon segera melakukan pembayaran. Terima kasih!",
                  );
                  setShowAddWorkflowModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" /> Buat Aturan Automasi Baru
              </button>
            </div>

            {/* Add Workflow Modal / Accordion */}
            {showAddWorkflowModal && (
              <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 animate-fadeIn space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />{" "}
                    Buat Alur Kerja Otomatis Baru
                  </h4>
                  <button
                    onClick={() => setShowAddWorkflowModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-extrabold text-xs"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      Nama Alur Kerja
                    </label>
                    <input
                      type="text"
                      value={wfName}
                      onChange={(e) => setWfName(e.target.value)}
                      placeholder="Contoh: Pengingat WhatsApp Invoice Jatuh Tempo"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      Pemicu Kejadian (Trigger Event)
                    </label>
                    <select
                      value={wfTriggerType}
                      onChange={(e) => setWfTriggerType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                    >
                      <option value="INVOICE_UNPAID">
                        INVOICE_UNPAID (Tagihan Invoice Tertunggak)
                      </option>
                      <option value="TICKET_CREATED">
                        TICKET_CREATED (Tiket Reparasi Baru Diterima)
                      </option>
                      <option value="STOCK_LOW">
                        STOCK_LOW (Level Stok Barang Menipis)
                      </option>
                      <option value="SHIFT_CLOSED">
                        SHIFT_CLOSED (Shift Laci Kasir Ditutup Operator)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      Ambang Batas / Kondisi
                    </label>
                    <input
                      type="text"
                      value={wfTriggerCondition}
                      onChange={(e) => setWfTriggerCondition(e.target.value)}
                      placeholder="Contoh: > 30, < 5, all"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      Metode Aksi Otomatis
                    </label>
                    <select
                      value={wfActionType}
                      onChange={(e) => setWfActionType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                    >
                      <option value="WHATSAPP">
                        Kirim Notifikasi WhatsApp Gateway
                      </option>
                      <option value="EMAIL">
                        Kirim Notifikasi Email Gateway
                      </option>
                      <option value="JOURNAL_ENTRY">
                        Buat Penjurnalan Akuntansi Otomatis
                      </option>
                      <option value="FRAUD_ALERT">
                        Picu Sinyal Alert Detektor Fraud
                      </option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                      Isi Pesan / Parameter Payload Aksi
                    </label>
                    <textarea
                      value={wfActionPayload}
                      onChange={(e) => setWfActionPayload(e.target.value)}
                      rows={2}
                      placeholder="Isi konten notifikasi otomatis atau entri log..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    onClick={() => setShowAddWorkflowModal(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={() => {
                      if (!wfName.trim() || !wfActionPayload.trim()) {
                        showToast(
                          "Mohon isi seluruh bidang nama alur kerja dan parameter aksi!",
                          "error",
                        );
                        return;
                      }
                      addWorkflow({
                        tenantId: currentTenantId,
                        name: wfName,
                        triggerType: wfTriggerType,
                        triggerCondition: wfTriggerCondition,
                        actionType: wfActionType,
                        actionPayload: wfActionPayload,
                        isActive: true,
                        executionCount: 0,
                      });
                      setShowAddWorkflowModal(false);
                      showToast(
                        "Alur kerja otomatisasi berhasil dibuat & diaktifkan!",
                        "success",
                      );
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all cursor-pointer text-xs shadow-sm"
                  >
                    Aktifkan Alur Kerja
                  </button>
                </div>
              </div>
            )}

            {/* Workflows List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {workflows
                .filter((w) => w.tenantId === currentTenantId)
                .map((w) => {
                  const isWfActive = w.isActive;
                  return (
                    <div
                      key={w.id}
                      className={`border rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                        isWfActive
                          ? "bg-white border-slate-200 shadow-sm hover:border-indigo-200"
                          : "bg-slate-50/70 border-slate-200 opacity-75"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {w.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-mono font-bold uppercase">
                                {w.triggerType}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-mono font-bold">
                                kondisi: {w.triggerCondition}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              updateWorkflow(w.id, { isActive: !w.isActive })
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-black border transition-all cursor-pointer ${
                              isWfActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {isWfActive ? "● AKTIF" : "○ NONAKTIF"}
                          </button>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-700 uppercase font-black">
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Pemicu
                            Aksi Otomatis ({w.actionType})
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed font-medium italic">
                            "{w.actionPayload}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4 text-[10px] text-slate-500">
                        <div className="flex items-center gap-3 font-mono">
                          <span>
                            Eksekusi:{" "}
                            <strong className="text-slate-800">
                              {w.executionCount}x
                            </strong>
                          </span>
                          {w.lastTriggeredAt && (
                            <span>
                              Last:{" "}
                              <strong className="text-slate-800">
                                {new Date(w.lastTriggeredAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              executeWorkflow(w.id);
                              showToast(
                                `Uji Pemicu Berhasil! Alur otomatisasi '${w.name}' dieksekusi.`,
                                "success",
                              );
                            }}
                            disabled={!isWfActive}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all text-[11px] cursor-pointer ${
                              isWfActive
                                ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" />{" "}
                            Uji Alur
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                await showConfirm({
                                  title: "Hapus Otomatisasi",
                                  message:
                                    "Apakah Anda yakin ingin menghapus alur kerja otomatisasi ini?",
                                  confirmLabel: "Ya, Hapus",
                                  type: "danger",
                                })
                              ) {
                                deleteWorkflow(w.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="Hapus Alur Kerja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {workflows.filter((w) => w.tenantId === currentTenantId)
                .length === 0 && (
                <div className="col-span-2 text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <GitBranch className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs text-slate-500 font-bold">
                    Belum ada aturan otomatisasi yang dikonfigurasikan.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Klik tombol di kanan atas untuk membuat aturan otomatisasi
                    pertama Anda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {effectiveActiveSubTab === "branding" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
            {/* Dynamic Font Loader */}
            <link
              href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
              rel="stylesheet"
            />

            {/* LEFT COLUMN: Config Panels */}
            <div className="xl:col-span-6 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                      Identitas Visual & Skema Warna
                    </h4>
                  </div>
                </div>
                {/* Visual Settings Content ... */}
              </div>

              {/* 4. Portal Branding & Custom Domain */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                      Customer Portal & Domain
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Kustomisasi portal pelanggan dan integrasikan custom domain
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Bantuan Portal
                  </label>
                  <input
                    type="text"
                    value={branding.portalHelpTitle}
                    onChange={(e) =>
                      setBranding({ ...branding, portalHelpTitle: e.target.value })
                    }
                    placeholder="Contoh: Pusat Bantuan & Kontak"
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teks Kontak Bantuan Portal
                  </label>
                  <textarea
                    value={branding.portalContactText}
                    onChange={(e) =>
                      setBranding({ ...branding, portalContactText: e.target.value })
                    }
                    placeholder="Teks atau pertanyaan bantuan..."
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none text-slate-700 min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Domain Portal
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={branding.customDomain}
                        onChange={(e) => {
                          setBranding({ ...branding, customDomain: e.target.value });
                          setDomainVerified(false);
                        }}
                        placeholder="servis.bisnisanda.com"
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg outline-none text-slate-700"
                      />
                      {branding.customDomain && (
                        <button
                          onClick={() =>
                            setBranding({ ...branding, customDomain: "" })
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => verifyDomain(branding.customDomain)}
                      className={`px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold transition-all ${
                        isVerifyingDomain
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                          : "bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                      disabled={isVerifyingDomain}
                    >
                      {isVerifyingDomain ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Memeriksa...
                        </>
                      ) : (
                        "Verifikasi DNS"
                      )}
                    </button>
                  </div>
                </div>

                {/* Interactive verification state output */}
                {domainVerified ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg space-y-1 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Domain Terkoneksi & Terverifikasi Aktif
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-normal">
                      Sertifikat SSL/TLS otomatis dari{" "}
                      <strong>Let's Encrypt</strong> telah berhasil diterbitkan dan
                      statusnya <strong>Secured & Active</strong>. Portal pelanggan
                      Anda kini dapat diakses secara penuh di{" "}
                      <span className="font-mono underline font-bold">
                        https://{branding.customDomain}
                      </span>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Harap arahkan catatan DNS domain Anda di penyedia domain (seperti
                      Niagahoster, Domainesia, dsb) dengan parameter berikut:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-white border border-slate-200 rounded font-mono">
                        <span className="block text-[8px] text-slate-400 font-sans font-bold uppercase">
                          Tipe Catatan
                        </span>
                        <span className="font-bold text-slate-800">CNAME Record</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded font-mono">
                        <span className="block text-[8px] text-slate-400 font-sans font-bold uppercase">
                          Nilai / Target Tujuan
                        </span>
                        <span className="font-bold text-indigo-700">
                          lb.fixdev.my.id
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (activeTenant) {
                      updateTenant(activeTenant.id, {
                        branding: branding,
                      });
                      showToast(
                        "Kustomisasi branding dan template berhasil disimpan untuk tenant " +
                          activeTenant.name,
                        "success",
                      );
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
                >
                  <CheckSquare className="w-4 h-4" />
                  Terapkan & Simpan Seluruh Identitas
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Real-Time Interactive Live Preview Sandbox */}
            <div className="xl:col-span-6 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-200 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-indigo-400" />
                      Live Interactive Sandbox Preview
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Visualisasi instan bagaimana pelanggan dan kasir melihat
                      brand Anda
                    </p>
                  </div>

                  <div className="flex rounded-lg bg-slate-800 p-0.5 self-start">
                    {[
                      { id: "login", label: "Portal Client", icon: Smartphone },
                      { id: "invoice", label: "Invoicing PDF", icon: FileText },
                      {
                        id: "receipt",
                        label: "Struk Kasir POS",
                        icon: Printer,
                      },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setBrandingPreviewTab(tab.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                            brandingPreviewTab === tab.id
                              ? "bg-indigo-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SANDBOX CONTAINER */}
                <div
                  className="bg-slate-850 rounded-xl border border-slate-800 p-6 min-h-[340px] flex items-center justify-center"
                  style={{
                    fontFamily:
                      branding.fontFamily === "grotesk"
                        ? "Space Grotesk, sans-serif"
                        : branding.fontFamily === "serif"
                          ? "Playfair Display, serif"
                          : branding.fontFamily === "outfit"
                            ? "Outfit, sans-serif"
                            : "Inter, sans-serif",
                  }}
                >
                  {/* PREVIEW: CLIENT PORTAL LOGIN */}
                  {brandingPreviewTab === "login" && (
                    <div className="w-full max-w-xs bg-white rounded-2xl p-5 text-slate-800 shadow-xl border border-slate-100 animate-fadeIn space-y-4 text-center">
                      <div className="mx-auto flex justify-center mb-1">
                        <img
                          src={branding.logoUrl}
                          alt="Brand Logo"
                          className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback on error
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>

                      <div>
                        <h5 className="font-extrabold text-sm text-slate-900 tracking-tight">
                          {activeTenant?.name || "Budi Gadget"}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto italic">
                          {branding.slogan}
                        </p>
                      </div>

                      <div className="space-y-2 text-left">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">
                            Nomor Tiket / HP
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: TKT-1004 / 0812..."
                            disabled
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-[10px] outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          className="w-full text-white text-[10px] font-bold py-2 rounded transition-all cursor-pointer"
                          style={{ backgroundColor: branding.primaryColor }}
                        >
                          Cek Status Perbaikan Gadget
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-[8px] text-slate-400">
                        Domain Terverifikasi:{" "}
                        <span className="font-mono text-indigo-600 font-bold underline">
                          {branding.customDomain}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: INVOICE HEADER PDF */}
                  {brandingPreviewTab === "invoice" && (
                    <div className="w-full bg-white rounded-xl p-5 text-slate-800 shadow-xl border border-slate-100 animate-fadeIn space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={branding.logoUrl}
                            alt="Brand Logo"
                            className="h-9 w-9 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h5 className="font-extrabold text-xs text-slate-900 leading-tight">
                              {activeTenant?.name || "Budi Gadget"}
                            </h5>
                            <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded font-mono font-bold uppercase">
                              White-Label Enterprise
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className="text-sm font-extrabold tracking-tight uppercase block"
                            style={{ color: branding.primaryColor }}
                          >
                            INVOICE
                          </span>
                          <span className="text-[8px] font-mono text-slate-400 block">
                            INV/2026/0401
                          </span>
                        </div>
                      </div>

                        <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-500">
                          <div>
                            <span className="font-mono text-[7px] text-slate-400 uppercase block">
                              Ditagihkan Kepada:
                            </span>
                            <strong className="text-slate-800 block text-[10px]">
                              Asrar Annur
                            </strong>
                            <span>0812-3456-7890</span>
                          </div>
                          <div className="text-right">
                          <span className="font-mono text-[7px] text-slate-400 uppercase block">
                            Metode Pembayaran:
                          </span>
                          <span className="font-bold text-slate-800">
                            QRIS Mandiri Autodebet
                          </span>
                          <span className="block text-slate-400">
                            Status: LUNAS
                          </span>
                        </div>
                      </div>

                      <div className="border border-slate-100 rounded overflow-hidden text-[9px]">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-400 text-[8px] font-mono uppercase">
                            <tr>
                              <th className="p-1 px-2">Deskripsi Layanan</th>
                              <th className="p-1 text-right">Biaya</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="p-1 px-2">
                                Ganti LCD iPhone 13 Pro Max Original Apple
                              </td>
                              <td className="p-1 text-right font-mono">
                                Rp 3.500.000
                              </td>
                            </tr>
                            <tr>
                              <td className="p-1 px-2">
                                Jasa Kalibrasi TrueTone & Seal Waterproofing
                              </td>
                              <td className="p-1 text-right font-mono">
                                Rp 250.000
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-150">
                        <span className="text-[8px] italic text-slate-400">
                          {branding.slogan}
                        </span>
                        <div>
                          <span className="text-[9px] text-slate-500 font-medium">
                            Total Tagihan:{" "}
                          </span>
                          <span
                            className="font-mono font-extrabold"
                            style={{ color: branding.primaryColor }}
                          >
                            Rp 3.750.000
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: POS RECEIPT CASHIER */}
                  {brandingPreviewTab === "receipt" && (
                    <div className="w-64 bg-amber-50 text-slate-900 font-mono text-[9px] p-4 shadow-xl border border-amber-100 rounded animate-fadeIn space-y-3 relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%)] bg-[size:6px_6px]" />

                      <div className="text-center pt-2 space-y-1">
                        <h6 className="font-extrabold text-[11px] uppercase tracking-wide">
                          {activeTenant?.name || "Budi Gadget"}
                        </h6>
                        <p className="text-[8px] text-slate-500">
                          {activeTenant?.address || "Tamalanrea, Makassar"}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          Telp: 0811445588
                        </p>
                        <p className="text-slate-400">
                          ---------------------------------
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>2026-07-01 10:45</span>
                          <span>Kasir: Admin Budi</span>
                        </div>
                        <span>No: TX-900481</span>
                        <p className="text-slate-400">
                          ---------------------------------
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="space-y-0.5">
                          <div className="flex justify-between font-bold">
                            <span>Service Battery MacBook Pro M1</span>
                            <span>1.200.000</span>
                          </div>
                          <span className="text-[8px] text-slate-500">
                            1 unit x Rp 1.200.000
                          </span>
                        </div>
                        <p className="text-slate-400">
                          ---------------------------------
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>SUBTOTAL:</span>
                          <span>Rp 1.200.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PAJAK (11%):</span>
                          <span>Rp 132.000</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-[10px]">
                          <span>TOTAL AKHIR:</span>
                          <span>Rp 1.332.000</span>
                        </div>
                      </div>

                      <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-1">
                        <p className="text-[8px] italic leading-tight text-slate-600">
                          {branding.slogan}
                        </p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">
                          Sistem POS Terverifikasi
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-slate-300">
                <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  White-Label Portal Security Shield
                </h5>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Setiap request yang dikirimkan oleh customer ke domain{" "}
                  <span className="text-indigo-400 font-mono font-bold underline">
                    {branding.customDomain}
                  </span>{" "}
                  otomatis diproteksi oleh{" "}
                  <strong>Antigravity Web Firewall (WAF)</strong>. Serangan SQL
                  Injection, DDoS, dan ancaman penyerobotan token otomatis
                  diblokir di jaringan terisolasi tenant Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {effectiveActiveSubTab === "rbac" && (
          <div className="animate-fadeIn">
            <RBACManager />
          </div>
        )}

        {effectiveActiveSubTab === "modules-config" && (
          <div className="animate-fadeIn">
            <ModuleParameterConfig />
          </div>
        )}

        {effectiveActiveSubTab === "branches" && (
          <BranchesManagerPanel currentTenantId={currentTenantId} />
        )}

        {effectiveActiveSubTab === "subscription" && (
          <div className="animate-fadeIn space-y-6">
            <SaaSSubscription />
          </div>
        )}

        {effectiveActiveSubTab === "printer-terms" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
            {/* Left Configuration Column */}
            <div className="xl:col-span-6 space-y-6">
              {/* Save Success Alert Indicator */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 bg-emerald-500 text-white rounded-md">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">
                      Sinkronisasi Printer & Label Aktif
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      Seluruh pengaturan ini akan diterapkan otomatis pada
                      tindakan cetak langsung (Nota QR & Label QR) di tabel
                      tiket.
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  Ready
                </span>
              </div>

              {/* Card 1: Layout & Size Setup */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                      Tata Letak & Format Struk/Nota
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Atur ukuran media, margin fisik, dan ukuran huruf kertas
                      thermal atau HVS.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                      Ukuran Kertas Media
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) =>
                        savePrinterSettings({ paperSize: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer transition-all font-semibold"
                    >
                      <option value="thermal_58">
                        Thermal 58 mm (Kertas Struk Mini)
                      </option>
                      <option value="thermal_80">
                        Thermal 80 mm (Kertas Struk Kasir Standar)
                      </option>
                      <option value="hvs_a4">
                        HVS A4 (Faktur Service Lipat/Penuh)
                      </option>
                      <option value="hvs_letter">
                        HVS Letter (Faktur Standar)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                      Ukuran Font Utama
                    </label>
                    <select
                      value={printFontSize}
                      onChange={(e) =>
                        savePrinterSettings({ printFontSize: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer transition-all font-semibold"
                    >
                      <option value="sm">
                        Kecil (Maksimum Kepadatan / Eco-Print)
                      </option>
                      <option value="base">
                        Sedang / Default (Sangat Direkomendasikan)
                      </option>
                      <option value="lg">Besar (Sangat Terbaca & Jelas)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Margin Kertas Cetakan
                    </label>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {printMargin} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={printMargin}
                    onChange={(e) =>
                      savePrinterSettings({
                        printMargin: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-1">
                    <span>0 px (Tanpa Margin)</span>
                    <span>20 px</span>
                    <span>40 px (Sangat Lebar)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">
                        Cetak QR Code Lacak
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Sertakan QR untuk dipindai pelanggan
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printQrCode}
                      onChange={(e) =>
                        savePrinterSettings({ printQrCode: e.target.checked })
                      }
                      className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">
                        Tampilkan Logo Header
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Tampilkan ikon lencana keamanan nota
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printHeaderLogo}
                      onChange={(e) =>
                        savePrinterSettings({
                          printHeaderLogo: e.target.checked,
                        })
                      }
                      className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">
                        Cetak Keluhan Unit
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Sertakan detail keluhan pelanggan
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printCustomerNotes}
                      onChange={(e) =>
                        savePrinterSettings({
                          printCustomerNotes: e.target.checked,
                        })
                      }
                      className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">
                        Cetak Syarat & Garansi
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Sertakan poin hukum draf di bawah pada nota
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printTermsAndConditions}
                      onChange={(e) =>
                        savePrinterSettings({
                          printTermsAndConditions: e.target.checked,
                        })
                      }
                      className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">
                        Tampilkan S&K di Lacak
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Sertakan poin hukum draf di portal lacak
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showTermsInTracking}
                      onChange={(e) =>
                        savePrinterSettings({
                          showTermsInTracking: e.target.checked,
                        })
                      }
                      className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* New Card: Label Sticker Printing Configuration */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                        Kustomisasi Label Stiker Unit
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Atur dimensi stiker, font, and informasi pada label
                        identifikasi.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const testTicket = {
                        ticketNo: "SVC-2026-TEST",
                        deviceName: "iPhone 15 Pro Max",
                        deviceBrandModel: "Apple - A3106",
                        deviceSerial: "C39ZX899V20F",
                        customerId: "",
                        customerApprovalDate: new Date().toISOString(),
                      } as any;
                      handleDirectPrintLabel(testTicket);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" /> Cetak Tes Label
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Lebar Label (px)
                    </label>
                    <input
                      type="number"
                      min="200"
                      max="600"
                      value={labelWidth}
                      onChange={(e) =>
                        savePrinterSettings({
                          labelWidth: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Tinggi Label (px)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="400"
                      value={labelHeight}
                      onChange={(e) =>
                        savePrinterSettings({
                          labelHeight: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                      Ukuran Font Label
                    </label>
                    <select
                      value={labelFontSize}
                      onChange={(e) =>
                        savePrinterSettings({ labelFontSize: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                    >
                      <option value="xs">Kecil (xs)</option>
                      <option value="sm">Default (sm)</option>
                      <option value="base">Sedang (base)</option>
                      <option value="lg">Besar (lg)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Tampilkan QR Code
                      </span>
                      <span className="text-[8px] text-slate-400 block">
                        Sertakan barcode QR pelacakan
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={labelShowQr}
                      onChange={(e) =>
                        savePrinterSettings({ labelShowQr: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Tampilkan Nama Toko
                      </span>
                      <span className="text-[8px] text-slate-400 block">
                        Sertakan header judul toko
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={labelShowLogo}
                      onChange={(e) =>
                        savePrinterSettings({ labelShowLogo: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Teks Kaki Stiker Label (Footer Alert)
                  </label>
                  <input
                    type="text"
                    value={labelCustomText}
                    onChange={(e) =>
                      savePrinterSettings({ labelCustomText: e.target.value })
                    }
                    placeholder="⚠️ TEMPEL DI UNIT - PINDAI UNTUK DIAGNOSA / AMBIL"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Card 2: Custom Header & Footer Texts */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                      Identitas & Catatan Kaki Nota
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Sesuaikan draf judul banner atas dan catatan penutup.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Judul Header Toko Khusus
                  </label>
                  <input
                    type="text"
                    placeholder={`Nama toko Anda (Kosongkan untuk memakai "${activeTenant?.name || "Repair Hub"}")`}
                    value={customHeaderTitle}
                    onChange={(e) =>
                      savePrinterSettings({ customHeaderTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Catatan Kaki Penutup (Footer Notes)
                  </label>
                  <textarea
                    rows={3}
                    value={customFooterText}
                    onChange={(e) =>
                      savePrinterSettings({ customFooterText: e.target.value })
                    }
                    placeholder="Tulis pesan penutup struk atau ucapan terima kasih..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>
              </div>

              {/* Card 3: Specific S&K per Operation type (Service, Sales, Rental) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                        Draf Syarat & Ketentuan (S&K)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Sesuaikan klausul hukum spesifik per jenis transaksi
                        bisnis.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operational Type Tab Switches */}
                <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-lg">
                  <button
                    onClick={() => setSkActiveTab("servis")}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                      skActiveTab === "servis"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    🛠️ Servis
                  </button>
                  <button
                    onClick={() => setSkActiveTab("penjualan")}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                      skActiveTab === "penjualan"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    🛒 Penjualan
                  </button>
                  <button
                    onClick={() => setSkActiveTab("penyewaan")}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                      skActiveTab === "penyewaan"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    📦 Penyewaan
                  </button>
                </div>

                {/* Servis S&K Area */}
                {skActiveTab === "servis" && (
                  <div className="space-y-2">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                      Klausul Perjanjian Reparasi & Garansi Unit
                    </label>
                    <textarea
                      rows={6}
                      value={termsAndConditionsText}
                      onChange={(e) =>
                        savePrinterSettings({
                          termsAndConditionsText: e.target.value,
                        })
                      }
                      placeholder="Masukkan poin-poin syarat servis..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed"
                    />
                    <p className="text-[9px] text-slate-400 italic">
                      Diterapkan pada Nota Bukti Penerimaan Unit Servis dan
                      Portal Pelacakan online.
                    </p>
                  </div>
                )}

                {/* Penjualan S&K Area */}
                {skActiveTab === "penjualan" && (
                  <div className="space-y-2">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                      Klausul Faktur & Garansi Penjualan Barang/Aksesoris
                    </label>
                    <textarea
                      rows={6}
                      value={termsSalesText}
                      onChange={(e) =>
                        savePrinterSettings({ termsSalesText: e.target.value })
                      }
                      placeholder="Masukkan poin-poin syarat penjualan ritel..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed"
                    />
                    <p className="text-[9px] text-slate-400 italic">
                      Diterapkan otomatis pada pencetakan Struk / Nota penjualan
                      kasir POS.
                    </p>
                  </div>
                )}

                {/* Penyewaan S&K Area */}
                {skActiveTab === "penyewaan" && (
                  <div className="space-y-2">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                      Klausul Perjanjian Sewa, Jaminan, & Denda Unit
                    </label>
                    <textarea
                      rows={6}
                      value={termsRentalText}
                      onChange={(e) =>
                        savePrinterSettings({ termsRentalText: e.target.value })
                      }
                      placeholder="Masukkan poin-poin aturan penyewaan perangkat..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed"
                    />
                    <p className="text-[9px] text-slate-400 italic">
                      Diterapkan otomatis pada pencetakan Dokumen / Nota sewa
                      harian/mingguan.
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={async () => {
                      if (
                        await showConfirm({
                          title: "Reset Syarat & Ketentuan",
                          message:
                            "Reset seluruh Syarat & Ketentuan ke nilai default? Perubahan yang Anda buat akan ditimpa.",
                          confirmLabel: "Reset ke Default",
                          type: "warning",
                        })
                      ) {
                        savePrinterSettings({
                          termsAndConditionsText:
                            "1. Garansi berlaku selama 30 hari hanya untuk komponen yang diganti.\n2. Kerusakan akibat cairan, benturan, atau modifikasi software mandiri membatalkan garansi.\n3. Barang yang tidak diambil dalam waktu 90 hari di luar tanggung jawab toko.\n4. Biaya pembatalan setelah pembongkaran dikenakan Rp 50.000,- untuk biaya analisa teknisi.",
                          termsSalesText:
                            "1. Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.\n2. Komplain kekurangan item wajib menyertakan video unboxing utuh.\n3. Aksesoris dan item promo tidak dilindungi oleh garansi toko.\n4. Pembayaran wajib lunas sebelum barang diserahterimakan.",
                          termsRentalText:
                            "1. Penyewa wajib menyerahkan kartu identitas asli sebagai jaminan.\n2. Keterlambatan pengembalian dikenakan denda Rp 25.000,- per jam.\n3. Kerusakan fisik pada unit sewa sepenuhnya ditanggung oleh penyewa.\n4. Pembatalan sewa kurang dari 24 jam dikenakan biaya administrasi 50%.",
                        });
                      }
                    }}
                    className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 bg-white rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                  >
                    Reset Default
                  </button>

                  <button
                    onClick={() => {
                      showToast(
                        "Seluruh Syarat & Ketentuan multi-layanan berhasil disimpan!",
                        "success",
                      );
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>
            </div>

            {/* Right Live Preview Column */}
            <div className="xl:col-span-6 space-y-4">
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

                <div className="w-full flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
                  <div>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-900/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Pratinjau Langsung
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-100 tracking-tight mt-1">
                      Pratinjau Cetak Fisik
                    </h3>
                  </div>

                  {/* Print Mode Switch */}
                  <div className="flex border border-slate-700 bg-slate-800/80 p-0.5 rounded-lg text-[9px] font-bold uppercase">
                    <button
                      onClick={() => setPrintPreviewType("nota")}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        printPreviewType === "nota"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📄 Nota Struk
                    </button>
                    <button
                      onClick={() => setPrintPreviewType("label")}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        printPreviewType === "label"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🏷️ Label Stiker
                    </button>
                  </div>
                </div>

                {printPreviewType === "nota" ? (
                  /* Simulated Receipt paper strip */
                  <div
                    className="bg-white text-slate-800 rounded-lg p-5 shadow-2xl border-t-[8px] border-indigo-600 flex flex-col justify-between relative overflow-hidden transition-all duration-300 w-full animate-fadeIn"
                    style={{
                      maxWidth:
                        paperSize === "thermal_58"
                          ? "260px"
                          : paperSize === "thermal_80"
                            ? "340px"
                            : "100%",
                      padding: `${Math.max(10, printMargin)}px`,
                    }}
                  >
                    {/* Jagged edges simulation */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-50 border-b border-dashed border-slate-300" />

                    {/* Logo */}
                    {printHeaderLogo && (
                      <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                          <Printer className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="text-center mb-4">
                      <h1 className="font-extrabold tracking-tight text-slate-900 text-sm uppercase leading-tight">
                        {customHeaderTitle.trim() ||
                          activeTenant?.name ||
                          "REPAIR HUB"}
                      </h1>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                        BUKTI PENERIMAAN UNIT SERVIS
                      </p>
                      <div className="inline-block bg-slate-100 border border-slate-200 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-md mt-2 text-slate-800">
                        TIKET: #SVC-2026-0099
                      </div>
                    </div>

                    {/* Meta rows */}
                    <div
                      className="space-y-1.5 text-slate-700"
                      style={{
                        fontSize:
                          printFontSize === "sm"
                            ? "10px"
                            : printFontSize === "lg"
                              ? "13px"
                              : "11px",
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Pelanggan:
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          Ahmad Dahlan (0812-4455-xxxx)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Tanggal Diterima:
                        </span>
                        <span className="font-semibold text-slate-800 text-right">
                          01 Juli 2026
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Nama Perangkat:
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          PlayStation 5 Slim
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Brand & Model:
                        </span>
                        <span className="font-semibold text-slate-800 text-right">
                          Sony - CFI-2016
                        </span>
                      </div>

                      {printCustomerNotes && (
                        <div className="flex justify-between pt-0.5">
                          <span className="text-slate-400 font-medium">
                            Keluhan Utama:
                          </span>
                          <span className="font-semibold text-slate-800 text-right italic">
                            Overheating & mati mendadak saat game 4K
                          </span>
                        </div>
                      )}

                      <div className="h-px border-t border-dashed border-slate-200 my-2" />

                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Jenis Layanan:
                        </span>
                        <span className="font-bold text-indigo-600 text-right">
                          Reparasi Penuh & Cleaning
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Estimasi Biaya:
                        </span>
                        <span className="font-bold text-slate-900 text-right text-xs">
                          Rp 350,000
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">
                          Status Awal:
                        </span>
                        <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] uppercase">
                          Diterima
                        </span>
                      </div>
                    </div>

                    {/* QR Code section */}
                    {printQrCode && (
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-150 rounded-lg text-center">
                        <div className="w-24 h-24 bg-white border border-slate-200 p-1.5 mx-auto mb-2 rounded flex items-center justify-center">
                          {/* Simulated QR block art for realistic feel */}
                          <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-80">
                            {[...Array(16)].map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-sm ${i % 3 === 0 || i % 7 === 1 ? "bg-slate-950" : "bg-transparent"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-700 block uppercase tracking-wider">
                          PINDAI QR UNTUK LACAK STATUS
                        </span>
                        <span className="text-[8px] text-slate-400 block font-mono mt-0.5 truncate max-w-full">
                          {window.location.origin}/?ticket=SVC-2026-0099
                        </span>
                      </div>
                    )}

                    {/* Terms and Conditions Section */}
                    {printTermsAndConditions &&
                      termsAndConditionsText.trim() && (
                        <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                          <span className="text-[9px] font-bold text-slate-900 block uppercase mb-1 tracking-wide">
                            Syarat & Ketentuan Layanan (Servis):
                          </span>
                          <ul className="text-[8px] text-slate-500 pl-3 list-decimal space-y-0.5 leading-relaxed">
                            {termsAndConditionsText
                              .split("\n")
                              .filter((l) => l.trim())
                              .map((line, idx) => (
                                <li
                                  key={idx}
                                  className="font-medium text-slate-600"
                                >
                                  {line.replace(/^\d+[\.\s]*/, "")}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                    {/* Footer notes */}
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-medium leading-relaxed">
                      {customFooterText.split("\n").map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>

                    {/* Bottom Jagged strip */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 border-t border-dashed border-slate-300" />
                  </div>
                ) : (
                  /* Simulated Label sticker */
                  <div
                    className="bg-white text-slate-900 rounded-lg p-4 shadow-2xl border-2 border-slate-950 flex flex-col justify-between relative overflow-hidden transition-all duration-300 animate-fadeIn"
                    style={{
                      width: `${labelWidth}px`,
                      height: `${labelHeight}px`,
                      maxHeight: "350px",
                    }}
                  >
                    <div className="flex justify-between items-center border-b border-slate-950 pb-1.5">
                      <span
                        className="font-extrabold text-[9px] text-slate-900 uppercase tracking-tight"
                        style={{ display: labelShowLogo ? "block" : "none" }}
                      >
                        {customHeaderTitle.trim() ||
                          activeTenant?.name ||
                          "REPAIR HUB"}
                      </span>
                      <span className="text-[10px] font-mono font-extrabold bg-slate-950 text-white px-1.5 py-0.5 rounded">
                        #SVC-TEST-LABEL
                      </span>
                    </div>

                    <div className="flex gap-2 items-center my-1.5 flex-1 min-height-0">
                      {labelShowQr && (
                        <div className="w-14 h-14 border border-slate-900 p-1 bg-white shrink-0 flex items-center justify-center">
                          <div className="grid grid-cols-3 gap-0.5 w-full h-full opacity-90">
                            {[...Array(9)].map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-sm ${i % 2 === 0 ? "bg-slate-950" : "bg-transparent"}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <div
                        className="text-slate-800 leading-tight space-y-0.5 truncate"
                        style={{
                          fontSize:
                            labelFontSize === "xs"
                              ? "8px"
                              : labelFontSize === "lg"
                                ? "13px"
                                : labelFontSize === "base"
                                  ? "11px"
                                  : "9.5px",
                        }}
                      >
                        <div>
                          <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                            Perangkat
                          </strong>{" "}
                          <span className="font-bold text-slate-900">
                            iPhone 15 Pro Max
                          </span>
                        </div>
                        <div>
                          <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                            Model
                          </strong>{" "}
                          <span className="font-semibold text-slate-800">
                            Apple - A3106
                          </span>
                        </div>
                        <div>
                          <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                            Pelanggan
                          </strong>{" "}
                          <span className="font-bold text-slate-800">
                            Budi Santoso
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-950 pt-1 text-center font-bold uppercase tracking-wide text-slate-900 text-[7px] truncate font-mono">
                      {labelCustomText}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed text-center max-w-sm">
                  Gunakan tombol{" "}
                  <strong className="text-slate-300">"Nota QR"</strong> atau{" "}
                  <strong className="text-slate-300">"Label QR"</strong> pada
                  tabel tiket untuk langsung mencetak nota fisik menggunakan
                  konfigurasi di atas.
                </p>
              </div>
            </div>
          </div>
        )}

        {effectiveActiveSubTab === "developer-api" && (
          <div className="animate-fadeIn">
            <DeveloperApiManager />
          </div>
        )}

        {effectiveActiveSubTab === "import-export" && (
          <div className="animate-fadeIn">
            <DataImporter />
          </div>
        )}

        {effectiveActiveSubTab === "loyalty" && (
          <div className="animate-fadeIn">
            <VoucherManager />
          </div>
        )}

        {effectiveActiveSubTab === "maintenance-contract" && (
          <div className="animate-fadeIn">
            <MaintenanceContractManager />
          </div>
        )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

