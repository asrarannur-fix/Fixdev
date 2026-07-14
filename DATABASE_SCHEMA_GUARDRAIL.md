# Database Schema Guardrail

Aturan wajib saat menyentuh skema/query PostgreSQL (Supabase). Sumber: `supabase-schema.sql`.

## Struktur Multi-Tenant
Setiap tabel bisnis memiliki kolom `tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`.
Tabel: `tenants`, `users`, `branches`, `warehouses`, `customers`, `products`, `service_tickets`, `pos_shifts`, `pos_transactions`, `coa_accounts`, `journal_entries`, `journal_lines`, `audit_logs`, `module_records`, `whatsapp_logs`, `whatsapp_queue`.

## Guardrails (JANGAN dilanggar)
1. **Selalu filter `tenant_id`** — tidak ada query lintas-tenant. Endpoint server menggunakan `requireTenantScope` (`server.ts`).
2. **Jangan hapus `ON DELETE CASCADE`** pada relasi anak (`branches`, `warehouses`, `customers`, dll.) — data akan ikut terhapus saat tenant dihapus.
3. **Kolom JSONB** — `tenants.settings`, `tenants.branding`, `pos_transactions.items`, `module_records.payload`. Simpan dokumen terstruktur di sini; jangan buat tabel baru untuk field opsional.
4. **`printConfig`** disimpan di dalam `tenants.settings` (JSONB) — lihat `SettingsTab.tsx` (`updateTenant(..., { settings: { printConfig } })`).
5. **PK tipe UUID** untuk entitas utama; `whatsapp_logs` & `whatsapp_queue` menggunakan `SERIAL` (auto-increment integer, bukan UUID).
6. **Unique constraint** — `tenants.subdomain` UNIQUE, `coa_accounts(tenant_id, code)` UNIQUE, `module_records(tenant_id, module, record_id)` UNIQUE.
7. **Jangan drop tabel `module_records`** — digunakan sebagai store generik lintas modul (`POST/GET /api/module-records`).

## Trigger Otomatis
`trigger_calculate_warranty` (BEFORE INSERT/UPDATE on `service_tickets`): bila `status IN ('SELESAI','DIAMBIL')` dan `warranty_ends_at IS NULL`, set `warranty_months` default **3** dan hitung `warranty_ends_at = NOW() + warranty_months`.
→ Jangan menonaktifkan trigger ini; pastikan kolom `warranty_months` ada bila ingin durasi selain 3 bulan.

## Migrasi
Hanya via endpoint admin `POST /api/supabase/migrate` (`requireSupabaseAdmin`). Jangan jalankan DDL manual di prod tanpa review.
