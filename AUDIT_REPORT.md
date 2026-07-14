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

## Status
Build produksi aktif lokal pada port 3000 dengan `NODE_ENV=production`. Domain publik merender bundle produksi.