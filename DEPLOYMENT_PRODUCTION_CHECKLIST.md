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
4. `pm2 restart fixdev-erp` (atau `pm2 start dist/server.cjs --name fixdev-erp`)
5. `pm2 save`

## Nginx
`nginx-default.conf` proxy ke `http://127.0.0.1:3000` dengan header `Host`, `X-Real-IP`, `X-Forwarded-*`, dan `Upgrade/Connection` untuk WebSocket. Pastikan `server_name` & TLS (port 443) di-set di host asli.

## App Config
- `vite.config.ts` `server.allowedHosts: ['fixdev.web.id']` — tambahkan domain prod di sini bila ganti host.
- Env via `.env` (lihat `.env.example`): Supabase URL/key, API tokens.
- Server listen port **3000** (cocok dengan proxy nginx).

## Post-Deploy
- [ ] `pm2 logs fixdev-erp` tidak error.
- [ ] `curl http://localhost:3000/api/health` → 200.
- [ ] Buka `https://<domain>` dan login.
- [ ] Jalankan `npm run check:auth` & `npm run check:hardening`.
