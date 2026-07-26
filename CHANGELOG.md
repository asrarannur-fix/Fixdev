# Changelog

## 2026-07-26
### Billing Manual — konfirmasi tenant dan approval Telegram
- Tenant kini melihat alur pembayaran manual, nominal wajib, tombol `Saya Sudah Bayar, Kirim Konfirmasi`, status menunggu admin, alasan penolakan, serta kirim bukti baru.
- Superadmin dapat mengonfigurasi bot Telegram pada Billing, menerima alert tenant baru dan pembayaran manual, lalu memakai perintah status, tenant, paket, invoice, dan pembayaran pending.
- Approval dari Telegram memvalidasi webhook secret, Telegram user ID, role `SUPER_ADMIN`, dan versi pengajuan sebelum melunasi invoice.
- File terkait: `src/components/SaaSSubscription.tsx`, `src/components/superadmin/TelegramPaymentConfig.tsx`, `src/server/controllers/telegram.controller.ts`, `src/server/controllers/manualPayment.controller.ts`, `docs/TELEGRAM_MANUAL_PAYMENT_APPROVAL.md`.

## 2026-07-26
### Data Manager – Full Production Ready Implementation
- Added Supplier resource (CRUD, read-only toggle, batch import).
- Enhanced CrudManager with export CSV (server-side pagination), read-only support, and action column toggle.
- Updated Data Explorer to use CrudManager with dynamic readOnly flag.
- Added DataImporter batch import flow for Supplier via `/crud/suppliers/batch`.
- Added unique indexes on `products(tenant_id, sku)` and `coa_accounts(tenant_id, code)` via migration `052_data_manager_integrity.sql`.
- Added RBAC permission guards: `data:read` / `data:write` with fallback to legacy per-module permissions.
- Added Playwright E2E test `tests/data-manager.spec.ts` verifying login, navigation, and Supplier creation via batch API.
- Updated CHANGELOG.md with detailed release notes.
- All unit tests pass; lint 0 errors (only pre-existing warnings remain).

## 2026-07-25
### Data Manager — integritas, ekspor, dan import atomik
- Menambahkan migration idempoten untuk indeks unik tenant+SKU dan tenant+kode COA.
- Ekspor Data Manager kini mengambil seluruh halaman hasil filter dari API.
- Import Supplier memakai endpoint batch atomik; satu baris gagal membatalkan seluruh batch.
- Tiket servis ditetapkan read-only di Data Manager agar perubahan lewat workflow servis.
- Menambah test konfigurasi resource Data Manager.
- File terkait: `migrations/052_data_manager_integrity.sql`, `src/server/plugins/crudPlugin.ts`, `src/components/CrudManager.tsx`, `src/components/DataImporter.tsx`, `src/components/tenant/DataExplorer.tsx`.

### Data Manager — kelengkapan resource dan kontrol data
- Menambahkan resource Supplier ke Data Manager dan CRUD whitelist backend.
- Menambahkan ekspor CSV dari tabel Data Manager.
- Menambahkan import CSV Supplier lewat `DataImporter`.
- Menambahkan izin CRUD per aksi: `data:read`/`data:write` atau `<resource>:read`/`<resource>:write`.
- Menambahkan validasi nama wajib, angka non-negatif, serta cek unik SKU dan kode COA pada API CRUD.
- Memindahkan pagination, filter, dan sorting Data Manager ke API sehingga data tidak lagi dibatasi 200 baris pada browser.
- Menjadikan jurnal dan shift POS read-only agar perubahan memakai workflow akuntansi/POS.
- File terkait: `src/components/tenant/DataExplorer.tsx`, `src/components/CrudManager.tsx`, `src/components/ui/DataTable.tsx`, `src/components/DataImporter.tsx`, `src/server/plugins/crudPlugin.ts`, `src/config/nav.config.ts`, `tests/data-manager.test.ts`.

### Rental Module — perbaikan kritis sinkronisasi DB, API, dan frontend
- **Fix nama kolom DB vs Controller**: Semua query SQL di `rental.controller.ts` disesuaikan dengan schema migration: `daily_rate` → `rate_per_day`, `total_rent` → `total_rent_amount`, `damage_deduction` → `damage_deduction_amount`, `received_by` → `recorded_by`, `inspected_by` → `inspector_id`.
- **Tambah kolom `deposit_paid`**: Migration `050_rental_module.sql` ditambah kolom `deposit_paid INTEGER DEFAULT 0` pada tabel `rental_contracts` untuk melacak progress pembayaran deposit.
- **Fix contract status awal**: Kontrak baru dibuat dengan status `ACTIVE` (sebelumnya `DRAFT` yang tidak memiliki flow aktivasi).
- **Fix API hook field names**: Interface `CreateContractInput` diubah ke camelCase (`customerId`, `deviceId`, `endDate`) sesuai Zod schema server. `ReturnContractInput` dan `ExtendContractInput` juga disesuaikan.
- **Fix query params API hook**: `listCatalog` kirim `activeOnly` (bukan `active`), `listDevices` kirim `catalogId` (bukan `catalog_id`), `listContracts` kirim `startDate`/`endDate` (bukan `from_date`/`to_date`).
- **Fix frontend customer lookup**: `handleCreateRental` sekarang mencari `customerId` dari `tenantCustomers` berdasarkan nama (sebelumnya mengirim string kosong yang pasti gagal validasi UUID server).
- **Fix frontend field name access**: Semua akses properti contract disesuaikan: `total_rent` → `total_rent_amount`, `daily_rate` → `rate_per_day`, `damage_deduction` → `damage_deduction_amount`.
- **Fix inspection schema**: `createInspection` di frontend sekarang kirim `contractId`, `inspectionType`, `conditionBefore` (sesuai Zod schema server, bukan `condition_rating`/`checklist_items` yang tidak ada).
- **Fix interface types**: `RentalCatalogItem`, `RentalDevice`, `RentalContract`, `RentalPayment`, `RentalInspection`, `OverdueContract` disesuaikan dengan nama kolom DB yang benar.
- File terkait: `migrations/050_rental_module.sql`, `src/server/controllers/rental.controller.ts`, `src/hooks/useRentalApi.ts`, `src/components/DeviceRentalDashboard.tsx`.
- Verifikasi: lint 0 error, tsc clean.

## 2026-07-25
### POS Module — refactor, unifikasi logika, dan perbaikan kritis
- **Hapus duplikat logika API v1 `createSale`**: API v1 (`/api/v1/sales`) sekarang delegasi ke shared `processPOSTransaction` dari `pos.controller.ts`. Sebelumnya punya logika terpisah tanpa advisory lock, jurnal akuntansi, stock movement log, atau oversell guard SQL.
- **Unifikasi format invoice**: API v1 sekarang menghasilkan `INV/POS/YYYY/NNNNN` (sama dengan internal), bukan `INV-{year}{timestamp}{random}` yang berbeda.
- **Validasi split payment di server**: `processPOSTransaction` mengecek apakah total split payments sesuai grand total (toleransi Rp1). Jika tidak cocok, lempar error 422.
- **`posted_to_ledger` diupdate setelah jurnal dibuat**: Flag `posted_to_ledger` pada `pos_transactions` sekarang diupdate ke `TRUE` setelah jurnal berhasil dibuat (sebelumnya selalu `FALSE`).
- **TEMPO payment → Piutang**: Jurnal POS sekarang menggunakan `paymentDebitAccountCode()` dari `coa.ts`. TEMPO didebit ke akun `10300` (Piutang Pelanggan), bukan `10100` (Kas). Reversal void juga mengkredit akun yang benar.
- **Pagination di `getSales`**: Kedua endpoint (internal `/api/pos/sales` dan API v1 `/api/v1/sales`) mendukung query `?page=&limit=` (default 50, max 200). Response menyertakan `meta.total`, `meta.page`, `meta.totalPages`.
- **Fix kolom `timestamp` → `created_at`**: API v1 sebelumnya merujuk kolom `timestamp` yang tidak ada di tabel `pos_transactions`; sekarang pakai `created_at` yang benar.
- **API v1 pakai Zod schema POS**: Route `/api/v1/sales` POST sekarang validasi pakai `posSaleSchema` dari `pos.controller.ts`, konsisten dengan internal.
- File terkait: `src/server/controllers/pos.controller.ts`, `src/server/controllers/apiV1.controller.ts`, `src/server/routes/apiV1.routes.ts`.
- Verifikasi: lint 0 error, tsc clean, 23 unit tests pass.

## 2026-07-24
### Billing & Trial — perbaikan lifecycle dan visual paket tertinggi saat trial
- **Tampilan paket tertinggi saat trial**: `registerTenant` membuat tenant dengan `tier=ENTERPRISE` + `status=TRIAL` (sebelumnya diturunkan ke BASIC saat registrasi). Penyewa selama masa trial kini terlihat menggunakan **paket tertinggi (Enterprise)**, bukan Basic.
- **Tombol beli langsung saat trial**: `SaaSSubscription.tsx` menampilkan label "Langganan Sekarang" (bukan "Upgrade") pada semua kartu paket saat `status=TRIAL`, dan tombol tidak terkunci — penyewa bisa langsung berlangganan paket berbayar dari layar trial.
- **Downgrade otomatis pasca-trial**: `simulateTrialExpiryCron` kini mengubah `status=EXPIRED` **dan** `tier=BASIC` saat `trial_ends_at` lewat. Alur: TRIAL (Enterprise, full fitur 14 hari) → cron → EXPIRED+BASIC (fitur turun ke dasar).
- **API subscription**: `GET /api/billing/subscription` mengembalikan `tier`, `trialEndsAt`, `isTrial`, `canUpgradeNow`, `subscriptionStatus` (TRIALING saat trial).
- **Backend feature gate**: middleware `requireFeature` menolak API HR/CRM/Accounting dengan 403 `FEATURE_LOCKED` untuk tenant yang tidak berlangganan paket terkait.
- File terkait: `src/server/controllers/superadmin.controller.ts`, `src/server/controllers/billing.controller.ts`, `src/components/SaaSSubscription.tsx`, `src/middleware/auth.middleware.ts`, `src/server/routes/accounting.routes.ts`, `src/server/routes/apiV1.routes.ts`.
- Verifikasi: prod `getSubscription` tenant trial → `tier: ENTERPRISE, isTrial: true, canUpgradeNow: true`; tenant BASIC → 403 di `/api/accounting`; E2E Services+Inventory 2/2 PASS; lint bersih; build sukses.

### Layout — perbaikan tata letak halaman
- **Spacer sidebar diperbaiki**: lebar spacer `w-[84px]` diganti `w-[64px]` agar sesuai dengan sidebar collapsed (`lg:w-[64px]`) di `src/App.tsx`.
- **Konten utama dibatasi max-width**: wrapper `max-w-7xl mx-auto` ditambahkan pada canvas area (`#canvas-main-area`) di `src/App.tsx` agar konten tidak terlalu meregang di layar lebar.
- **TenantDashboard dihilangkan background redundan**: `min-h-screen bg-slate-50 dark:bg-zinc-900` dihapus dari `src/components/TenantDashboard.tsx` karena background sudah diwarisi dari container induk.
- **CSS hack margin-top dihapus**: aturan `#dynamic-subtab-selector` dengan `margin-top: -12px` (dan override mobile `margin-top: -6px`) dihapus dari `src/index.css` karena merupakan layout hack yang tidak lagi diperlukan setelah perbaikan spacing upstream.

### Dev Tooling — CI/CD, env validation, logging, linting
- **CI workflow**: `.github/workflows/ci.yml` ditambahkan untuk pipeline otomatis (lint → unit test → security test → build → e2e) pada setiap push/PR ke `main`.
- **Runtime env validation**: `src/lib/envSchema.ts` menambahkan validasi Zod pada `.env` saat server startup; server keluar dengan error jika variabel lingkungan tidak valid atau hilang.
- **Structured request logging**: middleware logging baru di `server.ts` mencatat setiap request (method, path, status, durationMs, ip, userAgent) ke structured logger pino.
- **ESLint + Prettier + husky + lint-staged**: konfigurasi dev tooling lengkap dengan pre-commit hook yang menjalankan ESLint fix + Prettier format secara otomatis.

## 2026-07-23
- Initial system state.
