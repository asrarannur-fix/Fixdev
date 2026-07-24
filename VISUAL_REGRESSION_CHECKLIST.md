# Visual Regression Checklist

Cek regresi visual sebelum rilis. Fokus pada konsistensi UI lintas modul.

## Setup
- Baseline screenshot di `e2e-screenshots/` (jalankan E2E sekali untuk seed baseline).
- Bandingkan terhadap baseline di resolusi 1280×720 (default Playwright).

## Yang Diperiksa
- [ ] **Sidebar & Navbar** — ikon, label, warna `iconColor` tiap modul sesuai `nav.config.ts`.
- [ ] **Layout receipt/print** — slip servis, struk POS, PO, garansi konsisten (lihat integrasi `printConfig`).
- [ ] **Tema dark/light** — `dark:` variant konsisten, tidak ada teks tak terbaca.
- [ ] **Responsif** — tabel & grid tidak overflow di <= 390px (mobile).
- [ ] **Empty states** — pesan kosong (mis. "Ketik pesan...") tampil benar.
- [ ] **Modal & drawer** — backdrop, animasi `fadeIn`/`scaleUp` halus.
- [ ] **Warna brand** — `branding.primaryColor` teraplikasi di header/akses.
- [ ] **White-label tenant** — login, sidebar, portal pelanggan, WhatsApp/Telegram, email, invoice, struk, PO, rental, garansi, QR, title, dan favicon memakai nama/logo tenant tanpa fallback vendor.
- [ ] **Pergantian tenant** — title, favicon, font, dan variabel warna reset saat tenant berganti atau logout.

## Aturan
- Jangan ubah `tailwindcss` config tanpa review (dampak global).
- Perubahan CSS komponen harus diuji di >= 2 modul terdampak.
- Screenshot diferensial > 2% → investigasi sebelum merge.

## Tools
- Playwright `test:browser` (capture di `e2e-screenshots`).
- Bandingkan manual atau via GitHub Actions artifact bila ada.

## Catatan Perubahan Landing Page
- Landing page diarahkan untuk konversi penyewa dengan hero bisnis, mockup dashboard orisinal, alur kerja, CTA, dan tampilan premium.

## Catatan Perubahan Tata Letak (Layout) (2026-07-24)
- Spacer sidebar diperbaiki dari `w-[84px]` menjadi `w-[64px]` agar sesuai lebar sidebar collapsed.
- Canvas utama dibatasi `max-w-7xl mx-auto` agar konten tidak terlalu meregang di layar lebar.
- `TenantDashboard` dihapus `min-h-screen bg-slate-50 dark:bg-zinc-900` (redundan dengan induk).
- CSS hack `#dynamic-subtab-selector` dengan negative `margin-top` dihapus; layout spacing sekarang mengandalkan struktur container yang benar.
- Modul kini menampilkan subfitur nyata Servis, POS, Inventory, Keuangan, HR, CRM, keamanan, WhatsApp, workflow, dan integrasi.
- Paket dan harga dimuat dinamis dari endpoint `/api/billing/plans`; tidak ada hardcode paket di komponen.
- Ditambahkan bagian testimoni pengguna bergaya lokal Makassar tanpa gambar atau aset eksternal.
- File terkait: `src/components/LandingPage.tsx`.

## Catatan Perbaikan Responsif
- Tinggi panel tetap disesuaikan untuk viewport kecil, modal memakai batas viewport aman dan overflow vertikal, serta Kanban B2B memakai kolom geser dengan snap pada mobile.
- Tabel akuntansi, matriks hak akses, dan transfer inventaris kini dapat digeser horizontal; grafik, panel teknisi, GPS, portal pelanggan, dan target sentuh disesuaikan untuk layar kecil.
- File terkait: `src/components/B2BPipeline.tsx`, `src/components/CustomerPortal.tsx`, `src/components/TechnicianOverview.tsx`, `src/components/FieldServiceGps.tsx`, `src/components/superadmin/RolePermissionMatrix.tsx`, `src/components/tenant/accounting/ChartOfAccounts.tsx`, `src/components/tenant/accounting/FinancialStatements.tsx`, `src/components/tenant/InventoryTransferPanel.tsx`, dan `src/components/tenant/inventory/TransferPanel.tsx`.
