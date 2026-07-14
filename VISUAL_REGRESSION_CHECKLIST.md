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
