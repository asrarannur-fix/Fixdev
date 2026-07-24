# Changelog

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
- **Tombol beli langsung saat trial**: `SaaSSubscription.tsx` menampilkan label "Langganan Sekarang" (bukan "Upgrade") pada semua kartu paket saat `status=TRIAL`, dan tombol tidak terkunci — penyewa bisa langsung berlangganan paket berbayar dari layar trial.
- **Downgrade otomatis pasca-trial**: `simulateTrialExpiryCron` kini mengubah `status=EXPIRED` **dan** `tier=BASIC` saat `trial_ends_at` lewat. Alur: TRIAL (Enterprise, full fitur 14 hari) → cron → EXPIRED+BASIC (fitur turun ke dasar).
- **API subscription**: `GET /api/billing/subscription` mengembalikan `tier`, `trialEndsAt`, `isTrial`, `canUpgradeNow`, `subscriptionStatus` (TRIALING saat trial).
- **Backend feature gate**: middleware `requireFeature` menolak API HR/CRM/Accounting dengan 403 `FEATURE_LOCKED` untuk tenant yang tidak berlangganan paket terkait.
- File terkait: `src/server/controllers/superadmin.controller.ts`, `src/server/controllers/billing.controller.ts`, `src/components/SaaSSubscription.tsx`, `src/middleware/auth.middleware.ts`, `src/server/routes/accounting.routes.ts`, `src/server/routes/apiV1.routes.ts`.
- Verifikasi: prod `getSubscription` tenant trial → `tier: ENTERPRISE, isTrial: true, canUpgradeNow: true`; tenant BASIC → 403 di `/api/accounting`; E2E Services+Inventory 2/2 PASS; lint bersih; build sukses.

## 2026-07-23
- Initial system state.
