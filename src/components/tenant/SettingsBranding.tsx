import * as React from "react";
import { useToast } from "../ui/Toast";
import { Building2, Sliders, Receipt, Lock, Zap, FileText, ChevronRight, HelpCircle, Save, PlusCircle, CheckCircle2, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Brush, Ticket, X, Paintbrush, Wrench, Fingerprint, MapPin, Search, Server, Smartphone, Globe, MessageSquare, Shield, Settings, GitBranch, Printer, Code, CreditCard, ArrowRightLeft, Play, Pencil, Check, Barcode, ShieldCheck, Eye, CheckSquare, Plus, Sparkles, RefreshCw, Send, Database, FileSpreadsheet, Gift, ClipboardCheck, Download, Upload, RotateCcw, Moon, Sun, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from "../../types";
import { BRANDING_PRESETS } from "../../config/BrandingPresets";
import { applyTenantBranding } from "../../utils/branding";
import BrandingHistory, { logBrandingChange } from "./BrandingHistory";

export const SettingsBranding: React.FC<any> = (props) => {
  const { activeTenant, branding, brandingPreviewTab, domainVerified, isVerifyingDomain, setBranding, setBrandingPreviewTab, setDomainVerified, showToast, updateTenant, verifyDomain } = props;

  const [darkModePreview, setDarkModePreview] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [presetsOpen, setPresetsOpen] = React.useState(true);
  const importRef = React.useRef<HTMLInputElement>(null);

  const applyPreset = (presetKey: string) => {
    const preset = BRANDING_PRESETS[presetKey];
    if (!preset) return;
    const next = { ...branding, primaryColor: preset.primaryColor, secondaryColor: preset.secondaryColor, fontFamily: preset.fontFamily };
    setBranding(next);
    applyTenantBranding(next, activeTenant?.name);
  };

  const resetToDefault = () => {
    const def = BRANDING_PRESETS.indigo;
    const next = { ...branding, primaryColor: def.primaryColor, secondaryColor: def.secondaryColor, fontFamily: def.fontFamily };
    setBranding(next);
    applyTenantBranding(next, activeTenant?.name);
    showToast("Branding direset ke default (Indigo)", "info");
  };

  const exportBranding = () => {
    const data = { version: "1.0", exportedAt: new Date().toISOString(), branding };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branding-${activeTenant?.name || "tenant"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Branding exported", "success");
  };

  const importBranding = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.branding?.primaryColor) {
          const next = { ...branding, ...json.branding };
          setBranding(next);
          applyTenantBranding(next, activeTenant?.name);
          showToast("Branding imported", "success");
        } else {
          showToast("Format JSON tidak valid", "error");
        }
      } catch {
        showToast("Gagal parse JSON", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
      showToast("Logo harus PNG, JPEG, atau WebP maksimal 1 MB", "error");
      return;
    }
    showToast("Unggah logo ke storage tenant, lalu masukkan URL HTTPS hasil unggahan.", "error");
  };
   return (
     <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_.hover\:bg-slate-50:hover]:bg-zinc-900">
    {/* LEFT COLUMN: Config Panels */}
    <div className="xl:col-span-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Identitas Visual & Skema Warna
            </h4>
            <p className="text-[10px] text-slate-400">Logo, slogan, warna utama, dan font brand.</p>
          </div>
        </div>

        <div>
          <button onClick={() => setPresetsOpen(!presetsOpen)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-accent transition-colors w-full">
            <Paintbrush className="w-3.5 h-3.5" />
            Color Palette Presets
            {presetsOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {presetsOpen && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
              {Object.entries(BRANDING_PRESETS).map(([key, preset]) => (
                <button key={key} onClick={() => applyPreset(key)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${branding.primaryColor === preset.primaryColor ? "border-accent bg-accent-lighter/30" : "border-slate-200 hover:border-slate-300"}`} title={preset.description}>
                  <div className="w-8 h-8 rounded-full shadow-inner border border-white/50" style={{ backgroundColor: preset.primaryColor }} />
                  <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">{preset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Warna utama</span>
            <div className="flex gap-2">
              <input type="color" value={branding.primaryColor || "#4f46e5"} onChange={(e) => {
                const next = { ...branding, primaryColor: e.target.value };
                setBranding(next);
                applyTenantBranding(next, activeTenant?.name);
              }} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
              <input type="text" value={branding.primaryColor || "#4f46e5"} onChange={(e) => {
                const next = { ...branding, primaryColor: e.target.value };
                setBranding(next);
                applyTenantBranding(next, activeTenant?.name);
              }} className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg" />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Warna aksen</span>
            <div className="flex gap-2">
              <input type="color" value={branding.secondaryColor || "#0ea5e9"} onChange={(e) => {
                const next = { ...branding, secondaryColor: e.target.value };
                setBranding(next);
                applyTenantBranding(next, activeTenant?.name);
              }} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
              <input type="text" value={branding.secondaryColor || "#0ea5e9"} onChange={(e) => {
                const next = { ...branding, secondaryColor: e.target.value };
                setBranding(next);
                applyTenantBranding(next, activeTenant?.name);
              }} className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg" />
            </div>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">URL Logo</span>
          <div className="flex gap-2">
            <input value={branding.logoUrl || ""} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://domain/logo.png" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
            <button onClick={() => importRef.current?.click()} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors flex items-center gap-1" title="Upload gambar">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <input ref={importRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
          </div>
          {branding.logoUrl && <img src={branding.logoUrl} alt="Logo preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Slogan</span>
          <input value={branding.slogan || ""} onChange={(e) => setBranding({ ...branding, slogan: e.target.value })} placeholder="Slogan bisnis" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Font</span>
          <select value={branding.fontFamily || "inter"} onChange={(e) => {
            const next = { ...branding, fontFamily: e.target.value };
            setBranding(next);
            applyTenantBranding(next, activeTenant?.name);
          }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-accent">
            <option value="inter">Inter</option>
            <option value="grotesk">Space Grotesk</option>
            <option value="serif">Playfair Display</option>
            <option value="outfit">Outfit</option>
          </select>
          <p className="text-[10px] text-slate-500 italic" style={{ fontFamily: branding.fontFamily === "grotesk" ? "Space Grotesk" : branding.fontFamily === "serif" ? "Playfair Display" : branding.fontFamily === "outfit" ? "Outfit" : "Inter" }}>
            Contoh: Teknisi Nama Toko
          </p>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={!!branding.whiteLabelEnabled} onChange={(e) => setBranding({ ...branding, whiteLabelEnabled: e.target.checked })} className="accent-accent" />
          Aktifkan white-label branding
        </label>
      </div>

      {/* 4. Portal Branding & Custom Domain */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
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
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={resetToDefault} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5" title="Reset ke default indigo">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={exportBranding} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5" title="Export branding JSON">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <button onClick={() => importRef.current?.click()} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5" title="Import branding JSON">
          <Upload className="w-3.5 h-3.5" /> Import
        </button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBranding(f); e.target.value = ""; }} />
        <button
          onClick={async () => {
            if (!activeTenant) return;
            try {
              await updateTenant(activeTenant.id, { branding });
              applyTenantBranding(branding, activeTenant.name);
              logBrandingChange(activeTenant.id, branding, "admin");
              showToast("Branding berhasil disimpan!", "success");
            } catch (error: any) {
              showToast(error?.message || "Gagal menyimpan.", "error");
            }
          }}
          className="bg-accent hover:bg-accent-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
        >
          <CheckSquare className="w-4 h-4" />
          Simpan Branding
        </button>
      </div>

      {/* Branding History */}
      {activeTenant && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => setHistoryOpen(!historyOpen)} className="w-full flex items-center gap-2 px-5 py-3 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50 transition-colors">
            <Clock className="w-3.5 h-3.5" />
            Riwayat Perubahan
            {historyOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {historyOpen && (
            <div className="border-t border-slate-100 p-4">
              <BrandingHistory tenantId={activeTenant.id} currentBranding={branding} onRestore={(b) => { setBranding(b); applyTenantBranding(b, activeTenant.name); showToast("Branding dipulihkan", "info"); }} />
            </div>
          )}
        </div>
      )}
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
            <button onClick={() => setDarkModePreview(!darkModePreview)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${darkModePreview ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`} title="Toggle dark mode preview">
              {darkModePreview ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {darkModePreview ? "Gelap" : "Terang"}
            </button>
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
                      ? "bg-accent text-white"
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
          className="bg-slate-900 rounded-xl border border-slate-800 p-6 min-h-[340px] flex items-center justify-center"
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
                {domainVerified ? "Domain Terverifikasi: " : "Domain Belum Terverifikasi: "}
                <span className={`font-mono font-bold underline ${domainVerified ? "text-emerald-600" : "text-amber-600"}`}>
                  {branding.customDomain || "Belum diatur"}
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

              <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-200">
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
                  {activeTenant?.address || "Alamat bisnis belum diatur"}
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
  );
};
