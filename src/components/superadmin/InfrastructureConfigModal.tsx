import React from "react";
import { createPortal } from "react-dom";
import { Server, X, Globe } from "lucide-react";
import { Tenant, SubscriptionTier, TenantStatus } from "../../types";

interface InfrastructureConfigModalProps {
  tenant: Tenant;
  selectedTenantForConfig: string | null;
  setSelectedTenantForConfig: (id: string | null) => void;
  configSubdomain: string;
  setConfigSubdomain: (v: string) => void;
  configCustomDomain: string;
  setConfigCustomDomain: (v: string) => void;
  configStorageMode: string;
  setConfigStorageMode: (v: string) => void;
  configBucketName: string;
  setConfigBucketName: (v: string) => void;
  configStorageLimitMb: number;
  setConfigStorageLimitMb: (v: number) => void;
  configUserLimit: number;
  setConfigUserLimit: (v: number) => void;
  configBranchLimit: number;
  setConfigBranchLimit: (v: number) => void;
  configFeatures: string[];
  setConfigFeatures: (v: string[]) => void;
  configName: string;
  setConfigName: (v: string) => void;
  configTier: SubscriptionTier;
  setConfigTier: (v: SubscriptionTier) => void;
  configStatus: TenantStatus;
  setConfigStatus: (v: TenantStatus) => void;
  updateTenant: (id: string, updates: any) => void;
  showToast: (msg: string, type: "success" | "error") => void;
  readOnlyMode?: boolean;
}

export const InfrastructureConfigModal: React.FC<
  InfrastructureConfigModalProps
> = ({
  tenant,
  selectedTenantForConfig,
  setSelectedTenantForConfig,
  configSubdomain,
  setConfigSubdomain,
  configCustomDomain,
  setConfigCustomDomain,
  configStorageMode,
  setConfigStorageMode,
  configBucketName,
  setConfigBucketName,
  configStorageLimitMb,
  setConfigStorageLimitMb,
  configUserLimit,
  setConfigUserLimit,
  configBranchLimit,
  setConfigBranchLimit,
  configFeatures,
  setConfigFeatures,
  configName,
  setConfigName,
  configTier,
  setConfigTier,
  configStatus,
  setConfigStatus,
  updateTenant,
  showToast,
  readOnlyMode = false,
}) => {
  if (!selectedTenantForConfig) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" /> Konfigurasi
              Infrastruktur Tenant
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Mengonfigurasi identitas tenant, custom domain, dan storage cloud
              untuk{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {tenant.name}
              </strong>
            </p>
          </div>
          <button
            onClick={() => setSelectedTenantForConfig(null)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* 0. Detail Profil & Paket */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase text-blue-700 dark:text-blue-400 tracking-wider font-mono">
              0. Identitas & Lisensi Paket
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                Nama Tenant / Toko
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none text-xs focus:border-accent font-bold"
                placeholder="Nama Perusahaan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Paket Langganan
                </label>
                <select
                  value={configTier}
                  onChange={(e) => {
                    const nextTier = e.target.value as SubscriptionTier;
                    setConfigTier(nextTier);
                    // Proactively suggest to adjust default limits matching the selected tier specs
                    const usersLimit =
                      nextTier === SubscriptionTier.ENTERPRISE
                        ? 100
                        : nextTier === SubscriptionTier.PRO
                          ? 15
                          : 5;
                    const branchesLimit =
                      nextTier === SubscriptionTier.ENTERPRISE
                        ? 20
                        : nextTier === SubscriptionTier.PRO
                          ? 5
                          : 1;
                    const storageLimit =
                      nextTier === SubscriptionTier.ENTERPRISE
                        ? 10240
                        : nextTier === SubscriptionTier.PRO
                          ? 2048
                          : 512;
                    setConfigUserLimit(usersLimit);
                    setConfigBranchLimit(branchesLimit);
                    setConfigStorageLimitMb(storageLimit);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-800 dark:text-white outline-none text-xs cursor-pointer font-bold"
                >
                  <option value={SubscriptionTier.BASIC}>BASIC</option>
                  <option value={SubscriptionTier.PRO}>PRO</option>
                  <option value={SubscriptionTier.ENTERPRISE}>
                    ENTERPRISE
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Status Tenant
                </label>
                <select
                  value={configStatus}
                  onChange={(e) =>
                    setConfigStatus(e.target.value as TenantStatus)
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-800 dark:text-white outline-none text-xs cursor-pointer font-bold"
                >
                  <option value={TenantStatus.TRIAL}>TRIAL</option>
                  <option value={TenantStatus.ACTIVE}>ACTIVE</option>
                  <option value={TenantStatus.SUSPENDED}>SUSPENDED</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800" />

          {/* 1. Subdomain & Custom Domain Group */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase text-blue-700 dark:text-blue-400 tracking-wider font-mono">
              1. Domain & Jaringan
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                Kode Identitas Tenant (Slug / ID)
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={configSubdomain}
                  onChange={(e) => setConfigSubdomain(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none font-mono text-xs focus:border-accent"
                  placeholder="slug-identitas"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                Custom Domain (CNAME SSL/TLS)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={configCustomDomain}
                    onChange={(e) => setConfigCustomDomain(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none text-xs focus:border-accent font-mono"
                    placeholder="cth: repair.tokosaya.id"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800" />

          {/* 2. Cloud Storage Provider Configuration */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase text-blue-700 dark:text-blue-400 tracking-wider font-mono">
              2. Penyimpanan Objek (Cloud Storage)
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                Pilih Provider Penyimpanan
              </label>
              <select
                value={configStorageMode}
                onChange={(e) => setConfigStorageMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-xs bg-slate-50/50 dark:bg-zinc-950 text-slate-700 dark:text-slate-350 cursor-pointer font-medium"
              >
                <option value="SYSTEM">
                  System Managed Storage (Bawaan Platform SaaS)
                </option>
                <option value="S3" disabled>Amazon S3 — belum tersedia</option>
                <option value="R2" disabled>Cloudflare R2 — belum tersedia</option>
                <option value="GCS" disabled>Google Cloud Storage — belum tersedia</option>
              </select>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
              Credential cloud kustom belum didukung dan sengaja tidak dapat diedit agar tidak memberi kesan konfigurasi tersimpan. Bukti pembayaran menggunakan bucket privat yang dikelola platform; credential service tidak pernah dikirim ke browser.
            </div>

            {configStorageMode !== "SYSTEM" && (
              <div className="space-y-2.5 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={configBucketName}
                    onChange={(e) => setConfigBucketName(e.target.value)}
                    disabled
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-400 rounded-lg outline-none font-mono"
                    placeholder="bucket-media-tenant"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Access Key ID
                    </label>
                    <input
                      type="text"
                      placeholder="AKIAIOSF..."
                      disabled
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-400 rounded-lg outline-none font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Secret Access Key
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      disabled
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-400 rounded-lg outline-none font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                Kapasitas Maksimal Storage (MB)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={configStorageLimitMb}
                  onChange={(e) =>
                    setConfigStorageLimitMb(parseInt(e.target.value) || 0)
                  }
                  className="flex-1 px-3 py-2 border border-r-0 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-l-xl outline-none text-xs focus:border-accent font-mono"
                />
                <span className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-slate-400 rounded-r-xl font-mono text-xs">
                  MB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {configStorageLimitMb >= 1024
                  ? `Setara dengan ${(configStorageLimitMb / 1024).toFixed(1)} GB`
                  : `${configStorageLimitMb} Megabytes`}{" "}
                alokasi kuota penyimpanan tenant.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Kuota Maksimal Staff/User
                </label>
                <input
                  type="number"
                  value={configUserLimit}
                  onChange={(e) =>
                    setConfigUserLimit(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none text-xs focus:border-accent font-mono"
                  min="1"
                />
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Jumlah maksimum akun staff terdaftar.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Kuota Maksimal Cabang/Outlet
                </label>
                <input
                  type="number"
                  value={configBranchLimit}
                  onChange={(e) =>
                    setConfigBranchLimit(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-white rounded-xl outline-none text-xs focus:border-accent font-mono"
                  min="1"
                />
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Jumlah outlet fisik terisolasi.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800" />

          {/* 3. Feature Activation Management */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase text-blue-700 dark:text-blue-400 tracking-wider font-mono">
              3. Manajemen Fitur & Modul Aktif
            </h4>
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl p-3.5 space-y-3">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                Pilih fitur/modul yang boleh diakses oleh tenant ini. Modul yang
                tidak dicentang akan otomatis terkunci dengan dialog upgrade di
                panel tenant.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "SERVICE",
                    label: "Servis",
                    desc: "Penerimaan unit, skema, penawaran, dll",
                  },
                  {
                    id: "POS",
                    label: "POS",
                    desc: "Terminal kasir, kartu stok, kanibal",
                  },
                  {
                    id: "ACCOUNTING",
                    label: "Keuangan",
                    desc: "Daftar COA, jurnal umum, laba rugi",
                  },
                  {
                    id: "HRM",
                    label: "HR",
                    desc: "Presensi, payroll, komisi teknisi, kasbon",
                  },
                  {
                    id: "CRM",
                    label: "CRM",
                    desc: "Pipeline B2B, database pelanggan",
                  },
                  {
                    id: "SECURITY",
                    label: "Keamanan",
                    desc: "Audit log aktivitas, proteksi AI fraud",
                  },
                  {
                    id: "RENTAL",
                    label: "Penyewaan Perangkat",
                    desc: "Sewa unit HP/tablet pengganti ke user",
                  },
                  {
                    id: "MARKETPLACE",
                    label: "Integrasi Marketplace",
                    desc: "Stok otomatis Tokopedia & Shopee",
                  },
                  {
                    id: "WHATSAPP",
                    label: "Konektor WhatsApp",
                    desc: "Kirim update status otomatis & broadcast",
                  },
                  {
                    id: "TELEGRAM",
                    label: "Integrasi Telegram",
                    desc: "Kirim alert/notifikasi ke grup Telegram",
                  },
                ].map((feature) => {
                  const isChecked = configFeatures.includes(feature.id);
                  return (
                    <label
                      key={feature.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-blue-50/40 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40"
                          : "bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-850"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfigFeatures([...configFeatures, feature.id]);
                          } else {
                            setConfigFeatures(
                              configFeatures.filter((f) => f !== feature.id),
                            );
                          }
                        }}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-zinc-700"
                      />
                      <div>
                        <span className="block font-bold text-[11px] text-slate-800 dark:text-zinc-200">
                          {feature.label}
                        </span>
                        <span className="block text-[9px] text-slate-500 dark:text-zinc-500 mt-0.5 leading-tight">
                          {feature.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-zinc-950/50">
          <button
            onClick={() => setSelectedTenantForConfig(null)}
            className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer text-slate-700 dark:text-zinc-300"
          >
            Batal
          </button>
          <button
            onClick={() => {
              const cleanName = configName.trim();
              const cleanSubdomain = configSubdomain
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
              const cleanCustomDomain = configCustomDomain.trim().toLowerCase();

              if (!cleanName || !cleanSubdomain) {
                showToast("Nama tenant dan subdomain tidak boleh kosong.", "error");
                return;
              }

              const safeStorage = Math.max(1, Math.floor(configStorageLimitMb) || 1);
              const safeUsers = Math.max(1, Math.floor(configUserLimit) || 1);
              const safeBranches = Math.max(1, Math.floor(configBranchLimit) || 1);

              updateTenant(selectedTenantForConfig, {
                name: cleanName,
                tier: configTier,
                status: configStatus,
                subdomain: cleanSubdomain,
                limits: {
                  ...tenant.limits,
                  storageMb: safeStorage,
                  users: safeUsers,
                  branches: safeBranches,
                  features: configFeatures,
                },
                branding: {
                  ...tenant.branding,

                },
                settings: {
                  ...tenant.settings,
                  storageSettings: {
                    mode: configStorageMode,
                    bucketName: configBucketName.trim(),
                  },
                } as any,
              });
              showToast(
                "Konfigurasi infrastruktur tenant berhasil disimpan!",
                "success",
              );
              setSelectedTenantForConfig(null);
            }}
            disabled={readOnlyMode}
            className={`px-4 py-2 rounded-xl font-bold shadow-md transition-all cursor-pointer ${
              readOnlyMode
                ? "bg-slate-300 dark:bg-zinc-700 text-slate-500 dark:text-zinc-500 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10"
            }`}
          >
            Simpan Perubahan
          </button>
        </div>
        </div>
      </div>,
      document.body
    );
  };
