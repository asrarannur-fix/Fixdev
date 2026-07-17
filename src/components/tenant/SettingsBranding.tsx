import * as React from "react";
import { useToast } from "../ui/Toast";
import { Building2, Sliders, Receipt, Lock, Zap, FileText, ChevronRight, HelpCircle, Save, PlusCircle, CheckCircle2, Trash2, Copy, AlertTriangle, Monitor, ExternalLink, Brush, Ticket, X, Paintbrush, Wrench, Fingerprint, MapPin, Search, Server, Smartphone, Globe, MessageSquare, Shield, Settings, GitBranch, Printer, Code, CreditCard, ArrowRightLeft, Play, Pencil, Check, Barcode, ShieldCheck, Eye, CheckSquare, Plus, Sparkles, RefreshCw, Send, Database, FileSpreadsheet, Gift, ClipboardCheck } from "lucide-react";
import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from "../../types";
import { BRANDING_PRESETS } from "../../config/BrandingPresets";

export const SettingsBranding: React.FC<any> = (props) => {
  const { activeTenant, branding, brandingPreviewTab, domainVerified, isVerifyingDomain, setBranding, setBrandingPreviewTab, setDomainVerified, showToast, updateTenant, verifyDomain } = props;
  return (
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
  );
};
