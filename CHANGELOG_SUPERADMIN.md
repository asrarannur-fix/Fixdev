# Log Perubahan Super Admin

## 2026-07-23 - Perbaikan Alur Registrasi Tenant + Testing Komprehensif

### Ringkasan
- Menyederhanakan form registrasi tenant dari multi-step wizard menjadi form tunggal
- Menghapus input subdomain manual dari UI (backend auto-generate dari nama tenant)
- Membersihkan kode terkait subdomain dari komponen terkait
- Membuat pengujian komprehensif (Playwright e2e + API)

### Detail Perubahan

#### Frontend - TenantsManager.tsx
- **Form Sederhana**: Mengganti form 6-langkah dengan satu form ringkas (Nama Bisnis, Owner, Email, Paket)
- **Hapus Subdomain**: Input subdomain manual dan pengecekan ketersediaan dihapus
- **Hapus State**: `newSubdomain`, `registrationStep`, `availability`, `registrationKey` dihapus
- **Validasi**: Input `required` dihapus (mengandalkan validasi custom `handleRegister`)
- **Button Submit**: Sekarang selalu terlihat, dengan teks "Daftarkan Tenant" / "Mendaftarkan..."

#### Frontend - SuperAdminDashboard.tsx
- Hapus prop `setConfigSubdomain` dari `TenantsManager` dan `InfrastructureConfigModal`

#### Frontend - InfrastructureConfigModal.tsx
- Hapus input subdomain dari modal konfigurasi infrastruktur

#### Backend - superadmin.controller.ts
- `registerTenant` auto-generate subdomain: `nama-tenant-uuid8karakter`
- Hapus validasi subdomain manual
- Hapus logika idempotensi replay (server selalu generate key baru)

#### Server - server.ts
- Login rate limit dibuat konfigurabel via `LOGIN_RATE_LIMIT_MAX` env

### Pengujian

Semua pengujian lulus:

| Jenis | Jumlah | Status |
|-------|--------|--------|
| Unit test (vitest) | 18 | ✅ Lulus |
| Security test | 10 | ✅ Lulus |
| TypeScript (lint) | - | ✅ Bersih |
| Build (vite + esbuild) | - | ✅ Sukses |
| **Playwright UI + API** | **7** | **✅ Lulus** |

#### Test Playwright Baru (`tests/superadmin-registration.spec.ts`)

**UI Tests (3):**
1. ✅ Menampilkan form registrasi yang sudah disederhanakan (tanpa multi-step, tanpa subdomain)
2. ✅ Validasi field kosong menampilkan toast error
3. ✅ Registrasi tenant sukses melalui UI + verifikasi subdomain auto-generated

**API Tests (4):**
4. ✅ Registrasi via API dengan subdomain auto-generated (format: `nama-uuid8karakter`)
5. ✅ Validasi field kosong via API (422)
6. ✅ Auth required (401 tanpa token)
7. ✅ Tenant muncul di daftar setelah registrasi

#### Helper Baru (`tests/superadmin-jwt-login-helper.ts`)
Login helper yang menggunakan Express JWT auth (`POST /api/auth/login`), bukan Supabase. Menginjeksi session ke localStorage via `addInitScript`.

### Catatan
- `LOGIN_RATE_LIMIT_MAX=200` ditambahkan ke `.env` dan `server.ts` untuk development
- Login rate limit default: 15 request per 15 menit (dapat di-override via env)

## 2026-07-23 - Peningkatan Alur SaaS Langganan, Billing & Super Admin Control Plane

### Ringkasan
- Peningkatan logika billing, pro-rata, dan trial bagi penyewa.
- Penambahan dashboard analitik superadmin dan kontrol langganan superadmin.
- Peningkatan test kestabilan manual payment superadmin.

### Detail Perubahan

#### Backend - billing.controller.ts
- **Logika Pro-rata**: `createInvoice` kini menghitung sisa kredit pro-rata dari paket aktif saat tenant melakukan upgrade/downgrade dan menguranginya langsung dari nominal invoice baru.
- **Bypass Trial**: Deteksi otomatis status `TRIAL`. Jika tenant masih dalam masa trial, mereka tidak mendapatkan potongan pro-rata dan diizinkan membeli paket baru, menyelesaikan isu "bisa dibeli selama trial".
- **Bugs SQL Fix**: Menghapus `AND status_category IS NULL` yang salah di query `saas_invoices` (tidak ada kolom `status_category` di tabel tersebut).
- **Notifikasi Auto-Renew & Expiry**: `due_reminder` dan `payment_confirmed` diintegrasikan untuk dikirimkan melalui channel prioritas WhatsApp jika nomor terdaftar, atau email sebagai fallback.

#### Backend - superadmin.controller.ts
- **Dashboard Overview Analitik**: `getOverview` ditingkatkan untuk mencakup analitik MRR/ARR, jumlah tenant baru bulanan, invoice terbayar bulanan, dan ARPU (Average Revenue Per User) untuk memantau pendapatan riil.
- **Kontrol Langganan Paksa**: Endpoint `terminateSubscription` ditambahkan untuk memblokir tenant (status `SUSPENDED`) secara paksa atas dasar billing.
- **Bonus Masa Aktif**: Endpoint `extendSubscription` ditambahkan untuk memperpanjang durasi paket aktif tenant secara manual (menambahkan hari).

#### Backend - bootstrap.controller.ts
- **Platform Bootstrap Structure**: `platformBootstrapHandler` kini selalu mengembalikan properti array kosong untuk keys yang tidak dimiliki data global platform namun diandalkan oleh visual/state React di frontend (`userBranches`, `branches`, dll) guna menghindari crash rendering ketika superadmin membuka workspace.

#### Frontend - SaaSSubscription.tsx & SaaSContext.tsx
- Integrasi parameter status `paidAt`, `periodStart`, dan `periodEnd` untuk transparansi billing serta sisa kapasitas user, cabang, dan storage secara real-time.

#### Pengujian - tests/superadmin-manual-payment.spec.ts
- Menulis ulang pengujian manual payment superadmin untuk menggunakan `setupSuperadminSession` berbasis local JWT token.
- Menginjeksi mock terpisah untuk domain lokal dan `https://fixdev.web.id` untuk mencegah kegagalan otentikasi 403 / redirect tak terduga.
- Menempatkan inisialisasi routing mock Playwright sebelum navigasi untuk menghindari initial bootstrap crash.
