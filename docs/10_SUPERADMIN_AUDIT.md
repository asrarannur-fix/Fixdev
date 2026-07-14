# 10 — SUPER ADMIN & AUDIT MULTI-TENANT
**RepairHub ERP** | Dokumentasi Teknis v1.0 | 2024

---

## 1. Gambaran Umum

SuperAdmin Dashboard adalah panel manajemen platform RepairHub secara keseluruhan. SuperAdmin mengelola semua tenant (buat, pantau, tangguhkan, pulihkan), tier langganan, kesehatan sistem, audit log lintas-tenant, feature flags global, dan tools pemulihan data. SuperAdmin **tidak dapat mengakses data operasional** tenant (tiket, transaksi, pelanggan) — hanya metadata dan log.

---

## 2. Data Model Multi-Tenant

```typescript
// Dari types/index.ts
enum SubscriptionTier {
  BASIC      = "BASIC",       // Paket dasar UKM
  PRO        = "PRO",         // Paket professional
  ENTERPRISE = "ENTERPRISE",  // Paket enterprise tidak terbatas
}

enum TenantStatus {
  ACTIVE    = "ACTIVE",       // Berlangganan aktif dan berjalan
  TRIAL     = "TRIAL",        // Masa percobaan gratis (14 hari)
  EXPIRED   = "EXPIRED",      // Langganan berakhir, mode read-only
  SUSPENDED = "SUSPENDED",    // Ditangguhkan paksa (pelanggaran/tunggakan)
}

interface TenantLimits {
  users:     number;   // Maksimum pengguna aktif
  branches:  number;   // Maksimum branch/cabang
  storageMb: number;   // Maksimum storage (Supabase Storage)
  features:  string[]; // Daftar fitur yang diaktifkan untuk tier ini
}

interface Tenant {
  id: string;
  name: string;
  slug: string;                    // URL slug: "bengkel-maju-jaya"
  ownerEmail: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: TenantStatus;
  subscriptionStartAt: string;
  subscriptionEndsAt: string;
  limits: TenantLimits;
  branding: TenantBranding;
  settings: TenantSettings;
  createdAt: string;
}
```

---

## 3. Batas Per Tier (TenantLimits)

| Fitur | BASIC | PRO | ENTERPRISE |
|-------|-------|-----|------------|
| Max Pengguna | 5 | 20 | Unlimited |
| Max Branch | 1 | 5 | Unlimited |
| Storage | 500 MB | 5 GB | 50 GB |
| Modul Servis | Ya | Ya | Ya |
| Modul POS | Ya | Ya | Ya |
| Inventory Dasar | Ya | Ya | Ya |
| CRM | - | Ya | Ya |
| Accounting | - | Ya | Ya |
| HR/Payroll | - | Ya | Ya |
| WhatsApp | - | Ya | Ya |
| AI Diagnosa | - | - | Ya |
| Audit Log Lengkap | - | - | Ya |
| API Access | - | - | Ya |
| White-Label | - | - | Ya |
| Fraud Detection | - | - | Ya |
| Custom Reports | - | - | Ya |
| Device Rental | - | Ya | Ya |
| SLA Management | - | - | Ya |

```typescript
// Definisi di SaaSContext atau config:
const TIER_LIMITS: Record<SubscriptionTier, TenantLimits> = {
  BASIC: {
    users: 5, branches: 1, storageMb: 500,
    features: ["servis", "pos", "inventory_basic"],
  },
  PRO: {
    users: 20, branches: 5, storageMb: 5120,
    features: ["servis", "pos", "inventory", "crm", "accounting",
               "hr", "whatsapp", "device_rental"],
  },
  ENTERPRISE: {
    users: 9999, branches: 9999, storageMb: 51200,
    features: ["servis", "pos", "inventory", "crm", "accounting", "hr",
               "whatsapp", "ai_diagnosis", "audit_log", "api_access",
               "white_label", "device_rental", "fraud_detection",
               "custom_reports", "sla_management"],
  },
};
```

---

## 4. Lifecycle Tenant

### Alur Onboarding Tenant Baru
```
SuperAdmin klik "+ Buat Tenant Baru":
  Input: nama, slug (auto-generate), email owner, tier, durasi langganan

System proses:
  1. INSERT tenants {
       status: "TRIAL",
       subscription_ends_at: TODAY + 14 days,
       limits: TIER_LIMITS[selectedTier]
     }
  2. Supabase Admin: auth.admin.createUser({email: ownerEmail})
     -> Set user metadata: {tenantId: newId, role: "owner"}
  3. Seed data default ke schema tenant:
     - Chart of Accounts standar (20 akun)
     - Role permission templates
     - Shift schedule default
     - Document prefix defaults
  4. Kirim email welcome + link set password (berlaku 24 jam)
  5. WA ke SuperAdmin: "Tenant baru dibuat: [nama] | Tier: [tier]"

Setelah pembayaran dikonfirmasi:
  UPDATE tenants {
    status:               "ACTIVE",
    subscription_tier:    selectedTier,
    subscription_start_at: TODAY,
    subscription_ends_at: TODAY + durasiLangganan,
    limits: TIER_LIMITS[selectedTier]
  }
```

### Diagram Transisi Status

```
TRIAL (14 hari)
  |-- Bayar & aktifkan    --> ACTIVE
  |-- 14 hari habis       --> EXPIRED (cron otomatis)

ACTIVE
  |-- Langganan berakhir  --> EXPIRED (cron D+1)
  |-- Suspend manual      --> SUSPENDED (oleh SuperAdmin)

EXPIRED
  |-- Perpanjang & bayar  --> ACTIVE
  |-- 90 hari tidak perpanjang --> Dijadwalkan untuk penghapusan

SUSPENDED
  |-- Masalah selesai + bayar --> ACTIVE (manual oleh SuperAdmin)
  |-- Tidak ada respons 30 hari --> Permanent suspension
```

### Cron Jobs Otomatis (Supabase Edge Functions)
```sql
-- Dijalankan setiap hari pukul 00:01 WIB
UPDATE tenants
SET subscription_status = 'EXPIRED'
WHERE subscription_status IN ('ACTIVE', 'TRIAL')
  AND subscription_ends_at < NOW();

-- Kirim reminder D-7 sebelum expire
SELECT notify_tenant_expiring()
FROM tenants
WHERE subscription_status = 'ACTIVE'
  AND DATE(subscription_ends_at) = CURRENT_DATE + INTERVAL '7 days';
```

---

## 5. Health Monitoring Dashboard

```
Panel Real-time SuperAdmin:

Ringkasan Global:
  Tenant Aktif    : [jumlah]  (hijau)
  Tenant Trial    : [jumlah]  (biru)
  Tenant Expired  : [jumlah]  (kuning)
  Tenant Suspended: [jumlah]  (merah)
  Total User Aktif: [jumlah di semua tenant]
  Storage Total   : [X GB] / [Y GB allocated]

Tabel Tenant (searchable + sortable + filterable):
  Kolom: Nama | Slug | Tier | Status | Kadaluarsa | Users | Branch | Storage
  Filter: tier, status, expiry range
  Quick Actions per baris:
    [Detail] [Edit Tier] [Suspend] [Reactivate] [Extend] [Reset PW] [Delete]

Grafik & Trend (7 hari / 30 hari):
  - Supabase DB query latency (P50/P95)
  - Edge Function invocations & error rate
  - Storage usage trend
  - WA gateway delivery rate per tenant

Alert System:
  MERAH:   Tenant SUSPENDED | Storage > 90% limit
  KUNING:  Tenant EXPIRED > 7 hari | Error rate > 5% | Approaching limits
  HIJAU:   Semua operasional normal
```

---

## 6. Audit Log Multi-Tenant

```typescript
interface AuditLog {
  id: string;
  tenantId: string;       // Tenant yang terlibat
  actorId: string;        // User yang melakukan aksi
  actorRole: string;      // Role: superadmin | owner | manager | dll
  action: string;         // CREATE | UPDATE | DELETE | LOGIN | EXPORT | RESTORE
  resource: string;       // "service_ticket" | "user" | "settings" | "tenant"
  resourceId?: string;    // ID objek yang dimodifikasi
  changes?: {             // Diff before/after untuk UPDATE
    [field: string]: { old: any; new: any }
  };
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

### Kategori Events yang Dicatat

| Kategori | Events yang Diaudit |
|----------|---------------------|
| Autentikasi | Login berhasil, Login gagal (IP + timestamp), Logout, Reset password |
| Tiket Servis | Buat, Update status, Hapus, AI diagnosa dijalankan, Bulk delete |
| Transaksi POS | Buat, Void, Refund |
| Inventory | Buat/edit produk, PO dibuat/diterima, Transfer, Stock opname |
| Keuangan | Input jurnal manual, Tutup periode, Export laporan |
| Pelanggan | Buat, Edit, Blacklist, Hapus |
| Pengaturan | Ubah RBAC, Ubah branding, Ubah API keys, Ubah tax |
| Data | Export data, Backup manual dipicu |
| SuperAdmin | Buat tenant, Suspend tenant, Ubah tier, Restore data |

### Query Audit Log (Contoh Penggunaan)

```sql
-- Semua aksi DELETE/VOID/REFUND dalam 24 jam terakhir
SELECT a.*, u.email as actor_email
FROM audit_logs a
JOIN auth.users u ON a.actor_id = u.id
WHERE a.tenant_id  = :tenantId
  AND a.created_at > NOW() - INTERVAL '24 hours'
  AND a.action     IN ('DELETE', 'VOID', 'REFUND', 'EXPORT')
ORDER BY a.created_at DESC;

-- Deteksi brute force login
SELECT actor_id, ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_logs
WHERE action     = 'LOGIN_FAILED'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY actor_id, ip_address
HAVING COUNT(*) >= 5
ORDER BY attempts DESC;

-- Perubahan settings penting
SELECT * FROM audit_logs
WHERE resource IN ('settings', 'user', 'rbac')
  AND action   = 'UPDATE'
ORDER BY created_at DESC
LIMIT 100;
```

---

## 7. Tools Pemulihan (Recovery Tools)

### Reset Password Owner Tenant
```
SuperAdmin pilih tenant -> "Reset Owner Password":
  1. Supabase Admin: generateLink({type:"recovery", email: ownerEmail})
  2. Kirim link ke email owner (berlaku 1 jam)
  3. SuperAdmin TIDAK bisa melihat atau set password langsung
     (prinsip zero-knowledge)
  4. Log audit: "RESET_PASSWORD_LINK_SENT by superadmin [id]"
```

### Backup & Restore Data Tenant
```
Backup Manual (dipicu SuperAdmin):
  1. Supabase pg_dump khusus schema tenant: {tenantId}
  2. Kompres: .sql.gz
  3. Enkripsi: AES-256 dengan key per-tenant
  4. Upload ke Storage: backups/{tenantId}/{YYYY-MM-DD-HH}.sql.gz.enc
  5. Signed URL berlaku 24 jam untuk download

Restore:
  1. SuperAdmin pilih file backup
  2. Konfirmasi: PERINGATAN BESAR - "Restore akan menghapus SEMUA data saat ini"
     Ketik nama tenant untuk konfirmasi
  3. pg_restore ke schema tenant (replace all)
  4. Log: "DATA_RESTORED from [backup] by superadmin [id] at [timestamp]"
  5. Kirim notif ke owner: "Data Anda telah dipulihkan ke [tanggal backup]"
```

### Migrasi Tier (Upgrade/Downgrade)
```
UPGRADE (PRO -> ENTERPRISE):
  1. Update limits secara immediate di tenants.limits
  2. Aktifkan fitur baru di feature_flags
  3. UPDATE subscription_tier + subscription_ends_at
  4. WA ke owner: "Upgrade ke ENTERPRISE berhasil! Fitur baru aktif."

DOWNGRADE (ENTERPRISE -> PRO):
  1. Cek penggunaan saat ini vs batas tier baru:
     - users aktif <= 20? (limit PRO)
     - branches aktif <= 5?
     - storage used <= 5 GB?
  2. Jika MELEBIHI batas:
     BLOKIR downgrade + tampilkan: "Harap kurangi [resource] ke <= [limit] sebelum downgrade"
  3. Jika TIDAK melebihi:
     Proses downgrade
     Nonaktifkan fitur eksklusif ENTERPRISE
     UPDATE tier + limits
     WA ke owner: "Downgrade ke PRO selesai"
```

---

## 8. Feature Flags Global

```typescript
interface GlobalFeatureFlag {
  key: string;           // "ai_diagnosis_v2" | "device_rental_beta"
  name: string;          // Display name di SuperAdmin panel
  description: string;   // Penjelasan fitur
  enabled: boolean;      // Default untuk semua tenant
  overrides: Record<string, boolean>; // {tenantId: true/false}
  rolloutPercent: number; // 0-100: gradual rollout
  targetTiers: SubscriptionTier[];    // Tier yang boleh mengakses
}
```

```
SuperAdmin panel Feature Flags:
  Toggle global: aktif/nonaktif untuk semua tenant sekaligus
  Override per-tenant: aktifkan/nonaktifkan untuk 1 tenant spesifik
  Gradual rollout: aktifkan ke X% tenant secara acak (A/B testing)
  Tier gating: hanya aktifkan untuk tier tertentu (misal: hanya ENTERPRISE)
```

---

## 9. Verifikasi Isolasi Data (RLS Audit)

SuperAdmin dapat menjalankan tes isolasi secara berkala:

```sql
-- Verifikasi: tenant A tidak bisa akses data tenant B
-- (Dijalankan dengan context JWT tenant-a)
SET LOCAL request.jwt.claims = '{"tenant_id": "tenant-a-uuid"}';

SELECT COUNT(*) FROM service_tickets WHERE tenant_id = 'tenant-b-uuid';
-- Expected result: 0 (RLS memblokir cross-tenant access)

-- Pastikan semua tabel kritis punya RLS policy
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Verifikasi semua tabel ada RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relrowsecurity = FALSE;
-- Expected: empty (semua tabel harus row_security = ON)
```

---

## 10. Export & Kepatuhan (GDPR / UU PDP)

```
Data Export per Tenant (atas permintaan):
  SuperAdmin pilih tenant -> "Export Semua Data"
  System generate ZIP dengan file CSV:
    service_tickets.csv    | pos_transactions.csv
    customers.csv          | employees.csv
    accounting_journals.csv| audit_logs.csv
    inventory_movements.csv| wa_delivery_logs.csv

  Signed download URL: berlaku 1 jam
  Log: "DATA_EXPORT by superadmin [id] for tenant [name]"

Penghapusan Tenant (Right to Erasure):
  1. Konfirmasi bertingkat: klik "Hapus Permanen" -> ketik "HAPUS [nama-tenant]"
  2. System proses (async):
     a. Soft delete: UPDATE tenants {deleted_at: NOW()}
     b. Tunggu 7 hari grace period
     c. Hard delete semua tabel dengan tenant_id = targetId
     d. Hapus semua file di Supabase Storage: path/{tenantId}/
     e. Revoke semua Supabase Auth users dengan tenant_id = targetId
     f. Hapus schema tenant jika terpisah
  3. Log di platform-level audit (tidak di tenant log yang sudah dihapus)
  4. Konfirmasi via email ke owner: "Data Anda telah dihapus permanen"
```
