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

## Perbaikan Bootstrap Database Development — 22 Juli 2026
- Bootstrap tenant kini mewajibkan query tenant utama berhasil dan mengembalikan HTTP 404 bila tenant tidak ada, sehingga kegagalan koneksi atau query database tidak lagi tersamarkan sebagai data kosong; file terkait: `src/server/controllers/bootstrap.controller.ts`.

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
- Deep-link `/login` kini langsung menampilkan form login dan sinkron dengan tombol kembali browser; sebelumnya helper Playwright menunggu form yang tidak pernah muncul; file terkait: `src/components/LandingPage.tsx`, `tests/tenant-login-helper.ts`, `tests/new-login-helper.ts`.
- Audit owner memverifikasi dashboard, Servis, POS, dan Inventory tanpa error console/API.
- Status tenant owner dikoreksi dari `ACTIVE` menjadi `TRIAL` karena `trial_ends_at` masih aktif sampai 21 Juli 2027; Keuangan, CRM, dan HR kini terbuka sesuai aturan trial penuh.
- Bootstrap tenant tidak lagi mengirim `password_hash` pengguna ke browser; query user kini memakai whitelist kolom; file terkait: `src/server/controllers/bootstrap.controller.ts`.

## Audit Super Admin — 22 Juli 2026
- Endpoint monitoring platform dan bootstrap control-plane kini memerlukan autentikasi Super Admin; detail URL database, environment, memory, auth ID, dan permission user tidak dikirim ke client.
- Header `X-SuperAdmin-Session-Id` dan `X-Impersonation-Session-Id` ditambahkan ke CORS; permission role assignment diseragamkan menjadi `users:assign_role`.
- Konfigurasi tenant pada daftar/detail Super Admin memakai redaksi credential; perubahan status tenant mengembalikan kolom whitelist; pengukuran storage tercatat dalam audit event.
- UI role/permission menghormati mode read-only; fungsi pembayaran langsung yang sudah dinonaktifkan backend dihapus; perhitungan MRR memakai harga plan dari API.
- Seed permission Super Admin diperluas agar sesuai dengan permission route aktif.
- Verifikasi: `npm run lint` — PASS; `git diff --check` — PASS. Test Node langsung gagal karena import TypeScript `.js` belum ditranspilasi dan satu test lama mengharapkan implementasi provisioning yang sudah berubah; build produksi tidak dijalankan sesuai aturan proyek.

## Audit Alur Kerja Super Admin — 22 Juli 2026
- Aktivasi undangan kini menyimpan `password_hash`, menerapkan policy password server, dan tidak memberi permission wildcard otomatis; file terkait: `src/server/controllers/invitation.controller.ts`.
- Perubahan permission role menolak wildcard pada role non-root; penetapan `ROOT_ADMIN` hanya dapat dilakukan oleh `ROOT_ADMIN`; file terkait: `src/server/controllers/superadmin.controller.ts`.
- Pembuatan invoice dan cron billing diblokir saat konsol read-only pada UI dan handler; file terkait: `src/components/SaaSSubscription.tsx`, `src/hooks/useSaaSBilling.ts`.
- Custom domain tenant kini masuk payload konfigurasi; file terkait: `src/components/superadmin/InfrastructureConfigModal.tsx`.
- Restore snapshot lokal yang sebelumnya dapat memberi klaim sukses palsu dinonaktifkan sampai endpoint restore database transaksional tersedia; file terkait: `src/components/superadmin/AuditRecovery.tsx`.
- Migration `027_superadmin_audit_scope.sql` menyiapkan audit event platform tanpa tenant dan seed permission route aktif. Penerapan migration tertahan karena runner mendeteksi checksum `000_baseline.sql` telah berubah; checksum lama tidak diubah atau dilewati.
- Verifikasi akhir: `npm run validate` — PASS termasuk build produksi; `git diff --check` — PASS; `npm run test:unit` — 15/15 PASS. `npm run check:hardening` belum dapat dijalankan karena `scripts/validate-hardening.cjs` tidak tersedia di repository.

## Pemisahan Super Admin dan Owner — 22 Juli 2026
- Mobile bottom navigation tenant tidak lagi dirender pada control-plane Super Admin; file terkait: `src/App.tsx`.
- Tenant switcher global dihapus dari Topbar Super Admin; pemilihan tenant tetap dilakukan pada modul SaaS dan akses workspace tenant wajib melalui impersonasi; file terkait: `src/components/layout/Topbar.tsx`.
- Request `/api/superadmin/*` dan `/api/platform/*` tidak lagi menerima injeksi `tenant_id`, `branch_id`, atau header scope tenant; file terkait: `src/context/SaaSContext.tsx`.
- Platform bootstrap berhenti sebelum pipeline data tenant sehingga tidak membuat branch/gudang semu atau mengisi state operasional tenant pada control-plane; file terkait: `src/context/SaaSContext.tsx`.
- OWNER tidak lagi memakai permission default SUPER_ADMIN pada navigasi horizontal; izin berasal dari `rbacMatrix` tenant atau default OWNER; file terkait: `src/components/layout/HorizontalNavbar.tsx`.
- Dokumentasi role menyatakan SUPER_ADMIN sebagai role platform terpisah dan bukan bypass RBAC tenant; file terkait: `ROLE_MENU_MATRIX.md`.
- Verifikasi: `npm run lint` — PASS; `npm run test:unit` — 15/15 PASS; `git diff --check` — PASS.

## Refactor Impersonasi Super Admin — 22 Juli 2026
- Actor Super Admin tidak lagi diubah menjadi role OWNER saat impersonasi; sesi tenant disimpan terpisah dari profil actor.
- Bootstrap memilih control-plane atau tenant workspace berdasarkan sesi impersonasi valid, bukan role saja; state platform tidak membuat branch/gudang semu.
- Reload dengan sesi impersonasi valid tetap memakai bootstrap tenant dan header sesi; sesi read-only diblokir di client sebelum mutation, tetap diperiksa ulang server.
- Sidebar dan horizontal navigation menerima workspace mode sehingga role platform tidak mencampur menu tenant.
- Verifikasi: `npm run lint` — PASS; `npm run test:unit` — 15/15 PASS; `git diff --check` — PASS.

## Penyempurnaan Workflow Super Admin — 22 Juli 2026
- Impersonasi tidak lagi mengubah profil actor menjadi OWNER; actor tetap SUPER_ADMIN, sementara workspace tenant ditentukan sesi impersonasi valid.
- Bootstrap, routing, sidebar, horizontal navigation, dan API scope membedakan control-plane dari tenant workspace.
- Ditambahkan endpoint terproteksi `PUT /api/superadmin/tenants/:id/config` dengan whitelist payload, optimistic locking, redaksi state audit, dan permission `tenants:manage_config`; file terkait: `src/server/controllers/superadmin.controller.ts`, `src/server/routes/superadmin.routes.ts`, `migrations/028_superadmin_tenant_config.sql`.
- Manual payment review kini membutuhkan invoice berstatus `PENDING_VERIFICATION`, audit memakai tenant invoice yang benar, dan bukti file wajib tersedia sebelum submit.
- Verifikasi: `npm run lint` — PASS; `npm run test:unit` — 15/15 PASS; `git diff --check` — PASS.
- Batas tersisa: migration runner masih menolak checksum baseline lama yang drift; pemulihan memerlukan baseline historis/backup, bukan bypass metadata.

## Perbaikan Detail Billing Super Admin — 22 Juli 2026
- Tenant pilihan dropdown billing kini dikirim sebagai header authoritative dan tidak ditimpa context tenant lama; subscription, invoice, auto-renew, upload, serta submit pembayaran memakai tenant yang sama.
- Mutasi invoice, auto-renew, dan upload/submit manual oleh Super Admin kini mewajibkan console session EDIT di server.
- Upload QRIS dan bukti pembayaran memakai endpoint PUT terautentikasi dengan path server-generated, batas ukuran aktual, MIME whitelist, dan penyimpanan privat; bukti dilayani melalui endpoint terotorisasi, bukan URL `/uploads` publik.
- Konfigurasi pembayaran manual global hanya dapat diubah Super Admin; tenant tetap dapat membaca instruksi pembayaran.
- Plan update memvalidasi tier unik, harga positif, limits, dan features; invoice memvalidasi channel serta ketersediaan metode manual; webhook Midtrans hanya dapat menyelesaikan invoice yang memang terikat ke order Midtrans.
- Manual payment memvalidasi metode aktif, waktu bayar, panjang input, keberadaan bukti, status invoice, tenant audit, dan konsistensi review.
- Migration `029_billing_integrity.sql` menambahkan constraint amount/status/cycle/tier/date, gateway order unik, dan composite foreign key invoice–tenant.
- Console session lama diakhiri saat mengganti mode agar session EDIT tidak tetap aktif di belakang UI read-only.
- Verifikasi: `npm run lint` — PASS; `npm run test:unit` — 15/15 PASS; `git diff --check` — PASS.
- Batas yang belum boleh diklaim selesai: migration runner checksum baseline masih drift dan migration baru belum diterapkan; idempotency invoice/gateway serta audit before/after seluruh cron/config masih perlu implementasi lanjutan sebelum status billing dinyatakan sempurna.

## Rombak Billing Workflow — 22 Juli 2026
- Migration baseline kini immutable di `migrations/000_baseline.sql`; runner tidak lagi membaca `postgresql-schema.sql` mutable. Migration `005` dipulihkan ke checksum historis, delta dipindah ke `031_billing_invoice_gateway_columns.sql`.
- Ditambahkan request idempotency invoice, gateway event ledger, renewal linkage, notification dedupe, dan audit session linkage melalui `030_billing_workflow.sql`.
- Invoice creation memakai `Idempotency-Key`, UUID invoice, validasi channel/metode, dan menyimpan response replayable.
- Webhook Midtrans memakai event ledger idempotent, validasi gateway order, amount, dan mencegah overwrite manual verification.
- Plan, gateway flags, manual method, paidAt, input text, proof file, dan invoice lifecycle mendapat validasi server.
- Billing audit mencatat perubahan plan dan gateway tanpa menyimpan server key.
- Test billing/security dijalankan dengan runner benar: 9/9 PASS; unit test 15/15 PASS; lint dan diff check PASS.
- Residual yang harus tetap diuji di staging: external Midtrans reconciliation, upload MIME magic-byte inspection, notification worker delivery, dan migration `029–031` pada production backup sebelum rollout.

## Perbaikan HTTP 403 Riwayat Billing — 22 Juli 2026
- `GET /api/billing/subscription` kini memakai scope control-plane granular untuk Super Admin dan tenant scope biasa untuk OWNER/ADMIN; pemilihan tenant billing tidak lagi membutuhkan impersonasi.
- Permission `billing:view_subscription`, `billing:manage_invoices`, dan `billing:manage_subscription` ditambahkan untuk ROOT_ADMIN dan BILLING_ADMIN melalui migration `032_billing_control_plane_permissions.sql`.
- Verifikasi: migration 032 PASS; billing tests 5/5 PASS; unit test 15/15 PASS; lint PASS.

## Pendalaman Billing Control Plane — 22 Juli 2026
- Middleware platform scope kini tetap memeriksa permission sebelum melewati tenant lookup; tidak ada bypass permission karena tenantId kosong.
- Idempotency invoice menangani request `FAILED` agar retry aman, menandai kegagalan reservation, dan memakai UUID invoice.
- Webhook Midtrans menyimpan ledger event, mendeteksi payload berbeda untuk event key sama, replay aman, dan menolak settlement atas invoice manual atau invoice manual-verification.
- Audit platform ditambahkan untuk plan, gateway, manual config, QRIS allocation, manual approval/rejection; secret gateway tidak masuk state audit.
- Notification billing memakai event key dedupe; overdue memilih nomor WhatsApp bila tersedia dan fallback email; payment confirmation menolak invoice belum PAID.
- Proof URL memakai endpoint terotorisasi; upload bukti dan QRIS memakai raw PUT endpoint server, bukan static public upload.
- Verifikasi terbaru: billing/security 9/9 PASS; unit 15/15 PASS; lint PASS; migration 000–032 development PASS.
- Residual eksplisit: external Midtrans reconciliation nyata, magic-byte file inspection, worker delivery staging, dan production migration rollout belum diverifikasi; status “sempurna” belum diklaim.

## Rombak UI Billing Control Plane — 22 Juli 2026
- Billing memiliki hero control-plane, metrik operasional, dan navigasi anchor Ringkasan/Paket/Invoice/Verifikasi/Konfigurasi.
- Tenant selector, invoice history, review queue, serta konfigurasi diberi struktur section dan scroll target yang jelas.
- Review queue selalu terlihat dengan empty state; bukti pembayaran dibuka melalui authenticated blob URL, bukan URL privat tanpa token.
- Plan editor diblokir saat read-only atau memakai fallback plans; gateway form diblokir saat read-only; tombol save mengikuti state server.
- Verifikasi UI: lint PASS, unit 15/15 PASS, billing tests 5/5 PASS, diff check PASS.

## Penyederhanaan UI Billing — 22 Juli 2026
- Halaman billing kini memakai tiga tampilan sederhana: `Ringkasan`, `Tagihan`, dan `Pengaturan`.
- Ringkasan fokus pada tenant context, status, paket, dan metrik penting.
- Tagihan fokus pada invoice dan antrean verifikasi.
- Pengaturan memuat plan, gateway, pembayaran manual, dan recurring tanpa menumpuk di layar utama.
- Empty state antrean dan error/status tetap terlihat; layout responsive dan dark mode dipertahankan.
- Verifikasi: lint PASS, unit 15/15 PASS, billing tests 5/5 PASS.

## Audit Pengaturan Billing — 22 Juli 2026
- Recurring memakai `period_end` dan menyimpan `renewed_from_invoice_id`, sehingga invoice renewal tidak dibuat tiga hari setelah pembayaran atau berulang tiap hari.
- Update gateway tidak lagi menyalin fallback secret environment ke database; semua field gateway divalidasi tipe dan runtime fallback tetap mendukung rotasi environment.
- Manual config mewajibkan boolean asli, path QRIS valid, file tersedia, serta magic-byte PNG/JPEG sesuai MIME.
- Billing plan wajib memuat BASIC/PRO/ENTERPRISE lengkap dengan batas nama, fitur, dan entitlements.
- Plan, manual config, dan gateway memakai fieldset disabled nyata pada read-only; keyboard tidak dapat mengubah draft palsu.
- Konfigurasi global tetap dapat dibuka tanpa tenant; cron action hanya tampil untuk Super Admin.
- Verifikasi: lint PASS, unit 15/15 PASS, billing tests 5/5 PASS.

## Status
Database lokal berhasil dimigrasikan: 33 migration termasuk immutable baseline. Migrasi idempoten dan schema auth terverifikasi.