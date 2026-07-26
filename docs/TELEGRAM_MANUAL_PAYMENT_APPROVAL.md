# Approval Pembayaran Manual Telegram

## Ringkasan perubahan

Bot platform mengirim tombol `Setujui` saat tenant mengirim bukti pembayaran manual. Tombol memproses approval lewat transaksi billing sama dengan dashboard, memakai versi pengajuan agar klik ulang atau data lama gagal aman. Penolakan tetap lewat dashboard agar alasan audit wajib diisi.

Bot juga mengirim notifikasi tenant baru saat pendaftaran web berhasil. Perintah superadmin: `/help`, `/status`, `/pending`, `/tenants`, `/plans`, dan `/invoice <ID>`.

## Konfirmasi tenant

Tenant memilih `Saya Sudah Bayar`, melihat langkah pembayaran, mengunggah bukti, lalu mengirim konfirmasi. Invoice berubah menjadi `Menunggu Verifikasi`; tombol pembayaran terkunci. Jika admin menolak, alasan tampil dan tenant dapat mengirim bukti baru.

## Konfigurasi

- Isi lewat Superadmin > Billing > Telegram. Token dan secret tidak dikirim kembali ke browser setelah disimpan.
- Masukkan `Telegram User ID` dan UUID superadmin dari daftar yang tampil pada halaman tersebut.
- Webhook Telegram: `POST /api/platform/telegram/manual-payment-webhook` dengan secret token sama.

## File terkait

- `src/server/controllers/manualPayment.controller.ts`
- `src/server/controllers/telegram.controller.ts`
- `server.ts`
- `src/lib/envSchema.ts`
- `.env.example`
