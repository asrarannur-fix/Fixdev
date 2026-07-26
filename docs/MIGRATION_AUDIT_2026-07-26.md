# Audit dan Perbaikan Migrasi Database 2026-07-26

## Ringkasan
- Target audit dan migrasi: `fixdev_dev` melalui `.env.dev`; production tidak disentuh.
- Runner memakai `schema_migrations`, checksum SHA-256, advisory lock, serta transaksi per migration.
- Ledger awal berhenti di `054_auth_sessions.sql`; `050`–`054` sudah tercatat setelah percobaan pertama.
- `050_rental_module.sql` sempat berubah setelah diterapkan, dengan tambahan `DROP TRIGGER`; file dipulihkan persis ke versi Git. Objek schema rental sudah ada dan trigger terkait ekuivalen, sehingga hanya checksum `schema_migrations` dev diperbaiki dalam transaksi dengan guard database `fixdev_dev`. Production tidak disentuh.
- `055_pos_phase0_integrity.sql` gagal berikutnya karena `products.barcode` tidak ada pada baseline. Kolom ditambahkan secara additive dengan `ADD COLUMN IF NOT EXISTS` di migration 055 yang belum diterapkan.

## Hasil
- `050_rental_module.sql`: berhasil.
- `051_rental_contract_notes.sql`: berhasil.
- `052_data_manager_integrity.sql`: berhasil.
- `053_tenant_infrastructure_hardening.sql`: berhasil.
- `054_auth_sessions.sql`: berhasil.
- `055_pos_phase0_integrity.sql`: berhasil.
- `056_pos_receivable_payments.sql`: berhasil.
- `057_pos_pricing_promotions_bundles.sql`: berhasil.
- Tidak ada migration pending setelah run.

## File terkait
- `migrations/050_rental_module.sql`
- `migrations/055_pos_phase0_integrity.sql`
- `scripts/migrate.ts`
- `src/server/controllers/database.controller.ts`
