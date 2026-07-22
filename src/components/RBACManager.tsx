/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useSaaS, DEFAULT_ROLE_PERMISSIONS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import {
  UserPlus,
  ShieldCheck,
  Trash2,
  Search,
  X,
  ChevronDown,
  Crown,
  Building2,
  Shield,
  UserCog,
  Wrench,
  Briefcase,
  Users,
  UserRound,
  ShieldAlert,
  Store,
  Banknote,
  Sliders,
  Check,
} from "lucide-react";
import { UserRole } from "../types";

export const RBACManager: React.FC = () => {
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const {
    users,
    currentTenantId,
    addUser,
    deleteUser,
    updateUserRole,
    updateUserPermissions,
    currentUser,
    scopedBranches,
    tenants,
  } = useSaaS();

  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const currentTenantUsersCount = users.filter((u) => u.tenantId === currentTenantId && u.role !== UserRole.OWNER).length;
  const userLimit = activeTenant?.limits?.users || 3;
  const isLimitReached = currentTenantUsersCount >= userLimit;
  const pct = Math.min(100, Math.round((currentTenantUsersCount / userLimit) * 100));
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const canAssignOwner = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.OWNER;

  // New User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.TEKNISI);
  const [newBranchIds, setNewBranchIds] = useState<string[]>([]);

  // Automatically select first branch
  React.useEffect(() => {
    if (showAddModal && scopedBranches.length > 0 && newBranchIds.length === 0) {
      setNewBranchIds([scopedBranches[0].id]);
    }
  }, [showAddModal, scopedBranches, newBranchIds]);

  const filteredUsers = users.filter(
    (u) =>
      u.tenantId === currentTenantId &&
      u.role !== UserRole.OWNER &&
      ((u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Per-staff permission editor
  const [editingUser, setEditingUser] = useState<typeof users[number] | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  const permGroups = React.useMemo(() => {
    const map = new Map<string, string[]>();
    (DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN || []).forEach((p) => {
      const cat = p.split("-")[0];
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    const labels: Record<string, string> = {
      overview: "Umum",
      services: "Servis",
      pos: "POS",
      inventory: "Inventory",
      accounting: "Keuangan",
      hr: "HR",
      crm: "CRM",
      settings: "Settings",
      action: "Aksi Khusus",
    };
    return Array.from(map.entries()).map(([cat, perms]) => ({
      cat,
      label: labels[cat] || cat,
      perms,
    }));
  }, []);

  const openEdit = (user: typeof users[number]) => {
    setEditingUser(user);
    setEditPerms([...(user.permissions || [])]);
  };

  const toggleEditPerm = (perm: string) => {
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleCatPermsForEdit = (perms: string[]) => {
    const allHave = perms.every((p) => editPerms.includes(p));
    if (allHave) {
      setEditPerms((prev) => prev.filter((p) => !perms.includes(p)));
    } else {
      setEditPerms((prev) => Array.from(new Set([...prev, ...perms])));
    }
  };

  const PERMISSION_LABELS: Record<string, string> = {
    "overview": "Lihat Ringkasan Dashboard",
    "services-list": "Lihat Daftar Tiket Servis",
    "services-new-ticket": "Buat Tiket Servis Baru",
    "services-field-service": "Servis Lapangan (Home Service)",
    "services-qc": "Quality Control Perangkat",
    "services-rental": "Manajemen Penyewaan Unit",
    "services-warranty-claims": "Manajemen Klaim Garansi",
    "services-knowledge-base": "Katalog Solusi (Knowledge Base)",
    "pos-cashier": "Buka Antarmuka Kasir POS",
    "pos-shifts": "Manajemen Shift Kasir",
    "pos-history": "Lihat Riwayat Penjualan POS",
    "pos-marketplace-hub": "Kelola Hub E-Commerce",
    "inventory-stock": "Atur Stok & Katalog Sparepart",
    "inventory-tradein": "Menu Tukar Tambah Perangkat",
    "inventory-cannibal": "Proses Kanibalisasi Device",
    "inventory-small-parts": "Inventaris Baut & Small Parts",
    "inventory-assets": "Pencatatan Aset Internal Toko",
    "accounting-coa": "Bagan Akun (Chart of Accounts)",
    "accounting-ledger": "Akses Jurnal & Buku Besar",
    "accounting-statements": "Lihat Laporan Laba Rugi / Neraca",
    "hr-attendance": "Absensi & Kehadiran Staff",
    "hr-payroll": "Slip Gaji & Konfigurasi Payroll",
    "hr-commission": "Komisi Teknisi & Penjualan",
    "hr-kasbon": "Manajemen Kasbon Karyawan",
    "crm-customers": "Database & Segmentasi Pelanggan",
    "crm-pipeline": "Pipa Penjualan & Prospek (Pipeline)",
    "crm-whatsapp": "Kirim WhatsApp Blast Massal",
    "crm-marketing": "Manajemen Voucher & Promosi",
    "settings-branding": "Pengaturan Branding & Logo",
    "settings-branches": "Atur Cabang & Laci Kasir",
    "settings-whatsapp": "Integrasi Akun WA Gateway",
    "settings-storage": "Konfigurasi Custom S3 Cloud",
    "settings-notifications": "Template Notifikasi Otomatis",
    "settings-modules-config": "Aktif/Nonaktifkan Fitur Sistem",
    "settings-workflows": "Automasi Alur Kerja (Workflow)",
    "settings-rbac": "Atur Hak Akses & Staff",
    "settings-audit": "Lihat Log Aktivitas Keamanan",
    "settings-fraud": "Monitor Alarm & Tangguhkan Staff",
    "settings-subscription": "Informasi Billing & Upgrade Paket",
    "action-services-qc-approve": "Otoritas Kelulusan Quality Control",
    "action-services-delete-ticket": "Hapus Tiket Servis Pelanggan",
    "action-inventory-stock-adjust": "Persetujuan Opname / Koreksi Stok",
    "action-inventory-tradein-approve": "Approve Opsi Tukar Tambah",
    "action-inventory-cannibal-scrap": "Otorisasi Scrap Kanibal Perangkat",
    "action-accounting-coa-create": "Buat Kode Akun Keuangan Baru",
    "action-settings-workflows-edit": "Edit Aturan Alur Kerja Otomatis",
    "action-pos-invoice-view": "Lihat Tagihan Kasir Historis",
    "action-pos-void-approve": "Persetujuan Batal Transaksi (Void)",
    "action-pos-discount-apply": "Pemberian Diskon Manual",
    "action-hr-salary-edit": "Ubah Nominal Gaji Staff",
    "action-hr-payroll-approve": "Persetujuan Slip Gaji Massal",
  };

  const saveEditPerms = async () => {
    if (!editingUser) return;
    try {
      await updateUserPermissions(editingUser.id, editPerms);
      showToast(`Hak akses ${editingUser.name} disimpan.`, "success");
      setEditingUser(null);
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan hak akses.", "error");
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanName || !cleanEmail) return;
    if (!cleanEmail.includes("@")) {
      showToast("Format email tidak valid.", "error");
      return;
    }
    if (isLimitReached) {
      showToast("Kuota pengguna staff telah mencapai batas maksimal paket Anda.", "error");
      return;
    }

    try {
      addUser({
        name: cleanName,
        email: cleanEmail,
        role: newRole,
        tenantId: currentTenantId,
        branchIds: newBranchIds.length > 0 ? newBranchIds : scopedBranches.length > 0 ? [scopedBranches[0].id] : [],
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random`,
      });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewBranchIds([]);
      showToast("Staff berhasil ditambahkan.", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menambahkan staff.", "error");
    }
  };

  // Role badge styling + icon + accent
  type RoleStyle = {
    label: string;
    icon: React.ReactNode;
    badge: string;
    accent: string;
    dot: string;
  };

  const roleStyle = (role: UserRole): RoleStyle => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return { label: "Super Admin", icon: <Crown className="h-3 w-3" />, badge: "bg-purple-50 text-purple-700 border-purple-200", accent: "border-l-purple-500", dot: "bg-purple-500" };
      case UserRole.OWNER:
        return { label: "Owner", icon: <Building2 className="h-3 w-3" />, badge: "bg-accent-lighter text-accent border-indigo-200", accent: "border-l-indigo-500", dot: "bg-indigo-500" };
      case UserRole.ADMIN:
        return { label: "Admin", icon: <Shield className="h-3 w-3" />, badge: "bg-slate-100 text-slate-700 border-slate-300", accent: "border-l-slate-400", dot: "bg-slate-500" };
      case UserRole.MANAGER:
        return { label: "Manager", icon: <UserCog className="h-3 w-3" />, badge: "bg-blue-50 text-blue-700 border-blue-200", accent: "border-l-blue-400", dot: "bg-blue-500" };
      case UserRole.KASIR:
        return { label: "Kasir", icon: <Banknote className="h-3 w-3" />, badge: "bg-amber-50 text-amber-700 border-amber-200", accent: "border-l-amber-400", dot: "bg-amber-500" };
      case UserRole.TEKNISI:
        return { label: "Teknisi", icon: <Wrench className="h-3 w-3" />, badge: "bg-emerald-50 text-emerald-700 border-emerald-200", accent: "border-l-emerald-400", dot: "bg-emerald-500" };
      case UserRole.SALES:
        return { label: "Sales", icon: <Briefcase className="h-3 w-3" />, badge: "bg-cyan-50 text-cyan-700 border-cyan-200", accent: "border-l-cyan-400", dot: "bg-cyan-500" };
      case UserRole.HR:
        return { label: "HR", icon: <Users className="h-3 w-3" />, badge: "bg-pink-50 text-pink-700 border-pink-200", accent: "border-l-pink-400", dot: "bg-pink-500" };
      default:
        return { label: role, icon: <UserRound className="h-3 w-3" />, badge: "bg-slate-100 text-slate-700 border-slate-300", accent: "border-l-slate-400", dot: "bg-slate-500" };
    }
  };

  const ringColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "var(--accent, #4f46e5)";
  const R = 15.5;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);

  return (
    <div className="space-y-6">
      {/* Quota Mini Stat Card */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-black text-slate-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-lighter text-accent">
                  <Users className="h-3.5 w-3.5" />
                </span>
                Kuota Akun Staff
              </p>
              <p className="text-[11px] text-slate-500">
                Maksimal staf untuk paket{" "}
                <span className="font-bold uppercase text-accent">
                  {activeTenant?.tier || "BASIC"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p
                  className={`text-2xl font-black leading-none ${
                    isLimitReached ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {currentTenantUsersCount}
                  <span className="text-sm font-bold text-slate-400">/{userLimit}</span>
                </p>
                <p
                  className={`text-[10px] font-bold uppercase ${
                    pct >= 100 ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-emerald-500"
                  }`}
                >
                  {pct}% terpakai
                </p>
              </div>
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r={R} fill="none" className="stroke-slate-100" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r={R}
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ stroke: ringColor, strokeDasharray: C, strokeDashoffset: offset }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
                  {pct}%
                </span>
              </div>
            </div>
          </div>

      {/* Search Ribbon */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau email staff..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
            {filteredUsers.length} Staff Aktif
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Staff Baru
          </button>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => {
                const rs = roleStyle(user.role);
                const isCurrentOwner = user.id === currentUser.id && user.role === UserRole.OWNER;
                const branchNames = user.branchIds?.length
                  ? user.branchIds
                      .map((id) => scopedBranches.find((b) => b.id === id)?.name)
                      .filter((n): n is string => Boolean(n))
                  : null;
                return (
                  <div
                    key={user.id}
                    className={`group relative overflow-hidden rounded-2xl border border-l-[3px] border-slate-200/70 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${rs.accent} ${
                      isCurrentOwner ? "bg-accent-lighter/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                        className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                        alt={user.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{user.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                      </div>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={async () => {
                            const isConfirmed = await showConfirm({
                              title: "Hapus Akses Staff",
                              message: `Apakah Anda yakin ingin menghapus staff ${user.name}? Akses ke sistem akan terputus permanen.`,
                              confirmLabel: "Ya, Hapus",
                              type: "danger",
                            });
                            if (isConfirmed) deleteUser(user.id);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus Staff"
                          aria-label="Hapus staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${rs.badge}`}
                      >
                        {rs.icon}
                        {rs.label}
                      </span>
                      <select
                        value={user.role}
                        onChange={async (e) => {
                          if (user.tenantId !== currentTenantId) return;
                          try {
                            await updateUserRole(user.id, e.target.value as UserRole);
                            showToast(`Peran ${user.name} disimpan.`, "success");
                          } catch (error: any) {
                            showToast(error.message || "Gagal menyimpan peran.", "error");
                          }
                        }}
                        className="block w-auto max-w-[130px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={(user.id === currentUser.id && user.role === UserRole.OWNER) || user.tenantId !== currentTenantId}
                        aria-label="Ganti peran staff"
                      >
                        {Object.values(UserRole)
                          .filter((r) => {
                            if (r === UserRole.SUPER_ADMIN) return false;
                            if (r === UserRole.OWNER && !canAssignOwner) return false;
                            return true;
                          })
                          .map((role) => (
                            <option key={role} value={role}>
                              {role.replace("_", " ")}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {branchNames ? (
                        <>
                          {branchNames.slice(0, 3).map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              <Store className="h-2.5 w-2.5 text-slate-400" />
                              {name}
                            </span>
                          ))}
                          {branchNames.length > 3 && (
                            <span className="rounded-md bg-accent-lighter px-2 py-0.5 text-[10px] font-bold text-accent">
                              +{branchNames.length - 3} lainnya
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-lighter px-2 py-0.5 text-[10px] font-bold text-accent">
                          <Store className="h-2.5 w-2.5" />
                          Semua Cabang
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Aktif
                      </span>
                      <button
                        onClick={() => openEdit(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-all hover:border-indigo-200 hover:bg-accent-lighter hover:text-accent"
                        title="Edit hak akses staff"
                      >
                        <Sliders className="h-3 w-3" />
                        Edit Hak Akses
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
              <Search className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada staff ditemukan</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Coba kata kunci lain atau tambah staff baru.
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          )}

      {/* Add User Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Tambah Staff Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-5 p-6">
              {/* Group 1: Identitas */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Andi Wijaya"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Alamat Email (Login)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="andi@toko.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Akses &amp; Lokasi
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Peran (Role)
                    </label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 pr-8 text-xs outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                      >
                        {Object.values(UserRole)
                          .filter((r) => r !== UserRole.SUPER_ADMIN && r !== UserRole.OWNER)
                          .map((role) => (
                            <option key={role} value={role}>
                              {role.replace("_", " ")}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Lokasi Cabang
                    </label>
                    <div className="max-h-[100px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                      {scopedBranches.length === 0 ? (
                        <p className="px-2 py-1 text-[11px] text-slate-400">Tidak ada cabang</p>
                      ) : (
                        scopedBranches.map((branch) => (
                          <label
                            key={branch.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-accent focus:ring-accent"
                              checked={newBranchIds.includes(branch.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewBranchIds([...newBranchIds, branch.id]);
                                } else {
                                  setNewBranchIds(newBranchIds.filter((id) => id !== branch.id));
                                }
                              }}
                            />
                            <span className="text-[11px] text-slate-700">{branch.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isLimitReached ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">
                  <strong>Kuota Penuh:</strong> Anda telah mencapai batas maksimal ({currentTenantUsersCount}/{userLimit}) staff. Silakan lakukan upgrade paket.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                  Email yang didaftarkan akan menerima link aktivasi sementara.
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLimitReached}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isLimitReached
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98]"
                  }`}
                >
                  Simpan Staff
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Permissions Modal */}
      {editingUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                    Edit Hak Akses
                  </h3>
                  <span className="rounded-full bg-accent-lighter px-2 py-0.5 text-[10px] font-bold text-accent">
                    {editPerms.length} / {DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN?.length || 40} Aktif
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold">{editingUser.name}</span>
                  <span>·</span>
                  <span className="font-bold uppercase text-accent">{editingUser.role.replace("_", " ")}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-5 space-y-5">
              {permGroups.map((g) => {
                const categoryActiveCount = g.perms.filter((p) => editPerms.includes(p)).length;
                const allSelected = categoryActiveCount === g.perms.length;
                return (
                  <div key={g.cat} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/30 p-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {g.label}
                        <span className="text-[9px] font-normal text-slate-400 capitalize">
                          ({categoryActiveCount}/{g.perms.length})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCatPermsForEdit(g.perms)}
                        className="text-[9px] font-bold uppercase text-accent hover:text-indigo-800 hover:underline"
                      >
                        {allSelected ? "Kosongkan" : "Pilih Semua"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {g.perms.map((perm) => {
                        const on = editPerms.includes(perm);
                        const labelText = PERMISSION_LABELS[perm] || perm.split("-").slice(1).join("-") || perm;
                        return (
                          <button
                            key={perm}
                            onClick={() => toggleEditPerm(perm)}
                            className={`flex items-start justify-between gap-3 rounded-lg border p-2 text-left transition-all ${
                              on
                                ? "border-indigo-200 bg-accent-lighter/60 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                                {labelText}
                              </p>
                              <p className="text-[8px] font-mono text-slate-400 truncate" title={perm}>
                                {perm}
                              </p>
                            </div>
                            <span
                              className={`h-4 w-4 shrink-0 rounded-md border flex items-center justify-center transition-all ${
                                on
                                  ? "border-accent bg-accent text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 border-t border-slate-100 p-5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={saveEditPerms}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
