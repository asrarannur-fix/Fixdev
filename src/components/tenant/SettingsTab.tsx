import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { SettingsBranding } from "./SettingsBranding";

import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from "../../types";
import { GROUP_ORDER, getSettingsTabs } from "../../config/settingsConfigs";
import { SettingsPrinterTerms } from "./SettingsPrinterTerms";
import { SettingsWorkflows } from "./SettingsWorkflows";
import { checkQzTray, printFrame, printJobAsync } from "../../utils/printJob";
import { useServiceTrackerQr } from "../../hooks/useServiceTrackerQr";

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
    executeWorkflow,
    currentUser,
    switchBranch,
    currentBranchId,
    services,
    apiFetch,
  } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const { handleDirectPrintLabel } = useServiceTrackerQr(services || [], currentTenantId, apiFetch);

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
    setDomainVerified(false);
    if (!domain.trim()) {
      showToast("Masukkan custom domain terlebih dahulu.", "error");
      return;
    }
    showToast(
      "Verifikasi DNS otomatis belum tersedia. Domain belum dianggap aktif; arahkan CNAME lalu verifikasi dari infrastruktur hosting.",
      "warning",
    );
  };


  const [paperSize, setPaperSize] = useState(
    tenantObj?.settings?.printConfig?.paperSize || "thermal_80",
  );
  const [printMode, setPrintMode] = useState<"browser" | "qz">(tenantObj?.settings?.printConfig?.printMode || "browser");
  const [printerName, setPrinterName] = useState(tenantObj?.settings?.printConfig?.printerName || "");
  const [labelWidth, setLabelWidth] = useState(
    Math.min(600, Math.max(200, Number(tenantObj?.settings?.printConfig?.labelWidth) || 320)),
  );
  const [labelHeight, setLabelHeight] = useState(
    Math.min(400, Math.max(100, Number(tenantObj?.settings?.printConfig?.labelHeight) || 180)),
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
    tenantObj?.settings?.printConfig?.printFontSize || "sm",
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
  const [qzStatus, setQzStatus] = useState("Belum dicek");
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [qzChecking, setQzChecking] = useState(false);

  const [termsSalesText, setTermsSalesText] = useState(
    tenantObj?.settings?.printConfig?.termsSalesText || "",
  );
  const [termsRentalText, setTermsRentalText] = useState(
    tenantObj?.settings?.printConfig?.termsRentalText || "",
  );
  const [termsAndConditionsText, setTermsAndConditionsText] = useState(
    tenantObj?.settings?.printConfig?.termsAndConditionsText || "",
  );
  const printConfigRef = useRef<Record<string, any>>(tenantObj?.settings?.printConfig || {});
  const printSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  const checkPrinterConnection = async () => {
    setQzChecking(true);
    const result = await checkQzTray();
    setQzPrinters(result.printers);
    setQzStatus(result.connected ? `Terhubung (${result.printers.length} printer)` : result.error || "Tidak terhubung");
    setQzChecking(false);
  };
  const testConfiguredPrinter = async () => {
    const config = printConfigRef.current;
    const result = await printJobAsync({ title: "Tes Printer FIXDEV", printConfig: config, html: `<div style="font-family:Arial;text-align:center;padding:20px"><b>TES PRINTER FIXDEV</b><br/>Printer: ${config.printerName || "Browser"}<br/>${new Date().toLocaleString("id-ID")}</div>` });
    showToast(result.transport === "qz" ? "Test print QZ Tray berhasil dikonfirmasi." : result.transport === "browser" ? "QZ tidak aktif. Browser print dialog dibuka." : result.error || "Test print gagal.", result.ok ? "success" : "error");
  };


  const savePrinterSettings = async (options?: any) => {
    if (!options || !tenantObj) return;
    // Serialize writes. Rapid controls must merge against latest queued config, not stale tenantObj.
    const updated = { ...printConfigRef.current, ...options };
    printConfigRef.current = updated;
    if (options.printMode !== undefined) { setPrintMode(options.printMode); updated.printMode = options.printMode; }
    if (options.printerName !== undefined) { setPrinterName(options.printerName); updated.printerName = options.printerName; }

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

    // Serialize persistence. Each write merges against config already queued.
    const save = printSaveQueueRef.current.then(async () => {
      await updateTenant(currentTenantId, {
        settings: {
          ...(tenantObj.settings || {}),
          printConfig: printConfigRef.current,
        },
      });
    });
    printSaveQueueRef.current = save.catch(() => undefined);
    try {
      await save;
      showToast("Pengaturan cetak berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan pengaturan cetak.", "error");
    }
  };

  useEffect(() => {
    if (!tenantObj) return;
    setBranding({
      primaryColor: tenantObj.branding?.primaryColor || BRANDING_PRESETS.blue.primaryColor,
      secondaryColor: tenantObj.branding?.secondaryColor || BRANDING_PRESETS.blue.secondaryColor,
      logoUrl: tenantObj.branding?.logoUrl || "",
      slogan: tenantObj.branding?.slogan || "",
      fontFamily: tenantObj.branding?.fontFamily || BRANDING_PRESETS.blue.fontFamily,
      portalHelpTitle: tenantObj.branding?.portalHelpTitle || "Pusat Bantuan & Garansi",
      portalContactText: tenantObj.branding?.portalContactText || "0812-3456-7890 | support@fixdev.com",
      customDomain: tenantObj.branding?.customDomain || "repair.fixdev.com",
      accentColor: tenantObj.branding?.accentColor || BRANDING_PRESETS.blue.secondaryColor,
      whiteLabelEnabled: tenantObj.branding?.whiteLabelEnabled || false,
      logo: tenantObj.branding?.logo || "",
    });
    const pc = tenantObj?.settings?.printConfig || {};
    printConfigRef.current = { ...pc };
    printSaveQueueRef.current = Promise.resolve();
    setPrintMode(pc.printMode || "browser");
    setPrinterName(pc.printerName || "");

    setPaperSize(pc.paperSize || "thermal_80");
    setLabelWidth(Math.min(600, Math.max(200, Number(pc.labelWidth) || 320)));
    setLabelHeight(Math.min(400, Math.max(100, Number(pc.labelHeight) || 180)));
    setLabelFontSize(pc.labelFontSize || "sm");
    setLabelShowQr(pc.labelShowQr ?? true);
    setLabelShowLogo(pc.labelShowLogo ?? true);
    setLabelCustomText(pc.labelCustomText || "");
    setCustomHeaderTitle(pc.customHeaderTitle || "");
    setCustomFooterText(pc.customFooterText || "");
    setPrintFontSize(pc.printFontSize || "sm");
    setPrintMargin(pc.printMargin ?? 12);
    setPrintHeaderLogo(pc.printHeaderLogo ?? true);
    setPrintQrCode(pc.printQrCode ?? true);
    setPrintCustomerNotes(pc.printCustomerNotes ?? true);
    setPrintTermsAndConditions(pc.printTermsAndConditions ?? true);
    setShowTermsInTracking(pc.showTermsInTracking ?? true);
    setTermsSalesText(pc.termsSalesText || "");
    setTermsRentalText(pc.termsRentalText || "");
    setTermsAndConditionsText(pc.termsAndConditionsText || "");
    setDomainVerified(false);
    setIsVerifyingDomain(false);
  }, [tenantObj]);

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
              (t.label || "").toLowerCase().includes(normalizedSearchQuery) ||
              (t.desc || "").toLowerCase().includes(normalizedSearchQuery) ||
              (t.id || "").toLowerCase().includes(normalizedSearchQuery) ||
              groupLabel.toLowerCase().includes(normalizedSearchQuery)
            );
          })
        : settingsTabs,
    [normalizedSearchQuery, settingsTabs],
  );
  const effectiveActiveSubTab = useMemo<string | null>(() => {
    if (!normalizedSearchQuery) {
      return settingsTabs.some((t) => t.id === activeSubTab)
        ? activeSubTab
        : settingsTabs[0]?.id || null;
    }
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
                  className="w-full pl-9 pr-8 py-2 text-sm bg-slate-900 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
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
                      id={`settings-group-${g.key}`}
                      aria-label={`Grup pengaturan ${g.label}`}
                      onClick={() => setActiveSubTab?.(groupTabs[0].id)}
                      className={`w-full text-left px-3 py-2 rounded-full text-[11px] font-semibold border transition ${
                        isActiveGroup
                          ? "bg-indigo-500 text-white border-accent"
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
                          ? "bg-indigo-500 text-white border-accent"
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
                    id={`settings-tab-${t.id}`}
                    aria-label={`Pengaturan ${t.label}`}
                    onClick={() => setActiveSubTab?.(t.id)}
                    className={`text-[11px] font-semibold rounded-full px-3 py-2 border transition ${
                      effectiveActiveSubTab === t.id
                        ? "bg-accent-lighter text-accent border-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
        {effectiveActiveSubTab === "storage" && (
          <div className="animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
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

        {effectiveActiveSubTab === "workflows" && <SettingsWorkflows {...{addWorkflow, currentTenantId, deleteWorkflow, executeWorkflow, setShowAddWorkflowModal, setWfActionPayload, setWfActionType, setWfName, setWfTriggerCondition, setWfTriggerType, showAddWorkflowModal, showConfirm, showToast, updateWorkflow, wfActionPayload, wfActionType, wfName, wfTriggerCondition, wfTriggerType, workflows}} />}

        {effectiveActiveSubTab === "branding" && <SettingsBranding {...{activeTenant, branding, brandingPreviewTab, domainVerified, isVerifyingDomain, setBranding, setBrandingPreviewTab, setDomainVerified, showToast, updateTenant, verifyDomain}} />}

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

        {effectiveActiveSubTab === "printer-terms" && <SettingsPrinterTerms {...{activeTenant, customFooterText, customHeaderTitle, handleDirectPrintLabel, labelCustomText, labelFontSize, labelHeight, labelShowLogo, labelShowQr, labelWidth, paperSize, printMode, printerName, qzStatus, qzPrinters, qzChecking, checkPrinterConnection, testConfiguredPrinter, printCustomerNotes, printFontSize, printHeaderLogo, printMargin, printPreviewType, printQrCode, printTermsAndConditions, savePrinterSettings, setPrintPreviewType, setSkActiveTab, showConfirm, showTermsInTracking, showToast, skActiveTab, termsAndConditionsText, termsRentalText, termsSalesText}} />}

        {effectiveActiveSubTab === "developer-api" && (
          <div className="animate-fadeIn"><DeveloperApiManager /></div>
        )}
        {effectiveActiveSubTab === "import-export" && (
          <div className="animate-fadeIn"><DataImporter /></div>
        )}
        {effectiveActiveSubTab === "loyalty" && (
          <div className="animate-fadeIn"><VoucherManager /></div>
        )}
        {effectiveActiveSubTab === "maintenance-contract" && (
          <div className="animate-fadeIn"><MaintenanceContractManager /></div>
        )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

