# FIXDEV ERP

SaaS ERP multi-tenant untuk operasional servis laptop, inventory, POS, accounting, CRM, HR, dan billing.

## Source dan runtime

- Source canonical: `/data/fixdev`
- Production: PM2 `fixdev-erp`, port `3000`
- Development: PM2 `fixdev-dev`, port `3001`, Vite HMR aktif
- Production URL: https://fixdev.web.id
- Development URL: https://dev.fixdev.web.id

## Struktur folder (bersih)

```
/data/fixdev
├── src/              # source code frontend + backend
├── server.ts         # entry point server (backend)
├── dist/             # hasil build (frontend + dist/server.cjs) — runtime wajib
├── node_modules/     # dependency — runtime wajib
├── migrations/       # SQL migrasi database
├── public/           # static assets (terms.html, privacy.html)
├── certs/            # QZ print certificate
├── logs/             # log runtime (auto-regen)
├── .env              # secret development
└── .env.production   # secret production
```

File di luar daftar di atas (docs, tests, ops, tools, scripts, plans, CI, Docker)
sudah dibuang agar folder ringkas. Server prod & dev tetap berjalan normal.

## Build & jalankan

```bash
# install dependency (kalau node_modules dihapus)
npm ci

# build backend (dist/server.cjs) + frontend (dist/)
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
npm run build

# jalankan produksi via pm2
pm2 start ecosystem.config.cjs --env production

# jalankan development (Vite HMR, port 3001)
pm2 start dist/server.cjs --name fixdev-dev
```

## Operasional

```bash
pm2 list
pm2 logs fixdev-erp
pm2 restart fixdev-erp
pm2 save
sudo nginx -t
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health
```

Environment production dibaca dari `.env.production` (via `DOTENV_CONFIG_PATH`
di `ecosystem.config.cjs`). Jangan edit `.env` untuk production.

## Aturan penting

- Jangan menjalankan production dari folder selain `/data/fixdev`.
- Jangan memasukkan secret/token/password ke source, docs, test, atau log.
- Semua API tenant wajib memvalidasi `tenant_id`; operasi branch wajib memvalidasi `branch_id`.
- Public tracking memakai tenant dari hostname tervalidasi, bukan `tenantId` bebas dari client.
- Error internal harus dicatat server-side dan response client harus generik.
- Jangan commit atau mengubah secret tanpa review pemilik.

## Database

Skema dikelola via SQL di `migrations/`. Untuk menjalankan migrasi manual ke
database production, gunakan `psql` dengan credential dari `.env.production`:

```bash
psql "$DATABASE_URL" -f migrations/<nama>.sql
```

## Referensi skema

Lihat [DATABASE_SCHEMA_GUARDRAIL.md](DATABASE_SCHEMA_GUARDRAIL.md) untuk aturan
pembuatan/perubahan tabel (UUID default, tenant isolation, no phantom columns).
