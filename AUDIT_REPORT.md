# AUDIT RELEASE — FixFlow ERP
## 16 Juli 2026

## Cakupan
- Auth, RBAC, tenant/branch isolation
- Service reception dan lifecycle tiket
- POS, shift, stok, void/refund, jurnal COGS
- Akuntansi: COA, jurnal, kas, neraca saldo, laba-rugi
- Billing, HR, CRM, inventory, superadmin
- Frontend, navigation, error boundary, production bundle
- API, security hardening, database migrations, browser smoke

## Temuan diperbaiki
1. Route mount service/POS/accounting/micro-component memakai tenant scope.
2. Endpoint `/api/accounting/cash` tidak lagi `501`; memakai `createCashTransaction` atomik.
3. Void POS mengembalikan stok ke gudang asal transaksi, bukan gudang cabang aktif saat ini.
4. Laporan neraca saldo dan laba-rugi hanya menghitung jurnal `is_posted = TRUE` serta tenant yang sama.
5. POS memakai pengurangan stok kondisional atomik dan mencatat stock movement.
6. Native alert pada akuntansi dan operasi diganti toast aplikasi.
7. Smoke POS diperbarui agar memverifikasi backend aktual, bukan implementasi client lama.
8. Runner test diperbaiki lintas OS: Linux memakai `npm`/`npx` + `fuser`; Windows tetap memakai `.cmd` + `taskkill`.

## Bukti verifikasi
- `npm run lint` — PASS
- `npm run build` — PASS
- `npm run test:unit` — 4/4 PASS
- `node scripts/comprehensive-api-test.cjs` — 6/6 PASS
- `node scripts/e2e-smoke.cjs` — 35/35 PASS
- `node scripts/frontend-smoke.cjs` — PASS
- `node scripts/validate-hardening.cjs` — PASS
- Playwright landing/dashboard/workflow — 7/7 PASS
- HTTPS `https://fixdev.web.id/` — landing, portal login, bundle production diverifikasi; tanpa `@vite/client`.

## Batas verifikasi
Tiga spec lama gagal sebelum alur modul karena memakai password test kosong dan pola mock Supabase/localStorage yang ditolak oleh auth produksi. Ini bukan crash aplikasi; test tersebut harus memakai kredensial test valid atau token test terbitan Supabase. Tidak ada password digunakan atau disimpan dalam audit ini.

## Perbaikan Login — 21 Juli 2026
- Secret JWT penerbit dan validator kini memakai `JWT_SECRET` yang sama tanpa fallback statis; file terkait: `src/server/controllers/auth.controller.ts`, `src/middleware/auth.middleware.ts`.
- Token invalid atau kedaluwarsa kini menghasilkan HTTP 401, sedangkan konfigurasi secret yang hilang menghasilkan HTTP 503; file terkait: `src/middleware/auth.middleware.ts`.
- Pemulihan sesi tidak lagi mempercayai cache autentikasi tanpa token, logout selalu menghapus `fixdev_token`, dan profil gagal membersihkan token invalid; file terkait: `src/context/SaaSContext.tsx`, `src/utils/supabaseUtils.ts`.

## Perbaikan Database Lokal — 21 Juli 2026
- Baseline database dipindah ke `postgresql-schema.sql`; dependency `auth.uid()` dan RLS Supabase dihapus.
- Migration runner menjalankan baseline `000_baseline.sql` secara idempoten sebelum seluruh migration bernomor.
- Kolom auth lokal `password_hash`, `superadmin_role`, dan `users.tenant_id` nullable ditambahkan melalui migration 025.
- Endpoint database memakai `DATABASE_URL`; file controller menjadi `src/server/controllers/database.controller.ts`.
- Semua migration berjalan dengan transaksi runner; boundary `BEGIN`/`COMMIT` internal dihapus.

## Hardening Login — 22 Juli 2026
- Endpoint login memakai rate limit khusus 15 percobaan per 15 menit; file terkait: `server.ts`.
- Endpoint register publik yang menerima role dan tenant bebas dihapus; pendaftaran hanya melalui onboarding tenant.
- Tier onboarding ditentukan server sebagai `BASIC`, bukan input browser; file terkait: `src/server/controllers/auth.controller.ts`, `src/components/LoginPage.tsx`.
- Akun dengan MFA aktif tidak lagi menerima JWT tanpa verifikasi faktor kedua.
- Detail error internal login, profil, dan reset admin tidak lagi dikirim ke client.
- UI lupa password yang memanggil endpoint tidak tersedia dihapus sampai alur token reset aman tersedia.

## Audit Owner dan Hardening Auth — 22 Juli 2026
- Password akun production dihapus dari test Playwright; test login kini membaca `TEST_TENANT_EMAIL` dan `TEST_TENANT_PASSWORD` dari environment. Password yang pernah tersimpan wajib dirotasi; file terkait: `tests/prod-login.spec.ts`, `tests/tenant-login-helper.ts`, `tests/new-login-helper.ts`.
- Operasi admin kini gagal tertutup saat `ADMIN_TOKEN` tidak dikonfigurasi; fallback token statis dihapus; file terkait: `src/middleware/auth.middleware.ts`.
- Perubahan password profil kini memverifikasi password lama dan memakai endpoint backend yang tersedia; file terkait: `server.ts`, `src/server/controllers/auth.controller.ts`, `src/context/SaaSContext.tsx`.
- Upgrade dan perpanjangan trial dibatasi ke role OWNER/ADMIN, memakai transaksi database nyata, serta memvalidasi tier, siklus billing, dan jumlah hari; file terkait: `server.ts`, `src/server/controllers/auth.controller.ts`.
- Error onboarding tidak lagi membocorkan detail database. Contoh environment kini mendokumentasikan `JWT_SECRET` dan memakai mode development untuk `npm run dev`; file terkait: `src/server/controllers/auth.controller.ts`, `.env.example`.
- Login production owner kembali berfungsi setelah PM2 diarahkan dari path lama `/home/ubuntu/barufix` ke workspace aktif `/home/ubuntu/fixdev`; health, login, dan profil OWNER terverifikasi HTTP 200; file terkait: `ecosystem.config.cjs`.

## Status
Database lokal berhasil dimigrasikan: 26 migration termasuk baseline. Migrasi idempoten dan schema auth terverifikasi.