/**
 * App Settings Panel
 * Covers: General, Customer Portal, Email/Push, File Upload, Tampilan & Tema
 * All settings persist via updateTenant -> syncToApi (PostgreSQL)
 */
import React, { useState } from "react";
import { Settings, Globe, Mail, Upload, Palette, Save, RefreshCw, Shield } from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { applyTenantBranding } from "../../utils/branding";

type AppSectionKey = "general" | "portal" | "email" | "file" | "theme";

interface Props {
  currentTenantId: string;
  tenantObj: any;
  updateTenant: (id: string, updates: any) => void;
}

export const AppSettingsPanel: React.FC<Props> = ({ currentTenantId, tenantObj, updateTenant }) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const s = tenantObj?.settings || {};
  const [activeSection, setActiveSection] = useState<AppSectionKey>("general");

  // General
  const [appName, setAppName] = useState(s.generalSettings?.appName || tenantObj?.name || "FIXDEV ERP");
  const [timezone, setTimezone] = useState(s.generalSettings?.timezone || "Asia/Jakarta");
  const [dateFormat, setDateFormat] = useState(s.generalSettings?.dateFormat || "DD/MM/YYYY");
  const [language, setLanguage] = useState(s.generalSettings?.language || "id");
  const [maintenanceMode, setMaintenanceMode] = useState(s.generalSettings?.maintenanceMode ?? false);

  // Customer Portal
  const [enableStatusCheck, setEnableStatusCheck] = useState(s.customerPortalSettings?.enableStatusCheck ?? true);
  const [enableEstApprove, setEnableEstApprove] = useState(s.customerPortalSettings?.enableEstimateApproval ?? true);
  const [enableInvoiceView, setEnableInvoiceView] = useState(s.customerPortalSettings?.enableInvoiceView ?? true);
  const [enableWarrantyView, setEnableWarrantyView] = useState(s.customerPortalSettings?.enableWarrantyView ?? true);
  const [enableTicketTracking, setEnableTicketTracking] = useState(s.customerPortalSettings?.enableTicketTracking ?? true);
  const [hideInternalNotes, setHideInternalNotes] = useState(s.customerPortalSettings?.hideInternalNotes ?? true);
  const [hideProfit, setHideProfit] = useState(s.customerPortalSettings?.hideProfit ?? true);

  // Email & Push
  const [smtpHost, setSmtpHost] = useState(s.emailSettings?.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(s.emailSettings?.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(s.emailSettings?.smtpUser || "");
  const [smtpPass, setSmtpPass] = useState(s.emailSettings?.smtpPass || "");
  const [defaultFrom, setDefaultFrom] = useState(s.emailSettings?.defaultFromEmail || "");
  const [enablePush, setEnablePush] = useState(s.emailSettings?.enablePushNotifications ?? false);
  const [enableRealtime, setEnableRealtime] = useState(s.emailSettings?.enableRealtimeNotifications ?? true);

  // File Upload
  const [maxUploadMb, setMaxUploadMb] = useState(s.fileUploadSettings?.maxUploadSizeMb ?? 10);
  const [allowedTypes, setAllowedTypes] = useState(s.fileUploadSettings?.allowedFileTypes || ".jpg,.png,.pdf,.doc,.xlsx");
  const [retentionDays, setRetentionDays] = useState(s.fileUploadSettings?.retentionDays ?? 365);
  const [fileVisibility, setFileVisibility] = useState(s.fileUploadSettings?.fileVisibility || "private");

  // Theme
  const [primaryColor, setPrimaryColor] = useState(s.themeSettings?.primaryColor || tenantObj?.branding?.primaryColor || "#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState(s.themeSettings?.secondaryColor || tenantObj?.branding?.secondaryColor || "#10b981");
  const [darkMode, setDarkMode] = useState(s.themeSettings?.darkMode ?? false);
  const [sidebarMode, setSidebarMode] = useState(s.themeSettings?.sidebarMode || "collapsed");
  const [layoutDensity, setLayoutDensity] = useState(s.themeSettings?.layoutDensity || "comfortable");

  const handleSave = async () => {
    if (!updateTenant || !currentTenantId) return;
    const cleanFromEmail = defaultFrom.trim();
    if (cleanFromEmail && !cleanFromEmail.includes("@")) {
      showToast("Format email default from tidak valid.", "error");
      return;
    }
    const colorRegex = /^#[0-9a-fA-F]{3,6}$/;
    const cleanPrimary = primaryColor.trim();
    const cleanSecondary = secondaryColor.trim();
    if (!colorRegex.test(cleanPrimary) || !colorRegex.test(cleanSecondary)) {
      showToast("Format kode warna primer/sekunder harus berupa kode hex valid (cth: #3b82f6).", "error");
      return;
    }
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));
    setIsSaving(true);
    try {
      await updateTenant(currentTenantId, {
        branding: {
          ...tenantObj?.branding,
          primaryColor: cleanPrimary,
          secondaryColor: cleanSecondary,
        },
        settings: {
          ...s,
          generalSettings: { appName: appName.trim() || "FIXDEV ERP", timezone, dateFormat, language, maintenanceMode },
          customerPortalSettings: { enableStatusCheck, enableEstimateApproval: enableEstApprove, enableInvoiceView, enableWarrantyView, enableTicketTracking, hideInternalNotes, hideProfit },
          emailSettings: { smtpHost: smtpHost.trim(), smtpPort: clamp(smtpPort, 1, 65535), smtpUser: smtpUser.trim(), smtpPass, defaultFromEmail: cleanFromEmail, enablePushNotifications: enablePush, enableRealtimeNotifications: enableRealtime },
          fileUploadSettings: { maxUploadSizeMb: clamp(maxUploadMb, 1, 100), allowedFileTypes: allowedTypes.trim(), retentionDays: clamp(retentionDays, 30, 3650), fileVisibility },
          themeSettings: { primaryColor: cleanPrimary, secondaryColor: cleanSecondary, darkMode, sidebarMode, layoutDensity },
        },
      });
      showToast("Pengaturan aplikasi berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error.message || "Pengaturan aplikasi gagal disimpan.", "error");
    } finally {
      setIsSaving(false);
    };
  };

  const toggle = (val: boolean, setter: (v: boolean) => void) => setter(!val);
  const Toggle = ({ val, onToggle }: { val: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`relative w-10 h-5 rounded-full transition-colors ${val ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${val ? "translate-x-5" : ""}`} />
    </button>
  );
  const Label = ({ text }: { text: string }) => <label className="text-[10px] font-bold text-slate-500 uppercase">{text}</label>;
  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5"><Icon className="w-4 h-4" /> {title}</h4>
      {children}
    </div>
  );

  const sections: Array<{ id: AppSectionKey; label: string; icon: any }> = [
    { id: "general", label: "Umum", icon: Globe },
    { id: "portal", label: "Customer Portal", icon: Shield },
    { id: "email", label: "Email & Push", icon: Mail },
    { id: "file", label: "Storage & Upload", icon: Upload },
    { id: "theme", label: "Tampilan & Tema", icon: Palette },
  ];

  const sectionDefaults = {
    general: {
      appName: tenantObj?.name || "FIXDEV ERP",
      timezone: s.generalSettings?.timezone || "Asia/Jakarta",
      dateFormat: s.generalSettings?.dateFormat || "DD/MM/YYYY",
      language: s.generalSettings?.language || "id",
      maintenanceMode: s.generalSettings?.maintenanceMode ?? false,
    },
    portal: {
      enableStatusCheck: s.customerPortalSettings?.enableStatusCheck ?? true,
      enableEstApprove: s.customerPortalSettings?.enableEstimateApproval ?? true,
      enableInvoiceView: s.customerPortalSettings?.enableInvoiceView ?? true,
      enableWarrantyView: s.customerPortalSettings?.enableWarrantyView ?? true,
      enableTicketTracking: s.customerPortalSettings?.enableTicketTracking ?? true,
      hideInternalNotes: s.customerPortalSettings?.hideInternalNotes ?? true,
      hideProfit: s.customerPortalSettings?.hideProfit ?? true,
    },
    email: {
      smtpHost: s.emailSettings?.smtpHost || "",
      smtpPort: s.emailSettings?.smtpPort || 587,
      smtpUser: s.emailSettings?.smtpUser || "",
      smtpPass: s.emailSettings?.smtpPass || "",
      defaultFrom: s.emailSettings?.defaultFromEmail || "",
      enablePush: s.emailSettings?.enablePushNotifications ?? false,
      enableRealtime: s.emailSettings?.enableRealtimeNotifications ?? true,
    },
    file: {
      maxUploadMb: s.fileUploadSettings?.maxUploadSizeMb ?? 10,
      allowedTypes: s.fileUploadSettings?.allowedFileTypes || ".jpg,.png,.pdf,.doc,.xlsx",
      retentionDays: s.fileUploadSettings?.retentionDays ?? 365,
      fileVisibility: s.fileUploadSettings?.fileVisibility || "private",
    },
    theme: {
      primaryColor: s.themeSettings?.primaryColor || tenantObj?.branding?.primaryColor || "#3b82f6",
      secondaryColor: s.themeSettings?.secondaryColor || tenantObj?.branding?.secondaryColor || "#10b981",
      darkMode: s.themeSettings?.darkMode ?? false,
      sidebarMode: s.themeSettings?.sidebarMode || "collapsed",
      layoutDensity: s.themeSettings?.layoutDensity || "comfortable",
    },
  };

  const handleResetSection = (section: AppSectionKey) => {
    const defaults = sectionDefaults[section] as any;
    if (!defaults) return;
    switch (section) {
      case "general":
        setAppName(defaults.appName);
        setTimezone(defaults.timezone);
        setDateFormat(defaults.dateFormat);
        setLanguage(defaults.language);
        setMaintenanceMode(defaults.maintenanceMode);
        break;
      case "portal":
        setEnableStatusCheck(defaults.enableStatusCheck);
        setEnableEstApprove(defaults.enableEstApprove);
        setEnableInvoiceView(defaults.enableInvoiceView);
        setEnableWarrantyView(defaults.enableWarrantyView);
        setEnableTicketTracking(defaults.enableTicketTracking);
        setHideInternalNotes(defaults.hideInternalNotes);
        setHideProfit(defaults.hideProfit);
        break;
      case "email":
        setSmtpHost(defaults.smtpHost);
        setSmtpPort(defaults.smtpPort);
        setSmtpUser(defaults.smtpUser);
        setSmtpPass(defaults.smtpPass);
        setDefaultFrom(defaults.defaultFrom);
        setEnablePush(defaults.enablePush);
        setEnableRealtime(defaults.enableRealtime);
        break;
      case "file":
        setMaxUploadMb(defaults.maxUploadMb);
        setAllowedTypes(defaults.allowedTypes);
        setRetentionDays(defaults.retentionDays);
        setFileVisibility(defaults.fileVisibility);
        break;
      case "theme":
        setPrimaryColor(defaults.primaryColor);
        setSecondaryColor(defaults.secondaryColor);
        setDarkMode(defaults.darkMode);
        setSidebarMode(defaults.sidebarMode);
        setLayoutDensity(defaults.layoutDensity);
        break;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "general": return (
        <div className="space-y-4">
          <Section title="Pengaturan Umum" icon={Settings}>
            <div className="space-y-1"><Label text="Nama Aplikasi" />
              <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label text="Zona Waktu" />
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent bg-white">
                  <option value="Asia/Jakarta">WIB (GMT+7)</option>
                  <option value="Asia/Makassar">WITA (GMT+8)</option>
                  <option value="Asia/Jayapura">WIT (GMT+9)</option>
                </select>
              </div>
              <div className="space-y-1"><Label text="Format Tanggal" />
                <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent bg-white">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label text="Bahasa UI" />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent bg-white">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Mode Maintenance</span>
              <Toggle val={maintenanceMode} onToggle={() => toggle(maintenanceMode, setMaintenanceMode)} />
            </div>
          </Section>
        </div>
      );
      case "portal": return (
        <Section title="Customer Portal" icon={Shield}>
          <p className="text-[10px] text-slate-500">Atur fitur yang tersedia untuk pelanggan di Customer Portal.</p>
          {[
            ["Cek Status Tiket", enableStatusCheck, setEnableStatusCheck],
            ["Approve Estimasi", enableEstApprove, setEnableEstApprove],
            ["Lihat Invoice", enableInvoiceView, setEnableInvoiceView],
            ["Lihat Garansi", enableWarrantyView, setEnableWarrantyView],
            ["Tracking Nomor Tiket", enableTicketTracking, setEnableTicketTracking],
            ["Sembunyikan Catatan Internal", hideInternalNotes, setHideInternalNotes],
            ["Sembunyikan HPP / Profit", hideProfit, setHideProfit],
          ].map(([label, val, setter]: any) => (
            <div key={label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-600 uppercase">{label}</span>
              <Toggle val={val} onToggle={() => toggle(val, setter)} />
            </div>
          ))}
        </Section>
      );
      case "email": return (
        <Section title="Email & Push Notification" icon={Mail}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label text="SMTP Host" />
              <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1"><Label text="SMTP Port" />
              <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1"><Label text="SMTP User" />
              <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1"><Label text="SMTP Password" />
              <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
              <p className="text-[9px] text-slate-400">Password disembunyikan demi keamanan.</p>
            </div>
          </div>
          <div className="space-y-1"><Label text="Default From Email" />
            <input type="email" value={defaultFrom} onChange={(e) => setDefaultFrom(e.target.value)} placeholder="noreply@fixdev.com" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Push Notification Aktif</span><Toggle val={enablePush} onToggle={() => toggle(enablePush, setEnablePush)} /></div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Realtime Notification</span><Toggle val={enableRealtime} onToggle={() => toggle(enableRealtime, setEnableRealtime)} /></div>
        </Section>
      );
      case "file": return (
        <Section title="Storage & File Upload" icon={Upload}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label text="Ukuran Upload Maks (MB)" />
              <input type="number" min={1} max={100} value={maxUploadMb} onChange={(e) => setMaxUploadMb(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
            <div className="space-y-1"><Label text="Retensi File (Hari)" />
              <input type="number" min={30} max={3650} value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div className="space-y-1"><Label text="File Types yang Diizinkan" />
            <input type="text" value={allowedTypes} onChange={(e) => setAllowedTypes(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent" />
            <p className="text-[9px] text-slate-400">Pisahkan dengan koma. Contoh: .jpg,.png,.pdf,.xlsx</p>
          </div>
          <div className="space-y-1"><Label text="Visibilitas File" />
            <select value={fileVisibility} onChange={(e) => setFileVisibility(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-accent bg-white">
              <option value="private">Private (Hanya Akses Authorized)</option>
              <option value="public">Public (Bisa Diakses Semua)</option>
            </select>
          </div>
        </Section>
      );
      case "theme": return (
        <Section title="Tampilan & Tema" icon={Palette}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label text="Warna Primer" />
              <div className="flex gap-2"><input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); applyTenantBranding({ primaryColor: e.target.value, secondaryColor }, tenantObj?.name); }} className="w-10 h-10 rounded-lg cursor-pointer" />
              <input type="text" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); applyTenantBranding({ primaryColor: e.target.value, secondaryColor }, tenantObj?.name); }} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg" /></div>
            </div>
            <div className="space-y-1"><Label text="Warna Sekunder" />
              <div className="flex gap-2"><input type="color" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); applyTenantBranding({ primaryColor, secondaryColor: e.target.value }, tenantObj?.name); }} className="w-10 h-10 rounded-lg cursor-pointer" />
              <input type="text" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); applyTenantBranding({ primaryColor, secondaryColor: e.target.value }, tenantObj?.name); }} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg" /></div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-600 uppercase">Dark Mode</span><Toggle val={darkMode} onToggle={() => toggle(darkMode, setDarkMode)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label text="Sidebar Mode" />
              <select value={sidebarMode} onChange={(e) => setSidebarMode(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
                <option value="collapsed">Collapsed (Icon Only)</option>
                <option value="expanded">Expanded (Full Width)</option>
              </select>
            </div>
            <div className="space-y-1"><Label text="Layout Density" />
              <select value={layoutDensity} onChange={(e) => setLayoutDensity(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
          </div>
        </Section>
      );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" /> Pengaturan Aplikasi & Tampilan
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Umum, Customer Portal, Email, Storage, dan Tema tampilan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleResetSection(activeSection)}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Reset Bagian Ini
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Semua"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <aside className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-bold">Bagian Pengaturan</p>
            <p className="text-[11px] text-slate-500">Pilih area yang ingin diubah, lalu simpan atau reset bagian ini.</p>
          </div>
          <div className="space-y-2">
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all border ${
                    activeSection === sec.id
                      ? "border-accent/50 bg-indigo-500/10 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{sections.find((item) => item.id === activeSection)?.label}</h4>
              <p className="text-[10px] text-slate-500 mt-1">{sections.find((item) => item.id === activeSection)?.label} tersedia dalam mode konfigurasi cepat.</p>
            </div>
            <button
              onClick={() => handleResetSection(activeSection)}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              Reset Bagian Ini
            </button>
          </div>
          {renderContent()}
        </section>
      </div>
    </div>
  );
};
