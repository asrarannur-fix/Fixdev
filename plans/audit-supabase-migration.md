# Audit Komprehensif: FIXDEV Supabase Migration

## Temuan Kritis

### 1. KEAMANAN API — Endpoint Tanpa Autentikasi
- **[`/api/tenant/data`](src/server/routes/tenant.routes.ts:6)** — Baru dihapus autentikasinya. Siapapun bisa fetch data tenant dengan `tenant_id` parameter.
- **[`/api/dev/bootstrap`](server.ts:154)** — hanya di-protect oleh `NODE_ENV !== production`. Di production ini berisiko jika environment salah set.
- **[`/api/supabase/env-status`](server.ts:129)** — Mengekspos `SUPABASE_URL` ke publik.

### 2. SKEMA DATABASE — Ketidakcocokan
- **Tabel tidak ada**: [`employees`](src/server/controllers/tenant.controller.ts:30), [`vouchers`](src/server/controllers/tenant.controller.ts:36), [`work_shifts`](src/server/controllers/tenant.controller.ts:38) — di-query tapi tidak ada di [`supabase-schema.sql`](supabase-schema.sql:1).
- **`audit_logs`** — [`audit.controller.ts`](src/server/controllers/audit.controller.ts:73) insert kolom `endpoint`, `method`, `is_valid_tenant`, `is_valid_branch`, `verified`, `client_ip`, `action`, `details`, `category`, `risk_level` yang tidak ada di schema.
- **Tidak ada indeks** untuk kolom yang sering di-query: `tenants.id`, `users.auth_id`, `service_tickets.tenant_id`, dll.

### 3. DUPLIKASI CONNECTION POOL
- [`apiV1.controller.ts`](src/server/controllers/apiV1.controller.ts:109) membuat Pool sendiri terpisah dari [`lib/db.ts`](src/lib/db.ts:11). Ini menggandakan koneksi ke database.

### 4. OFFLINE SYNC — [`localStorage`](src/components/OfflineSyncModal.tsx:224)
- Terbatas ~5MB, tidak terenkripsi, hilang saat clear browser data.
- Tidak ada validasi integritas data saat sinkronisasi.

### 5. FLOW DATA — [`SaaSContext.tsx`](src/context/SaaSContext.tsx:264)
- Fallback `tenant-owner-1` hardcoded di [`loadInitialData`](src/context/SaaSContext.tsx:268).
- [`refreshData()`](src/context/SaaSContext.tsx:463) tidak ada handler error yang proper.
- [`bootstrap.controller.ts`](src/server/controllers/bootstrap.controller.ts:17) punya data lebih lengkap (product_stock, journal_lines, pos_shifts) daripada [`tenant.controller.ts`](src/server/controllers/tenant.controller.ts:25).

## Rencana Perbaikan

### Prioritas 1 — Keamanan Kritis
1. **Buat tabel yang belum ada** di [`supabase-schema.sql`](supabase-schema.sql:1): `employees`, `vouchers`, `work_shifts`
2. **Sync skema `audit_logs`** — tambahkan kolom yang di-insert oleh [`audit.controller.ts`](src/server/controllers/audit.controller.ts:73) ke schema
3. **Tambahkan autentikasi** ke [`/api/tenant/data`](src/server/controllers/tenant.controller.ts:19) — minimal validasi Supabase JWT
4. **Sembunyikan** `/api/supabase/env-status` di production

### Prioritas 2 — Konsistensi Data
5. **Unifikasi connection pool** — hapus Pool duplikat di [`apiV1.controller.ts`](src/server/controllers/apiV1.controller.ts:109), gunakan dari [`lib/db.ts`](src/lib/db.ts:13)
6. **Sinkronkan endpoint** — buat [`tenant.controller.ts`](src/server/controllers/tenant.controller.ts:25) mengembalikan data selengkap [`bootstrap.controller.ts`](src/server/controllers/bootstrap.controller.ts:17) (termasuk product_stock, journal_lines, pos_shifts)
7. **Tambah indeks** di [`supabase-schema.sql`](supabase-schema.sql:1) untuk kolom yang sering di-query

### Prioritas 3 — Arsitektur
8. **Hapus fallback hardcoded** `tenant-owner-1` di [`SaaSContext.tsx`](src/context/SaaSContext.tsx:268)
9. **Migrasi offline sync** dari `localStorage` ke `IndexedDB` (atau minimal tambah validasi)
10. **Rotate secrets** — `SUPABASE_SERVICE_ROLE_KEY` dan `SUPABASE_DB_URL` password karena sudah terbuka di sesi ini

## Diagram Alur Perbaikan

```mermaid
graph TD
    A[Audit Temuan] --> B[P1: Keamanan]
    A --> C[P2: Konsistensi]
    A --> D[P3: Arsitektur]
    B --> B1[Buat tabel missing]
    B --> B2[Sync audit_logs schema]
    B --> B3[Tambah auth ke tenant endpoint]
    B --> B4[Sembunyikan env-status]
    C --> C1[Unifikasi connection pool]
    C --> C2[Sync tenant vs bootstrap controller]
    C --> C3[Tambah indeks DB]
    D --> D1[Hapus hardcoded tenant-id]
    D --> D2[Migrasi offline ke IndexedDB]
    D --> D3[Rotate secrets]