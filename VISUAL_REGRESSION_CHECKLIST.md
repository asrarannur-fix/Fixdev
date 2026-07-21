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

## Aturan
- Jangan ubah `tailwindcss` config tanpa review (dampak global).
- Perubahan CSS komponen harus diuji di >= 2 modul terdampak.
- Screenshot diferensial > 2% → investigasi sebelum merge.

## Tools
- Playwright `test:browser` (capture di `e2e-screenshots`).
- Bandingkan manual atau via GitHub Actions artifact bila ada.

## Catatan Perubahan Landing Page
- Landing page diarahkan untuk konversi penyewa dengan hero bisnis, mockup dashboard orisinal, alur kerja, CTA, dan tampilan premium.
- Modul kini menampilkan subfitur nyata Servis, POS, Inventory, Keuangan, HR, CRM, keamanan, WhatsApp, workflow, dan integrasi.
- Paket dan harga dimuat dinamis dari endpoint `/api/billing/plans`; tidak ada hardcode paket di komponen.
- Ditambahkan bagian testimoni pengguna bergaya lokal Makassar tanpa gambar atau aset eksternal.
- File terkait: `src/components/LandingPage.tsx`.
