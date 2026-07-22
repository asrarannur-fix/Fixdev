# Panduan Integrasi dan Aturan Kerja Proyek (CLAUDE.md)

Dokumen ini berisi arsitektur sistem, aturan pengkodean, dan panduan integrasi keseluruhan untuk semua modul di proyek ini.

## Catatan Perbaikan Aksesibilitas

- Audit visual aksesibilitas melengkapi semantik modal, dukungan keyboard pada kartu antrean, label kontrol ikon, status dinamis, tipe tombol, dan indikator fokus.
- File terkait: `src/components/CrudManager.tsx`, `src/components/TenantDashboard.tsx`, `src/components/tenant/ServiceDetailModal.tsx`, `src/components/tenant/services/QueuePanel.tsx`, `src/components/tenant/services/QCChecklistModal.tsx`, `src/components/ConsignmentManager.tsx`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/KeyboardShortcutsModal.tsx`, dan `src/components/ui/PasswordChangeModal.tsx`.

## Arsitektur Sistem

- **Frontend**: React 19 + TypeScript + Vite.
- **Backend**: Express + Node.js.
- **Database**: PostgreSQL (Supabase) + pg client.
- **Koneksi Database**: Menggunakan shared pool (`src/lib/db.ts`) dengan Supabase Transaction Pooler (port 6543) untuk mode produksi.
- **Autentikasi**: Supabase JWT + isolasi `tenant_id` dan `branch_id`.

## Aturan Pengkodean Mutlak (Vertical Slice)

1. **Satu Set Lengkap**:
   Setiap penambahan fitur atau perbaikan modul harus dikerjakan secara tuntas mencakup:
   - Database / Migrations (idempotent, index, constraint).
   - API Backend terautentikasi (Zod validation, isolation, transaksi aman).
   - State Frontend (SaaSContext, hooks, tanpa optimistic state untuk operasi kritis).
   - Antarmuka UX (Desktop & Mobile, responsif, loading, error, retry, empty, disabled, modal).
   - Laporan, Audit Log, dan Notifikasi (bila relevan).
   - Pengujian E2E & API.

2. **Mesin Stok Terpadu**:
   - `products` dan `product_stock` adalah satu-satunya kebenaran saldo persediaan.
   - Klasifikasikan item berdasarkan `item_type`: `RETAIL_PRODUCT`, `SERVICE_PART`, `MICRO_COMPONENT`, `CONSUMABLE`.
   - Modul khusus teknisi (seperti Suku Cadang Mikro) hanya membaca data stock dari Inventory dan menyimpan detail khusus di `micro_components`.

3. **Keamanan Transaksi**:
   - Gunakan PostgreSQL Transactions (`dbTransaction`) untuk modifikasi data penting.
   - Terapkan Row Locking (`FOR UPDATE`) pada stok atau status kritis untuk mencegah race conditions.
   - Validasi status transaksi di sisi backend sebelum melakukan modifikasi.
   - Lindungi data sensitif (PIN, internal note, bukti pembayaran) dari tracker publik.

4. **Komunikasi & Notifikasi**:
   - Terapkan antrean pengiriman WhatsApp (`whatsapp_queue`).
   - Sediakan fallback link manual (`wa.me`) dengan template pesan dinamis jika API WhatsApp dinonaktifkan.

5. **Integrasi Pengaturan & Template Kustom**:
   - Setiap modul wajib terintegrasi dengan menu Pengaturan. Tambahkan opsi konfigurasi operasional di modul Pengaturan (seperti `AppSettingsPanel` atau `OperationalSettingsPanel`), sinkronisasikan state ke database (`tenants.settings`), dan pastikan modul terkait membaca konfigurasi tersebut untuk mengatur perilakunya secara dinamis (contoh: biaya diagnosa default, SLA jam, kustomisasi template balasan pesan WhatsApp).

## Perintah Verifikasi Kerja

- **Tipe & Lint**: `npm run lint`
- **Build**: `npm run build`
- **Uji Hardening**: `npm run check:hardening`
- **Unit & API Test**: `npx tsx --test tests/...`
- **E2E Browser**: `npx playwright test`
- **Database Rollback**: `npx tsx scripts/verify-service-transaction.ts`

## Catatan Perbaikan Visual

- Audit mode gelap diselesaikan pada komponen manager, HR, pengaturan tenant, dokumen servis, handover, WhatsApp, dan ledger sparepart.
- File terkait: `src/components/DataImporter.tsx`, `src/components/PurchaseManager.tsx`, `src/components/SupplierManager.tsx`, `src/components/TelegramBotManager.tsx`, `src/components/ConsignmentManager.tsx`, `src/components/MaintenanceContractManager.tsx`, dan komponen tenant terkait di `src/components/tenant/`.
