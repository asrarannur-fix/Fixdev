# Mobile PWA Rules

Panduan Progressive Web App. **Status:** scaffolding PWA (`manifest.json`, service worker) **belum ditemukan** di folder `public/` — aturan di bawah adalah target implementasi, bukan perilaku aktif saat ini.

## Target
- App harus dapat diinstal (installable) di homescreen mobile (Android/iOS).
- Berfungsi **offline-first** untuk data yang sudah di-cache (tenant config, daftar servis terakhir).
- UI responsif untuk layar kecil (<= 390px) — sesuaikan dengan `viewport` Playwright (1280×720 hanya untuk desktop).

## Aturan Implementasi (bila ditambahkan)
1. Letakkan `manifest.webmanifest` + icon maskable di `public/`.
2. Service worker hanya boleh cache aset statis & API read-only; **jangan** cache write endpoint (`/api/data/sync`, `/api/module-records` POST).
3. Selalu jaga **tenant isolation** di cache — key cache harus menyertakan `tenant_id`.
4. Notifikasi push (bila ada) lewat gateway WhatsApp/Telegram, bukan service worker push mentah.
5. Jangan blokir render utama: registrasi SW di `useEffect` pasca-mount, bukan di top-level module.

## Verifikasi
- `Lighthouse` PWA score >= 90.
- Install prompt muncul di Chrome Android.
- Refresh saat offline tetap menampilkan shell app.
