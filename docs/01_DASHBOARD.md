# 01 — DASHBOARD & ARSITEKTUR SISTEM
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

RepairHub ERP adalah platform manajemen bengkel elektronik berbasis **SaaS multi-tenant**, dibangun dengan React 18 + TypeScript + Supabase + Vite. Mendukung multiple branch per tenant, RBAC 6-level, lazy-loading modular, dan integrasi notifikasi WhatsApp real-time.

---

## 2. Tech Stack

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| Frontend | React 18 + TypeScript | SPA reactive UI/UX |
| State Management | React Context API (SaaSContext) | Global state & semua actions |
| Backend / DB | Supabase (PostgreSQL 15) | Database, Auth, Realtime, Storage |
| Auth | Supabase Auth + JWT | Session management & permission |
| Styling | TailwindCSS 3 | Utility-first responsive design |
| Build | Vite 5 | Fast bundler + HMR + code splitting |
| Icons | Lucide React | Consistent icon library |
| Print | Browser Print API | Struk, invoice, label cetak |
| AI Engine | Google Gemini API | Diagnosa perangkat cerdas |
| Notifikasi | WhatsApp Gateway (multi-provider) | Push notification ke pelanggan |

---

## 3. Arsitektur Multi-Tenant

```
SuperAdmin
 +-- Tenant A (tier: PRO)
 |    +-- Branch Jakarta  -> Warehouse JKT-Utama, JKT-Servis
 |    +-- Branch Bandung  -> Warehouse BDG-01
 +-- Tenant B (tier: ENTERPRISE)
      +-- Branch Surabaya -> Warehouse SBY-01
      +-- Branch Medan    -> Warehouse MDN-01
```

**Row-Level Security (RLS) Supabase:**
```sql
-- Semua tabel diproteksi; query otomatis difilter per tenant
CREATE POLICY "tenant_isolation" ON service_tickets
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## 4. SaaSContext — Central State Hub

**File:** `src/context/SaaSContext.tsx`

### 4.1 State Properties

| Property | Tipe | Deskripsi |
|----------|------|-----------|
| `currentUser` | `User \| null` | User yang sedang login |
| `currentTenantId` | `string \| null` | ID tenant aktif (dari JWT) |
| `currentBranchId` | `string \| null` | ID branch aktif |
| `userRole` | `string` | superadmin / owner / manager / kasir / teknisi / viewer |
| `permissions` | `Record<string, boolean>` | Map permission aktif |
| `products` | `Product[]` | Master produk + `warehouseStock` map per gudang |
| `warehouses` | `Warehouse[]` | Daftar gudang per tenant |
| `branches` | `Branch[]` | Daftar branch per tenant |
| `customers` | `Customer[]` | Master pelanggan |
| `transactions` | `POSTransaction[]` | Cache transaksi POS hari ini |
| `tenants` | `Tenant[]` | (SuperAdmin only) Semua tenant |

### 4.2 Action Methods Utama

| Method | Fungsi |
|--------|--------|
| `addInventoryProduct(data)` | Tambah produk baru + stok awal ke gudang |
| `updateInventoryProduct(id, data)` | Update data produk |
| `createInventoryTransfer(data)` | Buat permintaan transfer stok antar gudang |
| `updateInventoryTransferStatus(id, status)` | Update status transfer (PENDING→IN_TRANSIT→COMPLETED) |
| `createPOSTransaction(data)` | Buat transaksi kasir + update stok + auto-journal |
| `openShift(openingBalance)` | Buka sesi kasir dengan saldo awal |
| `closeShift(closingBalance)` | Tutup sesi + rekap harian |
| `refundTransaction(txId, reason)` | Proses refund + rollback stok |

### 4.3 Computed: branchStock

```typescript
// File: TenantDashboard.tsx
const branchStock = (p: Product): number => {
  if (!currentBranchId || !p.warehouseStock) return p.stockQty ?? 0;
  const branchWhIds = tenantWhs
    .filter((w) => w.branchId === currentBranchId)
    .map((w) => w.id);
  return branchWhIds.reduce(
    (sum, id) => sum + (Number(p.warehouseStock[id]) || 0), 0
  );
};
```

---

## 5. Alur Inisialisasi Aplikasi

```
Browser Load React App
  |
  v
SaaSContext.Provider mount
  |
  v
supabase.auth.getSession()
  |
  +-- Session VALID:
  |     fetchUserProfile(userId)
  |       -> set: currentUser, tenantId, branchId, role, permissions
  |       -> Promise.all([
  |             loadProducts(),      // with warehouseStock per gudang
  |             loadWarehouses(),
  |             loadBranches(),
  |             loadCustomers()
  |          ])
  |       -> setState() -> Render TenantDashboard / SuperAdminDashboard
  |
  +-- Session INVALID:
        redirect("/login")

Supabase Realtime (setelah login):
  supabase.channel('db-changes')
    .on('postgres_changes', { table: 'products' }, syncLocalState)
    .on('postgres_changes', { table: 'service_tickets' }, syncLocalState)
    .subscribe();
```

---

## 6. Lazy Loading Pattern

**File:** `src/components/TenantDashboard.tsx`

Semua 14 modul dimuat **on-demand** via `React.lazy` + `Suspense` — initial bundle tetap kecil.

```tsx
const ServicesTab   = React.lazy(() => import("./tenant/ServicesTab"));
const POSTab        = React.lazy(() => import("./tenant/POSTab"));
const InventoryTab  = React.lazy(() => import("./tenant/InventoryTab"));
const AccountingTab = React.lazy(() => import("./tenant/AccountingTab"));
const HRTab         = React.lazy(() => import("./tenant/HRTab"));
const CRMTab        = React.lazy(() => import("./tenant/CRMTab"));
const SettingsTab   = React.lazy(() => import("./tenant/SettingsTab"));
const FraudTab      = React.lazy(() => import("./tenant/FraudTab"));
const WarrantyClaims = React.lazy(() => import("./tenant/WarrantyClaims"));
const SystemBackup  = React.lazy(() => import("./tenant/SystemBackup"));
const OwnerReports  = React.lazy(() => import("./tenant/OwnerReports"));
// + DeviceRentalDashboard, TechnicianOverview, CustomerApprovalPanel

// Render dengan fallback
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">Memuat Modul ERP...</p>
  </div>
);
```

---

## 7. Tab Navigation & Role Access

| Tab | Komponen | Role Min | Sub-Fitur |
|-----|----------|----------|-----------|
| Servis | ServicesTab | teknisi | Tiket, AI diagnosa, QC, Garansi |
| Kasir | POSTab | kasir | Shift, Transaksi, Struk, Refund |
| Inventory | InventoryTab | manager | Produk, Gudang, Transfer, Opname |
| CRM | CRMTab | manager | Pelanggan, Pipeline B2B, Portal |
| Accounting | AccountingTab | manager | CoA, Jurnal, Laporan Keuangan |
| HR/Payroll | HRTab | manager | Karyawan, Absensi, Gaji, Komisi |
| Pengaturan | SettingsTab | owner | RBAC, Branding, Semua config |
| WhatsApp | WhatsAppConnector | owner | Gateway, Template, Trigger |
| Fraud | FraudTab | owner | Deteksi anomali transaksi |
| Garansi | WarrantyClaims | teknisi | Verifikasi & klaim garansi |
| Backup | SystemBackup | owner | Backup & restore data |
| Rental | DeviceRentalDashboard | manager | Manajemen sewa perangkat |
| Owner Report | OwnerReports | owner | Laporan pemilik komprehensif |
| SuperAdmin | SuperAdminDashboard | superadmin | Kelola semua tenant |

---

## 8. Print Configuration

**Hook:** `src/hooks/usePrintConfig.ts` | **Utils:** `src/utils/print.ts`

| Config | Tipe | Default | Fungsi |
|--------|------|---------|--------|
| `paperSize` | `"58mm" \| "80mm" \| "A4"` | `"80mm"` | Ukuran kertas struk |
| `printQrCode` | `boolean` | `true` | QR code di struk/invoice |
| `printHeaderLogo` | `boolean` | `true` | Logo di header cetak |
| `customHeaderTitle` | `string` | nama tenant | Judul struk |
| `customFooterText` | `string` | — | Footer struk |
| `termsAndConditionsText` | `string` | — | Syarat & ketentuan |
| `printFontSize` | `string` | `"12px"` | Ukuran font cetak |
| `labelWidth` × `labelHeight` | `number` | 62 × 29 mm | Dimensi label produk |
| `labelShowQr` | `boolean` | `true` | QR code di label |

---

## 9. Subscription Tiers

| Tier | Max Users | Max Branch | Storage | Fitur Kunci |
|------|-----------|------------|---------|-------------|
| BASIC | 5 | 1 | 500 MB | Servis, POS, Inventory dasar |
| PRO | 20 | 5 | 5 GB | + CRM, Accounting, HR, WhatsApp |
| ENTERPRISE | Unlimited | Unlimited | 50 GB | + AI Diagnosa, Audit Log, API, White-label |

---

## 10. Alur Data Lintas Modul

```
Servis (selesai)
  -> Inventory: kurangi stok sparepart
  -> Accounting: auto-journal pendapatan jasa

POS (transaksi)
  -> Inventory: kurangi stok produk
  -> Accounting: auto-journal penjualan + HPP
  -> CRM: tambah loyalty points + update totalSpending

Inventory (PO diterima)
  -> Accounting: auto-journal hutang dagang

HR (tutup bulan)
  -> Accounting: journal beban gaji + komisi
```
