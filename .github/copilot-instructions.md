# Aturan Pengembangan Proyek Fixdev (Copilot Instructions)

Panduan arsitektur dan instruksi vertical slice lengkap untuk GitHub Copilot.

## Aturan Pengkodean (Vertical Slice)

Setiap fitur atau perbaikan harus selesai sebagai satu vertical slice penuh (Database, API Backend, State/Context Frontend, UX Desktop/Mobile, Pengaturan, Notifikasi, Audit Log, dan Tests). Jangan diimplementasikan secara parsial.

## Integrasi Pengaturan & Template Kustom

Setiap modul wajib terintegrasi dengan menu Pengaturan. Konfigurasi operasional disimpan ke `tenants.settings` di database, dan modul terkait wajib membaca konfigurasi tersebut dari context tenant secara dinamis (contoh: biaya diagnosa default, SLA jam, kustomisasi template balasan pesan WhatsApp).

## File Penting Proyek

- **Services**: `src/components/tenant/ServicesTab.tsx`, `serviceWorkflow.controller.ts`.
- **Inventory**: `src/components/tenant/InventoryTab.tsx`, `SmallPartsSearch.tsx`, `apiV1.controller.ts`.
- **POS**: `src/components/tenant/POSTab.tsx`.
- **Keuangan**: `src/components/tenant/AccountingTab.tsx`.
- **HRM**: `src/components/tenant/HRTab.tsx`.

## Keamanan & Transaksi

- Gunakan `dbTransaction` untuk modifikasi data penting.
- Terapkan Row Locking (`FOR UPDATE`) pada stok atau status kritis untuk mencegah race conditions.
- Jangan bocorkan data sensitif (PIN, HPP internal, catatan internal) ke struk pelanggan atau endpoint publik.
