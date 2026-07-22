# Deployment — Production Checklist

Panduan deploy ke server. Sumber: `deploy.sh`, `nginx-default.conf`, `package.json`.

## Prerequisite Server
- Node.js + npm, `pm2` global (`npm i -g pm2`).
- Repo di `/var/www/fixdev`, branch `main`.
- Nginx sebagai reverse proxy (lihat `nginx-default.conf`).

## Langkah Deploy (otomatis)
Jalankan di server: `bash deploy.sh`
1. `git pull --ff-only origin main`
2. `npm ci` (atau `npm install`)
3. `npm run build` → `dist/server.cjs` + `dist/assets`
4. Muat env eksternal `/etc/fixdev/fixdev.production.env`.
5. `pm2 startOrRestart ecosystem.config.cjs --env production`
6. `pm2 save`

## Nginx
`nginx-default.conf` proxy ke `http://127.0.0.1:3000` dengan header `Host`, `X-Real-IP`, `X-Forwarded-*`, dan `Upgrade/Connection` untuk WebSocket. Pastikan `server_name` & TLS (port 443) di-set di host asli.

## App Config
- `vite.config.ts` `server.allowedHosts: ['fixdev.web.id']` — tambahkan domain prod di sini bila ganti host.
- `.env` hanya untuk development lokal. Produksi memakai `/etc/fixdev/fixdev.production.env` berizin `0600`, tidak disimpan di repo.
- Produksi wajib mengatur `NODE_ENV=production`, `PORT=3000`, `APP_URL=https://fixdev.web.id`, `ALLOWED_ORIGINS`, `TENANT_ROOT_DOMAIN`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_TOKEN`, dan `ALLOW_DEV_API_TOKENS=false`.
- Development memakai `NODE_ENV=development`, `DEV_PORT=3001`, serta Vite middleware/HMR.
- Server produksi listen port **3000**; development default **3001**.

## Catatan Perbaikan Deployment
- Ikon `Sparkles` dan teks AI pada antarmuka dihapus agar visual tidak menyerupai Gemini; ikon konteks menggantikan ikon dekoratif bila tersedia. File terkait: `src/App.tsx`, `src/config/nav.config.ts`, `src/components`, `src/context/SaaSContext.tsx`.
- Validasi `ALLOWED_ORIGINS` kini menerima host root `TENANT_ROOT_DOMAIN` dan subdomain tenant tanpa menolak `APP_URL` produksi.
- Environment development berada di `/home/ubuntu/fixdev` dengan `.env`, sedangkan production berada di `/var/www/fixdev` dengan `/etc/fixdev/fixdev.production.env` dan PM2. Build development tidak lagi menimpa artefak production.
- Variabel Supabase lama dihapus dari environment development dan production karena aplikasi memakai PostgreSQL langsung melalui `DATABASE_URL`.
- File terkait: `server.ts`, `deploy.sh`, `ecosystem.config.cjs`, `.env`, `/etc/fixdev/fixdev.production.env`, `DEPLOYMENT_PRODUCTION_CHECKLIST.md`.

## Post-Deploy
- [ ] `pm2 logs fixdev-erp` tidak error.
- [ ] `curl http://localhost:3000/api/health` → 200.
- [ ] Buka `https://<domain>` dan login.
- [ ] Jalankan `npm run check:auth` & `npm run check:hardening`.
