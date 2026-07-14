# Acceptance Criteria by Module

Kriteria terima per modul. Sumber: `MODULE_REGISTRY.md`, `ROLE_MENU_MATRIX.md`, alur di `tests/`.

## Services (Servis)
- [ ] Penerimaan unit membuat tiket dgn `ticket_no` unik & status `DITERIMA`.
- [ ] Alur: DITERIMA → DIAGNOSA → (SELESAI/DIAMBIL) memicu trigger garansi (default 3 bln).
- [ ] Teknisi (role `TEKNISI`) bisa `service_diagnose`/`service_repair`.
- [ ] Cetak SPK, Invoice, Penawaran, Kartu Garansi menghormati `printConfig` (paperSize, header, footer, terms).
- [ ] QR Tracker & Nota Penerimaan tercetak dgn setting printer aktif.

## POS (Kasir)
- [ ] Transaksi → `pos_transactions` dgn `grand_total`, `posted_to_ledger=true`.
- [ ] Manajemen shift (buka/tutup) mencatat `starting_cash`/`actual_ending_cash` & selisih.
- [ ] Void nota membalik jurnal ke ledger.
- [ ] Struk POS tercetak dgn `printConfig` (header/footer/terms sales).
- [ ] Kasir (role `KASIR`) hanya akses `pos_entry`, `shift_control`, `customer_view`.

## Inventory (Stok)
- [ ] Stok per gudang (`product_stock` per `warehouse_id`) akurat.
- [ ] Transfer antar cabang & lokasi tersinkron.
- [ ] Purchase Order tercetak dgn `printConfig` (paperSize 58/80).
- [ ] Reorder prediktif (`SmallPartsSearch`) menghitung estimasi & PO otomatis.

## Accounting (Keuangan)
- [ ] COA per tenant (`UNIQUE(tenant_id, code)`).
- [ ] Journal double-entry: tiap entry punya `journal_lines` debet=kredit.
- [ ] POST transaksi & refund mem-post jurnal otomatis.
- [ ] Laporan (statements) konsisten dgn ledger.

## HR
- [ ] Presensi, payroll, komisi, kasbon terdata per tenant & periode.
- [ ] Akses HR dibatasi role `HR`/`MANAGER`/`OWNER`.

## CRM
- [ ] Pipeline & pelanggan tenant-scoped.
- [ ] Broadcast WhatsApp/Telegram tercatat di `whatsapp_logs`/`whatsapp_queue`.

## WhatsApp / Notifications
- [ ] Log & antrean tersimpan (`whatsapp_logs`, `whatsapp_queue`).
- [ ] Notifikasi otomatis (stock, fraud) terkirim & tercatat real-time.

## Settings
- [ ] `printConfig` tersimpan di `tenants.settings` & berlaku di semua cetak.
- [ ] White-label `branding` (primaryColor) teraplikasi.
- [ ] RBAC: ubah role → `rbacMatrix` & permission update (`updateUserRole`).
- [ ] Subscription billing tervalidasi.

## Cross-Cutting
- [ ] Multi-tenant: data satu tenant tak bocor ke tenant lain.
- [ ] Lazy-load modul → waktu muat awal wajar.
- [ ] Validasi (`npm run validate`) & E2E hijau sebelum rilis.
