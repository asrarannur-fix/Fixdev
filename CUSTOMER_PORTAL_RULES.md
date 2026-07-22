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
1. Jangan pernah menampilkan data pelanggan lain hanya dari nomor tiket — selalu join ke `ticket_no` + `tenant_id`. Endpoint publik wajib menerima tenant context dari URL/token tervalidasi; tanpa tenant context request ditolak.
2. QR tracking mengarah ke `window.location.origin/?ticket=<ticketNo>` — pastikan route publik tidak membocorkan data sensitif (harga beli, alamat lengkap) di luar konteks tiket.
3. Akses portal diwakili permission `customer_portal` di sisi user (seed `CUSTOMER`).
4. Jangan memuat data massal di portal; gunakan pagination/query per tiket agar tetap ringan di mobile.

## Syarat & Ketentuan
Teks `termsAndConditionsText` / `showTermsInTracking` dari `printConfig` dapat ditampilkan di portal bila diaktifkan (lihat Setting Printer & Ketentuan Nota).

## Catatan Perbaikan Branding
- Portal, konteks AI, pesan pelanggan, dokumen cetak, title, favicon, login, dan sidebar memakai nama/logo tenant atau fallback netral.
- Endpoint status tiket dan verifikasi garansi wajib tenant-scoped; bootstrap Super Admin tidak mengirim `settings` dan `branding` penuh.
- Putaran kedua menghapus domain teknis sebagai nama tampilan, fallback `KM`/lokasi vendor, dan tenant ID semu `default` dari portal publik.
- File terkait: `src/components/CustomerPortal.tsx`, `src/components/ServiceApprovalPortal.tsx`, `src/components/InvitationAcceptance.tsx`, `src/App.tsx`, `src/utils/branding.ts`, `src/utils/print.ts`, `src/server/controllers/serviceTracker.controller.ts`, `src/server/controllers/bootstrap.controller.ts`.
