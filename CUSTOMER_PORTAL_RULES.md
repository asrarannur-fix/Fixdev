# Customer Portal Rules

Aturan akses portal pelanggan publik. Sumber: `src/components/CustomerPortal.tsx`.

## Akses
- Portal bersifat **publik tanpa login penuh** — pelanggan mengakses via **Nomor Tiket** atau **scan QR** (`?ticket=...`).
- Data yang ditampilkan harus **tenant-scoped & ticket-scoped**: hanya status servis, QR lacak, dan invoice/receipt milik tiket tersebut.

## Tab & Fitur
- **Lacak Nota** — input nomor tiket / kamera scan QR (`Camera`), tampilkan status & progres servis.
- **Invoices & Receipts** — daftar struk invoice penjualan resmi milik pelanggan (tenant-bound).
- **Klaim Link** — link klaim unit (salin ke clipboard), dipakai di slip penerimaan.

## Aturan Keamanan
1. Jangan pernah menampilkan data pelanggan lain hanya dari nomor tiket — selalu join ke `ticket_no` + `tenant_id`.
2. QR tracking mengarah ke `window.location.origin/?ticket=<ticketNo>` — pastikan route publik tidak membocorkan data sensitif (harga beli, alamat lengkap) di luar konteks tiket.
3. Akses portal diwakili permission `customer_portal` di sisi user (seed `CUSTOMER`).
4. Jangan memuat data massal di portal; gunakan pagination/query per tiket agar tetap ringan di mobile.

## Syarat & Ketentuan
Teks `termsAndConditionsText` / `showTermsInTracking` dari `printConfig` dapat ditampilkan di portal bila diaktifkan (lihat Setting Printer & Ketentuan Nota).
