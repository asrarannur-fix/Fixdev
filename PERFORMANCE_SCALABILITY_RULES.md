# Performance & Scalability Rules

Aturan performa. Sumber: `src/components/TenantDashboard.tsx` (lazy load), `vite.config.ts` (manualChunks), pola `localStorage` logging.

## Bundling & Loading
- **Semua modul tab di-lazy load** via `React.lazy()` + `Suspense` di `TenantDashboard.tsx` (Services, POS, Inventory, Accounting, HR, CRM, Settings, Fraud, Warranty, OwnerReports, TechnicianOverview, SystemBackup).
- `vite.config.ts` memisahkan chunk: `react`, `charts` (recharts), `supabase`, `icons` (lucide-react), `motion`. Jangan ubah manualChunks tanpa benchmark.
- Jalankan `npm run build` sebelum deklare perbaikan performa; cek ukuran chunk di output Vite.

## Rendering & State
- Gunakan `useMemo`/`useCallback` untuk list besar (servis, produk, transaksi).
- Filter & pencarian (mis. `SmallPartsSearch`) lakukan di memori dengan predicate sederhana, bukan query berulang.
- Hindari `JSON.parse`/`stringify` besar di dalam `render` loop.

## Data & Logging
- Log aktivitas (`addLog`) ditulis ke `localStorage` — batasi volume (jangan log di dalam loop per-item).
- Query Supabase selalu `eq('tenant_id', currentTenantId)` agar indeks terpakai (lihat `DATABASE_SCHEMA_GUARDRAIL.md`).
- Operasi bulk via endpoint `/api/data/sync` (batch), bukan N request satuan.

## Server
- Server jalan di port **3000** (proxy nginx → `127.0.0.1:3000`).
- `server.ts` serve SPA + API dari satu process (`dist/server.cjs`).
