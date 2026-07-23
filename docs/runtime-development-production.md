# Runtime Development dan Production

## Sumber kode canonical

`/home/ubuntu/fixdev` adalah satu-satunya source yang dipakai mode development dan production.
Direktori `/var/www/fixdev` tidak lagi menjadi source runtime terpisah.

## Mode development

- PM2: `fixdev-dev`
- Command: `node_modules/.bin/tsx server.ts`
- `NODE_ENV=development`
- `FIXDEV_PROFILE=development`
- `FIXDEV_DATABASE_NAME=fixdev_dev`
- Port: `3001`
- Vite middleware + HMR aktif
- URL publik: `https://dev.fixdev.web.id`
- Development memuat konfigurasi dari `/home/ubuntu/fixdev/.env.dev`; file lokal secret berizin `600`.

Jalankan manual bila diperlukan:

```bash
cd /home/ubuntu/fixdev
npm run dev
```

## Mode production

- PM2: `fixdev-erp`
- Artifact: `dist/server.cjs`
- Port: `3000`
- `NODE_ENV=production`
- `FIXDEV_PROFILE=production`
- `FIXDEV_DATABASE_NAME=fixdev`
- URL publik: `https://fixdev.web.id`
- `ALLOW_DEV_API_TOKENS=false`
- Secret production dimuat dari `/etc/fixdev/fixdev.production.env` melalui `DOTENV_CONFIG_PATH`; file tersebut berizin `600`.

Build dan restart resmi:

```bash
cd /home/ubuntu/fixdev
npm run lint
npm test
npm run build
pm2 restart ecosystem.config.cjs --only fixdev-erp --update-env
pm2 save
```

## Health check

```bash
curl -fsS https://fixdev.web.id/api/health
curl -fsS https://dev.fixdev.web.id/api/health
```

## Struktur folder

- `src/`, `public/`, `server.ts`: source aplikasi
- `tests/`: test otomatis
- `migrations/`: migrasi database
- `docs/`, `plans/`: dokumentasi dan rencana
- `dist/`, `logs/`, `node_modules/`: hasil/runtime lokal, diabaikan Git
- `uploads/`: file runtime seperti QRIS, diabaikan Git dan tidak boleh dihapus saat cleanup
- `.env`, `.env.dev`: secret/runtime lokal, tidak dilacak Git

## Aturan cleanup

Jangan menyimpan password, token, dump database, atau script eksperimen di root repository. Script sementara harus diletakkan di `/tmp` atau dihapus setelah selesai.
