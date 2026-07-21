import * as React from "react";
import { CheckCircle2, Globe, RefreshCw, Save, Sparkles } from "lucide-react";
import { Tenant, TenantBranding } from "../../../types";
import { applyTenantBranding } from "../../../utils/branding";

interface BrandingSettingsPanelProps {
  currentTenantId: string;
  tenantObj?: Tenant;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  branding: TenantBranding;
  setBranding: React.Dispatch<React.SetStateAction<TenantBranding>>;
  brandingPreviewTab: string;
  setBrandingPreviewTab: React.Dispatch<React.SetStateAction<string>>;
  domainVerified: boolean;
  setDomainVerified: React.Dispatch<React.SetStateAction<boolean>>;
  isVerifyingDomain: boolean;
  setIsVerifyingDomain: React.Dispatch<React.SetStateAction<boolean>>;
  verifyDomain: (domain: string) => void;
}

export const BrandingSettingsPanel: React.FC<BrandingSettingsPanelProps> = ({
  currentTenantId,
  tenantObj,
  updateTenant,
  showToast,
  branding,
  setBranding,
  brandingPreviewTab,
  setBrandingPreviewTab,
  domainVerified,
  isVerifyingDomain,
  verifyDomain,
}) => {
  const updateBranding = (patch: Partial<TenantBranding>) => {
    setBranding((prev) => {
      const next = { ...prev, ...patch };
      applyTenantBranding(next, tenantObj?.name);
      return next;
    });
  };

  const save = async () => {
    try {
      await updateTenant(currentTenantId, { branding });
      showToast("Branding berhasil disimpan.", "success");
    } catch (error: any) {
      showToast(error.message || "Branding gagal disimpan.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
      <div className="xl:col-span-7 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                Identitas Visual & Skema Warna
              </h4>
              <p className="text-[10px] text-slate-400">Logo, slogan, warna utama, dan font brand.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Warna utama</span>
              <input type="color" value={branding.primaryColor || "#2563eb"} onChange={(e) => updateBranding({ primaryColor: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Warna aksen</span>
              <input type="color" value={branding.secondaryColor || "#0ea5e9"} onChange={(e) => updateBranding({ secondaryColor: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">URL Logo</span>
            <input value={branding.logoUrl || ""} onChange={(e) => updateBranding({ logoUrl: e.target.value })} placeholder="https://domain/logo.png" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Slogan</span>
            <input value={branding.slogan || ""} onChange={(e) => updateBranding({ slogan: e.target.value })} placeholder="Slogan bisnis" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Font</span>
            <select value={branding.fontFamily || "inter"} onChange={(e) => updateBranding({ fontFamily: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-accent">
              <option value="inter">Inter</option>
              <option value="grotesk">Space Grotesk</option>
              <option value="serif">Playfair Display</option>
              <option value="outfit">Outfit</option>
            </select>
          </label>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent-lighter text-accent rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Customer Portal & Domain</h4>
              <p className="text-[10px] text-slate-400">Kustomisasi portal pelanggan dan custom domain.</p>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Judul bantuan portal</span>
            <input value={branding.portalHelpTitle || ""} onChange={(e) => updateBranding({ portalHelpTitle: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Kontak bantuan portal</span>
            <textarea value={branding.portalContactText || ""} onChange={(e) => updateBranding({ portalContactText: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-accent" />
          </label>



          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={!!branding.whiteLabelEnabled} onChange={(e) => updateBranding({ whiteLabelEnabled: e.target.checked })} className="accent-accent" />
            Aktifkan white-label branding
          </label>
        </div>

        <button type="button" onClick={save} className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold">
          <Save className="w-4 h-4" /> Simpan Branding
        </button>
      </div>

      <div className="xl:col-span-5 space-y-4">
        <div className="bg-slate-950 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Live Preview</span>
            <div className="flex gap-1">
              {["login", "portal", "invoice"].map((tab) => (
                <button key={tab} type="button" onClick={() => setBrandingPreviewTab(tab)} className={`px-2 py-1 rounded text-[10px] font-bold ${brandingPreviewTab === tab ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white text-slate-900 p-5" style={{ fontFamily: branding.fontFamily === "serif" ? "serif" : "sans-serif" }}>
            {branding.logoUrl ? <img src={branding.logoUrl} alt="Logo" className="h-10 mb-4 object-contain" /> : <div className="h-10 w-10 rounded-xl mb-4" style={{ backgroundColor: branding.primaryColor || "#2563eb" }} />}
            <h3 className="font-black text-lg">{tenantObj?.name || "Nama Bisnis"}</h3>
            <p className="text-xs text-slate-500 mt-1">{branding.slogan || "Slogan bisnis tampil di sini"}</p>
            <div className="mt-4 rounded-lg p-3 text-xs text-white" style={{ backgroundColor: branding.primaryColor || "#2563eb" }}>
              {brandingPreviewTab === "portal" ? branding.portalHelpTitle || "Portal Pelanggan" : brandingPreviewTab === "invoice" ? "Invoice / Nota" : "Login Brand"}
            </div>
            <p className="mt-3 text-[10px] text-slate-400">{branding.customDomain || "portal.domain.com"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
