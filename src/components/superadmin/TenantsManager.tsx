import React, { useEffect, useState } from "react";
import { Server, HardDrive, Lock, Settings2, Play, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { SubscriptionTier, TenantStatus, Tenant } from "../../types";
import { useToast } from "../ui/Toast";
import { useSaaS } from "../../context/SaaSContext";
import { readJsonResponse } from "../../utils/apiResponse";

interface TenantsManagerProps {
  tenants: Tenant[];
  products: any[];
  services: any[];
  transactions: any[];
  users: any[];
  branches: any[];
  addTenant: (t: any) => any;
  addUser: (u: any) => void;
  updateTenantStatus: (id: string, status: TenantStatus) => void;
  impersonateTenant: (id: string) => void;
  setSelectedTenantForConfig: (id: string) => void;
  setConfigSubdomain: (v: string) => void;
  setConfigCustomDomain: (v: string) => void;
  setConfigStorageMode: (v: string) => void;
  setConfigBucketName: (v: string) => void;
  setConfigStorageLimitMb: (v: number) => void;
  setConfigUserLimit: (v: number) => void;
  setConfigBranchLimit: (v: number) => void;
  setConfigFeatures: (v: string[]) => void;
  setConfigName: (v: string) => void;
  setConfigTier: (v: SubscriptionTier) => void;
  setConfigStatus: (v: TenantStatus) => void;
  showConfirm: (args: any) => Promise<boolean>;
  readOnlyMode?: boolean;
}

export const TenantsManager: React.FC<TenantsManagerProps> = ({
  tenants,
  products,
  services,
  transactions,
  users,
  branches,
  updateTenantStatus,
  impersonateTenant,
  setSelectedTenantForConfig,
  setConfigSubdomain,
  setConfigCustomDomain,
  setConfigStorageMode,
  setConfigBucketName,
  setConfigStorageLimitMb,
  setConfigUserLimit,
  setConfigBranchLimit,
  setConfigFeatures,
  setConfigName,
  setConfigTier,
  setConfigStatus,
  readOnlyMode = false,
}) => {
  const { showToast } = useToast();
  const { apiFetch, refreshData } = useSaaS();
  const [statusDialogTenant, setStatusDialogTenant] = useState<Tenant | null>(null);
  const [statusCategory, setStatusCategory] = useState("BILLING");
  const [statusReason, setStatusReason] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [reactivateAt, setReactivateAt] = useState("");
  const [impersonationTenant, setImpersonationTenant] = useState<Tenant | null>(null);
  const [impersonationReason, setImpersonationReason] = useState("");
  const [impersonationTicket, setImpersonationTicket] = useState("");
  const [impersonationMode, setImpersonationMode] = useState<"READ_ONLY" | "FULL">("READ_ONLY");
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [detailTab, setDetailTab] = useState("summary");
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const manageInvitation = async (action: "revoke" | "resend", invitation?: any) => {
    if (!detailTenant) return;
    try {
      if (action === "revoke" && invitation) {
        await readJsonResponse(await apiFetch(`/api/superadmin/tenants/${detailTenant.id}/invitations/${invitation.id}`, { method: "DELETE" }), "Cabut undangan");
      } else {
        const previous = invitation || detailData?.invitations?.[0];
        if (!previous) throw new Error("Data owner invitation tidak tersedia.");
        if (!previous.revokedAt && !previous.acceptedAt) await readJsonResponse(await apiFetch(`/api/superadmin/tenants/${detailTenant.id}/invitations/${previous.id}`, { method: "DELETE" }), "Cabut undangan lama");
        await readJsonResponse(await apiFetch(`/api/superadmin/tenants/${detailTenant.id}/invitations`, { method: "POST", body: JSON.stringify({ name: previous.name, email: previous.email, expiresInHours: 48 }) }), "Kirim ulang undangan");
      }
      await openTenantDetail(detailTenant);
      showToast(action === "revoke" ? "Undangan dicabut." : "Undangan baru dimasukkan ke antrean delivery.", "success");
    } catch (error: any) { showToast(error.message, "error"); }
  };

  const openTenantDetail = async (tenant: Tenant) => {
    setDetailTenant(tenant);
    setDetailTab("summary");
    setDetailLoading(true);
    try {
      const [detailResponse, invitationResponse] = await Promise.all([
        apiFetch(`/api/superadmin/tenants/${tenant.id}`),
        apiFetch(`/api/superadmin/tenants/${tenant.id}/invitations`),
      ]);
      const detail = await readJsonResponse<any>(detailResponse, "Detail tenant");
      const invitation = await readJsonResponse<any>(invitationResponse, "Undangan tenant");
      setDetailData({ ...detail, invitations: invitation.invitations || [] });
    } catch (error: any) {
      showToast(error.message, "error");
    } finally { setDetailLoading(false); }
  };
  const [newTenantName, setNewTenantName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newTier, setNewTier] = useState<SubscriptionTier>(
    SubscriptionTier.PRO,
  );
  const [registrationStep, setRegistrationStep] = useState(1);
  const [registrationKey, setRegistrationKey] = useState(() => crypto.randomUUID());
  const [availability, setAvailability] = useState<{ subdomainAvailable: boolean | null; emailAvailable: boolean | null } | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TenantStatus | "">("");
  const [filterTier, setFilterTier] = useState<SubscriptionTier | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [serverTenants, setServerTenants] = useState<Tenant[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [tenantListLoading, setTenantListLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setTenantListLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: "createdAt", direction: "desc" });
        if (search.trim()) params.set("search", search.trim());
        if (filterStatus) params.set("status", filterStatus);
        if (filterTier) params.set("tier", filterTier);
        const data = await readJsonResponse<any>(await apiFetch(`/api/superadmin/tenants?${params}`), "Daftar tenant");
        setServerTenants(data.items || []);
        setServerTotal(Number(data.total || 0));
      } catch (error: any) { showToast(error.message, "error"); }
      finally { setTenantListLoading(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, filterStatus, filterTier, page]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / pageSize));
  const visibleTenants = serverTenants;

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterTier("");
    setPage(1);
  };

  const exportTenants = () => {
    const rows = serverTenants.map((tenant) => [tenant.name, tenant.subdomain, tenant.status, tenant.tier]);
    const csv = [["Nama", "Subdomain", "Status", "Paket"], ...rows]
      .map((row) => row.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tenant-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleTenantNameChange = (val: string) => {
    setNewTenantName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // remove special characters
      .replace(/\s+/g, "-") // replace spaces with -
      .replace(/-+/g, "-"); // collapse duplicate dashes
    setNewSubdomain(slug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) {
      showToast("Read-only mode aktif. Registrasi tenant diblokir.", "error");
      return;
    }
    const cleanTenantName = newTenantName.trim();
    const cleanOwnerName = newOwnerName.trim();
    const cleanOwnerEmail = newOwnerEmail.trim().toLowerCase();
    if (!cleanTenantName || !newSubdomain || !cleanOwnerName || !cleanOwnerEmail) {
      showToast(
        "Harap isi semua kolom pendaftaran termasuk data Owner!",
        "error",
      );
      return;
    }
    if (!cleanOwnerEmail.includes("@")) {
      showToast("Format email owner tidak valid.", "error");
      return;
    }

    const cleanSubdomain = newSubdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanSubdomain) {
      showToast("Subdomain tenant tidak valid.", "error");
      return;
    }

    const isSubdomainExists = tenants.some(
      (t) => (t.subdomain || t.id).toLowerCase() === cleanSubdomain,
    );
    if (isSubdomainExists) {
      showToast(
        `Kode Identitas (Slug) "${cleanSubdomain}" sudah digunakan oleh tenant lain! Harap gunakan kode unik.`,
        "error",
      );
      return;
    }

    // 2. Uniqueness check for owner email
    const isEmailExists = users.some(
      (u) => u.email.toLowerCase() === cleanOwnerEmail,
    );
    if (isEmailExists) {
      showToast(
        `Email owner "${cleanOwnerEmail}" sudah terdaftar dalam sistem! Gunakan email lain yang unik.`,
        "error",
      );
      return;
    }

    try {
      const response = await apiFetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "X-SuperAdmin-Mode": readOnlyMode ? "read-only" : "edit" },
        body: JSON.stringify({ name: cleanTenantName, subdomain: cleanSubdomain, ownerName: cleanOwnerName, ownerEmail: cleanOwnerEmail, tier: newTier, idempotencyKey: registrationKey }),
      });
      const result = await readJsonResponse<any>(response, "Registrasi tenant");
      showToast(`Tenant "${cleanTenantName}" dibuat. Undangan owner berlaku sampai ${new Date(result.invitation.expiresAt).toLocaleString("id-ID")}.`, "success");
      setNewTenantName("");
      setNewSubdomain("");
      setNewOwnerName("");
      setNewOwnerEmail("");
      setRegistrationStep(1);
      setAvailability(null);
      setRegistrationKey(crypto.randomUUID());
      await refreshData();
      window.dispatchEvent(new CustomEvent("superadmin-tenant-created", { detail: result.tenant }));
    } catch (err: any) {
      showToast("Gagal mendaftarkan tenant: " + err.message, "error");
    }
  };

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      id="sa-middle-layout"
    >
      {/* Tenants List */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col h-fit overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600" /> Tenant Management
              Console
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Kontrol lisensi, alokasi kapasitas storage, impersonate aman, dan
              suspensi darurat real-time.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            Live Database
          </span>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-900">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tenant, subdomain, domain..."
            className="flex-1 min-w-[160px] text-xs px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 outline-none text-slate-800 dark:text-zinc-200"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TenantStatus | "")}
            className="text-xs px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 outline-none text-slate-700 dark:text-zinc-300 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value={TenantStatus.ACTIVE}>Aktif</option>
            <option value={TenantStatus.TRIAL}>Trial</option>
            <option value={TenantStatus.SUSPENDED}>Suspended</option>
          </select>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as SubscriptionTier | "")}
            className="text-xs px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 outline-none text-slate-700 dark:text-zinc-300 cursor-pointer"
          >
            <option value="">Semua Tier</option>
            <option value={SubscriptionTier.BASIC}>BASIC</option>
            <option value={SubscriptionTier.PRO}>PRO</option>
            <option value={SubscriptionTier.ENTERPRISE}>ENTERPRISE</option>
          </select>
          <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-950">Reset</button>
          <button type="button" onClick={exportTenants} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-zinc-950/50 text-slate-400 dark:text-zinc-500 uppercase text-[10px] font-mono border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3.5">Tenant & Domain</th>
                <th className="px-5 py-3.5">Assigned Plan</th>
                <th className="px-5 py-3.5">Storage Usage</th>
                <th className="px-5 py-3.5">Emergency Suspend Toggle</th>
                <th className="px-5 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {tenantListLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-500">Memuat tenant…</td></tr>
              ) : visibleTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {tenants.length === 0 ? "Belum ada tenant terdaftar." : "Tidak ada tenant yang cocok dengan filter."}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                      {tenants.length === 0 ? "Daftarkan tenant baru dari panel registrasi." : "Ubah kriteria pencarian atau filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                visibleTenants.map((t) => {
                const limit = Number((t as any).usage?.limitMb || t.limits?.storageMb || 1024);
                const used = Number((t as any).usage?.usedMb || 0);
                const pct = Number((t as any).usage?.percent || 0);
                const isOverLimit = pct >= 80;
                const rowUsageSource = (t as any).usage?.source === "actual" ? "aktual" : "estimasi";

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <button type="button" onClick={() => openTenantDetail(t)} className="text-left hover:text-accent hover:underline dark:hover:text-indigo-400">{t.name || "Tenant tanpa nama"}</button>
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                        ID Tenant: {t.subdomain || t.id}
                      </p>
                      {t.branding?.customDomain && (
                        <div className="flex flex-col gap-1 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] bg-accent-lighter dark:bg-indigo-950/30 text-accent dark:text-accent px-1.5 py-0.5 rounded font-mono font-semibold w-max">
                            🔗 {t.branding.customDomain}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[8px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              DNS OK
                            </span>
                            <span className="text-slate-300 dark:text-zinc-800 text-[8px] font-bold">
                              |
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                              🛡️ SSL SECURE
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono uppercase tracking-wider shadow-sm ${
                          t.tier === SubscriptionTier.ENTERPRISE
                            ? "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200/20"
                            : t.tier === SubscriptionTier.PRO
                              ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/20"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-300 border border-slate-200/20"
                        }`}
                      >
                        {t.tier}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                        {t.tier === SubscriptionTier.ENTERPRISE
                          ? "Rp 1.500.000 / bln"
                          : t.tier === SubscriptionTier.PRO
                            ? "Rp 250.000 / bln"
                            : "Rp 100.000 / bln"}
                      </p>
                    </td>

                    <td className="px-5 py-4 w-44">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <HardDrive
                            className={`w-3.5 h-3.5 ${isOverLimit ? "text-amber-500 animate-pulse" : "text-blue-500"}`}
                          />
                          {used >= 1024
                            ? `${(used / 1024).toFixed(1)} GB`
                            : `${used} MB`}
                        </span>
                        <span className="font-mono text-slate-400 dark:text-slate-500">
                          /{" "}
                          {limit >= 1024 ? `${limit / 1024} GB` : `${limit} MB`}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-zinc-950 rounded-full h-2 mt-1.5 overflow-hidden border border-slate-200/50 dark:border-zinc-800/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverLimit
                              ? "bg-gradient-to-r from-amber-500 to-rose-500"
                              : "bg-gradient-to-r from-blue-500 to-sky-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                        {`Kapasitas ${rowUsageSource}: `}
                        <span
                          className={
                            isOverLimit
                              ? "text-rose-600 font-bold"
                              : "text-slate-600 dark:text-slate-300 font-bold"
                          }
                        >
                          {pct}%
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] font-mono" id={`sa-tenant-activity-${t.id}`}>
                        <span className="rounded-lg bg-slate-50 dark:bg-zinc-950 px-2 py-1 text-slate-500 dark:text-zinc-400">TX {(t as any).transactionCount || 0}</span>
                        <span className="rounded-lg bg-slate-50 dark:bg-zinc-950 px-2 py-1 text-slate-500 dark:text-zinc-400">Svc {(t as any).serviceCount || 0}</span>
                        <span className="rounded-lg bg-slate-50 dark:bg-zinc-950 px-2 py-1 text-slate-500 dark:text-zinc-400">User {(t as any).userCount || 0}</span>
                        <span className="rounded-lg bg-slate-50 dark:bg-zinc-950 px-2 py-1 text-slate-500 dark:text-zinc-400">Cab {(t as any).branchCount || 0}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5 justify-center">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={readOnlyMode}
                            onClick={() => {
                              setStatusDialogTenant(t);
                              setStatusReason("");
                              setStatusNote("");
                              setReactivateAt("");
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              t.status === "SUSPENDED"
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                t.status === "SUSPENDED"
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider ${
                              t.status === "SUSPENDED"
                                ? "text-rose-600 font-black animate-pulse"
                                : "text-emerald-600"
                            }`}
                          >
                            {t.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                          {t.status === "SUSPENDED"
                            ? "⚠️ Blokir Akses POS & Staff Aktif"
                            : "Sistem Terbuka & Normal"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <button
                          disabled={readOnlyMode}
                          onClick={() => {
                            setImpersonationTenant(t);
                            setImpersonationReason("");
                            setImpersonationTicket("");
                            setImpersonationMode("READ_ONLY");
                          }}
                          className="flex items-center justify-center gap-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors w-full"
                          title="Impersonate (Safe Bypass Access)"
                        >
                          <Lock className="w-3 h-3" /> Impersonate
                        </button>
                        <button
                          disabled={readOnlyMode}
                          onClick={() => {
                            setSelectedTenantForConfig(t.id);
                            setConfigSubdomain(t.subdomain || t.id);
                            setConfigCustomDomain(
                              t.branding?.customDomain || "",
                            );
                            const sSettings =
                              (t as any).settings?.storageSettings || {};
                            setConfigStorageMode(sSettings.mode || "SYSTEM");
                            setConfigBucketName(sSettings.bucketName || "");
                            setConfigStorageLimitMb(
                              t.limits?.storageMb || 1024,
                            );
                            setConfigUserLimit(t.limits?.users || 3);
                            setConfigBranchLimit(t.limits?.branches || 1);
                            setConfigFeatures(t.limits?.features || []);
                            setConfigName(t.name);
                            setConfigTier(t.tier);
                            setConfigStatus(t.status);
                          }}
                          className="flex items-center justify-center gap-1.5 bg-accent-lighter hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-accent dark:text-accent border border-indigo-200/50 dark:border-indigo-900/30 px-2.5 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all w-full shadow-xs"
                          title="Konfigurasi Batasan Kuota & Manajemen Fitur Aktif"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Limit & Fitur
                        </button>
                        <div
                          className="rounded-lg border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-2 text-[9px] leading-relaxed text-amber-700 dark:text-amber-300"
                          id={`sa-tenant-danger-zone-${t.id}`}
                        >
                          <p className="font-black uppercase tracking-wider">Danger Zone</p>
                          <p>
                            Hard delete disembunyikan. Gunakan suspend/reactivate agar data tenant tetap aman.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>{serverTotal} tenant · Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-zinc-700"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-zinc-700"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm p-6 h-fit">
        <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-zinc-200 tracking-wider mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-400 dark:text-zinc-500" />{" "}
          Registrasi Tenant Baru
        </h3>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-6 gap-1" aria-label={`Langkah registrasi ${registrationStep} dari 6`}>{[1,2,3,4,5,6].map((step) => <span key={step} className={`h-1.5 rounded-full ${step <= registrationStep ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`} />)}</div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Langkah {registrationStep}/6 · {['Identitas','Domain','Owner','Paket','Validasi','Review'][registrationStep-1]}</p>
          {registrationStep === 1 && <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Nama Perusahaan / Bisnis
            </label>
            <input
              type="text"
              placeholder="cth: Mac Repair Center"
              value={newTenantName}
              onChange={(e) => handleTenantNameChange(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-white transition-colors"
              required
            />
          </div>}
          {registrationStep === 2 && <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Kode Identitas / Slug Tenant
            </label>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="mac-repair"
                value={newSubdomain}
                onChange={(e) =>
                  setNewSubdomain(
                    e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  )
                }
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-white transition-colors"
                required
              />
            </div>
          </div>}

          {registrationStep === 3 && <div className="border-t border-slate-100 dark:border-zinc-800 my-4 pt-4 space-y-4">
            <h4 className="font-bold text-[10px] uppercase text-blue-600 dark:text-blue-400 tracking-wider font-mono">
              Data Owner (Akun Administrator)
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Nama Owner / Pengelola
              </label>
              <input
                type="text"
                placeholder="cth: Budi Santoso"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-white transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Email Owner (Untuk Login)
              </label>
              <input
                type="email"
                placeholder="cth: budi@repaircenter.com"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-accent bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-white transition-colors"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Owner akan menerima undangan sekali pakai untuk membuat sandi sendiri. Undangan kedaluwarsa dalam 48 jam.
              </p>
            </div>
          </div>}

          {registrationStep === 4 && <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Subscription Paket
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as SubscriptionTier)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950 outline-none cursor-pointer font-bold text-slate-700 dark:text-slate-300"
            >
              <option value={SubscriptionTier.BASIC}>
                BASIC (5 Users, Rp 100k/bln)
              </option>
              <option value={SubscriptionTier.PRO}>
                PRO (15 Users, Rp 250k/bln)
              </option>
              <option value={SubscriptionTier.ENTERPRISE}>
                ENTERPRISE (100 Users, Rp 1.5M/bln)
              </option>
            </select>
          </div>}
          {registrationStep === 5 && <div className="space-y-3"><p className="text-xs text-slate-500">Periksa ketersediaan subdomain dan email sebelum melanjutkan.</p><button type="button" onClick={async () => { try { const params = new URLSearchParams({ subdomain: newSubdomain, email: newOwnerEmail }); const result = await readJsonResponse<any>(await apiFetch(`/api/superadmin/tenants/availability?${params}`), "Ketersediaan tenant"); setAvailability(result); } catch (err: any) { showToast(err.message, "error"); } }} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">Periksa ketersediaan</button>{availability && <div className={`rounded-xl p-3 text-xs font-bold ${availability.subdomainAvailable && availability.emailAvailable ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>Subdomain: {availability.subdomainAvailable ? "tersedia" : "digunakan"} · Email: {availability.emailAvailable ? "tersedia" : "digunakan"}</div>}</div>}
          {registrationStep === 6 && <div className="rounded-xl bg-slate-50 p-4 text-xs dark:bg-zinc-950"><p className="font-black">Review registrasi</p><dl className="mt-3 space-y-2"><div><dt className="text-slate-500">Tenant</dt><dd className="font-bold">{newTenantName} ({newSubdomain})</dd></div><div><dt className="text-slate-500">Owner</dt><dd className="font-bold">{newOwnerName} · {newOwnerEmail}</dd></div><div><dt className="text-slate-500">Paket</dt><dd className="font-bold">{newTier}</dd></div></dl></div>}
          <div className="flex gap-2">{registrationStep > 1 && <button type="button" onClick={() => setRegistrationStep((step) => step - 1)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold dark:border-zinc-700">Kembali</button>}{registrationStep < 6 && <button type="button" onClick={() => { if (registrationStep === 1 && !newTenantName.trim()) return showToast("Nama tenant wajib diisi.", "error"); if (registrationStep === 2 && !newSubdomain.trim()) return showToast("Subdomain wajib diisi.", "error"); if (registrationStep === 3 && (!newOwnerName.trim() || !newOwnerEmail.includes("@"))) return showToast("Data owner wajib valid.", "error"); if (registrationStep === 5 && (!availability?.subdomainAvailable || !availability?.emailAvailable)) return showToast("Ketersediaan belum valid.", "error"); setRegistrationStep((step) => step + 1); }} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">Lanjut</button>}</div>
          {registrationStep === 6 && <button
            type="submit"
            disabled={readOnlyMode}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Daftarkan & Setup Database
            (Supabase Sync)
          </button>}
        </form>
      </div>
      {detailTenant && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="tenant-detail-title">
          <section className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div><h3 id="tenant-detail-title" className="text-lg font-black text-slate-900 dark:text-white">{detailTenant.name}</h3><p className="text-xs text-slate-500">{detailTenant.subdomain} · {detailTenant.status} · {detailTenant.tier}</p></div><button type="button" onClick={() => setDetailTenant(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-zinc-700">Tutup</button></header>
            <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 p-3 dark:border-zinc-800" aria-label="Detail tenant">{[["summary","Ringkasan"],["users","Pengguna"],["billing","Billing"],["usage","Penggunaan"],["infrastructure","Domain & Storage"],["features","Fitur"],["audit","Audit"]].map(([id,label]) => <button key={id} type="button" onClick={() => setDetailTab(id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${detailTab===id?"bg-accent text-white":"text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>{label}</button>)}</nav>
            <div className="p-5">{detailLoading ? <p className="py-12 text-center text-sm text-slate-500">Memuat detail tenant…</p> : !detailData ? <p className="py-12 text-center text-sm text-slate-500">Detail belum tersedia.</p> : <>
              {detailTab === "summary" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Status",detailData.tenant.status],["Paket",detailData.tenant.tier],["Pengguna",detailData.users.length],["Invoice",detailData.invoices.length]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</p></div>)}</div>}
              {detailTab === "users" && <div className="space-y-3">{detailData.users.length ? detailData.users.map((user:any)=><div key={user.id} className="flex justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-800"><span><b>{user.name}</b><br/><span className="text-slate-500">{user.email}</span></span><span className="font-bold">{user.role}</span></div>) : <p className="text-sm text-slate-500">Belum ada user aktif.</p>}<div className="border-t border-slate-200 pt-3 dark:border-zinc-800"><h4 className="text-xs font-black">Undangan Owner</h4>{detailData.invitations.length ? detailData.invitations.map((invite:any)=><div key={invite.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-zinc-950"><span><b>{invite.name}</b><br/>{invite.email}<br/><span className="text-slate-400">{invite.acceptedAt ? 'Diterima' : invite.revokedAt ? 'Dicabut' : `Aktif sampai ${new Date(invite.expiresAt).toLocaleString('id-ID')}`}</span></span><span className="flex gap-1">{!invite.acceptedAt && !invite.revokedAt && <button type="button" disabled={readOnlyMode} onClick={()=>manageInvitation('revoke',invite)} className="rounded-lg border border-rose-200 px-2 py-1 text-rose-700 disabled:opacity-40">Cabut</button>}<button type="button" disabled={readOnlyMode||Boolean(invite.acceptedAt)} onClick={()=>manageInvitation('resend',invite)} className="rounded-lg bg-accent px-2 py-1 text-white disabled:opacity-40">Kirim ulang</button></span></div>) : <p className="mt-2 text-xs text-slate-500">Belum ada undangan.</p>}</div></div>}
              {detailTab === "billing" && <div className="space-y-2">{detailData.invoices.length ? detailData.invoices.map((invoice:any)=><div key={invoice.id} className="flex justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-800"><span><b>{invoice.id}</b><br/>{invoice.tier} · {invoice.billingCycle}</span><span className="font-black">{invoice.status}<br/>Rp {Number(invoice.amount).toLocaleString("id-ID")}</span></div>) : <p className="text-sm text-slate-500">Belum ada invoice.</p>}</div>}
              {detailTab === "usage" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">Penggunaan storage ditampilkan sebagai estimasi sampai backend mengirim `storage_used_bytes`. Data aktivitas: {detailData.users.length} user dan {detailData.invoices.length} invoice.</div>}
                      {detailTab === "infrastructure" && <dl className="grid gap-3 text-sm"><div><dt className="text-slate-500">Subdomain</dt><dd className="font-bold">{detailData.tenant.subdomain}</dd></div><div><dt className="text-slate-500">Storage aktual</dt><dd className="font-bold">{detailData.tenant.storageUsedBytes == null ? "Belum diukur" : `${Math.round(Number(detailData.tenant.storageUsedBytes)/1048576)} MB`}</dd></div></dl>}
              {detailTab === "features" && <div className="flex flex-wrap gap-2">{(detailData.tenant.settings?.limits?.features || detailTenant.limits?.features || []).map((feature:string)=><span key={feature} className="rounded-full bg-accent-lighter px-3 py-1 text-xs font-bold text-accent dark:bg-indigo-950/30 dark:text-indigo-300">{feature}</span>)}</div>}
              {detailTab === "audit" && <div className="space-y-2">{detailData.audit.map((event:any)=><div key={event.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-800"><div className="flex justify-between"><b>{event.action}</b><span>{event.outcome}</span></div><p className="mt-1 text-slate-500">{new Date(event.createdAt).toLocaleString("id-ID")}</p></div>)}</div>}
            </>}</div>
          </section>
        </div>
      )}

      {statusDialogTenant && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-status-title">
          <form className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900" onSubmit={async (event) => {
            event.preventDefault();
            if (!statusReason.trim()) return showToast("Alasan wajib diisi.", "error");
            const nextStatus = statusDialogTenant.status === TenantStatus.SUSPENDED ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED;
            try {
              const response = await apiFetch(`/api/superadmin/tenants/${statusDialogTenant.id}/status`, {
                method: "POST",
                headers: { "X-SuperAdmin-Mode": readOnlyMode ? "read-only" : "edit" },
                body: JSON.stringify({ status: nextStatus, category: statusCategory, reason: statusReason, internalNote: statusNote, scheduledReactivationAt: reactivateAt || null, notifyOwner: true, expectedVersion: Number((statusDialogTenant as any).version || 1) }),
              });
              await readJsonResponse(response, "Perubahan status tenant");
              updateTenantStatus(statusDialogTenant.id, nextStatus);
              showToast(`Tenant berhasil ${nextStatus === TenantStatus.SUSPENDED ? "ditangguhkan" : "diaktifkan"}.`, "success");
              setStatusDialogTenant(null);
            } catch (error: any) { showToast(error.message, "error"); }
          }}>
            <h3 id="tenant-status-title" className="text-lg font-black text-slate-900 dark:text-white">{statusDialogTenant.status === TenantStatus.SUSPENDED ? "Aktifkan kembali tenant" : "Tangguhkan tenant"}</h3>
            <p className="mt-1 text-xs text-slate-500">{statusDialogTenant.name} · tindakan ini tercatat di audit.</p>
            <div className="mt-5 grid gap-4">
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Kategori<select value={statusCategory} onChange={(event) => setStatusCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950"><option value="BILLING">Pembayaran</option><option value="SECURITY">Keamanan</option><option value="ABUSE">Penyalahgunaan</option><option value="TENANT_REQUEST">Permintaan tenant</option></select></label>
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Alasan<input required value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label>
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Catatan internal<textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label>
              {statusDialogTenant.status !== TenantStatus.SUSPENDED && <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Aktif kembali otomatis (opsional)<input type="datetime-local" value={reactivateAt} onChange={(event) => setReactivateAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label>}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setStatusDialogTenant(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-zinc-700">Batal</button><button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white">Konfirmasi</button></div>
          </form>
        </div>
      )}

      {impersonationTenant && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="impersonation-title">
          <form className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900" onSubmit={async (event) => {
            event.preventDefault();
            if (!impersonationReason.trim()) return showToast("Alasan akses wajib diisi.", "error");
            try {
              const response = await apiFetch(`/api/superadmin/tenants/${impersonationTenant.id}/impersonation`, { method: "POST", headers: { "X-SuperAdmin-Mode": readOnlyMode ? "read-only" : "edit" }, body: JSON.stringify({ reason: impersonationReason, ticketId: impersonationTicket || null, accessMode: impersonationMode, durationMinutes: 30 }) });
              const result = await readJsonResponse<any>(response, "Impersonasi");
              localStorage.setItem("saas_impersonation_session", JSON.stringify(result.session));
              impersonateTenant(impersonationTenant.id);
              setImpersonationTenant(null);
            } catch (error: any) { showToast(error.message, "error"); }
          }}>
            <h3 id="impersonation-title" className="text-lg font-black text-slate-900 dark:text-white">Akses tenant secara aman</h3>
            <p className="mt-1 text-xs text-slate-500">{impersonationTenant.name} · sesi otomatis berakhir dalam 30 menit.</p>
            <div className="mt-5 grid gap-4"><label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Alasan<input required value={impersonationReason} onChange={(event) => setImpersonationReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Ticket ID (opsional)<input value={impersonationTicket} onChange={(event) => setImpersonationTicket(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="text-xs font-bold text-slate-600 dark:text-zinc-300">Mode<select value={impersonationMode} onChange={(event) => setImpersonationMode(event.target.value as "READ_ONLY" | "FULL")} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 dark:border-zinc-700 dark:bg-zinc-950"><option value="READ_ONLY">Hanya-baca (disarankan)</option><option value="FULL">Akses penuh</option></select></label></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setImpersonationTenant(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-zinc-700">Batal</button><button type="submit" className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white">Mulai sesi</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
