# FIXDEV Operations

Satu folder untuk workflow push, deploy, database, health check, dan rollback.

## Workflow normal

Dari development:

```bash
cd /home/ubuntu/fixdev
npm run lint
npm test
npm run build
bash ops/push.sh "fix: ringkas pesan perubahan"
```

Di server production:

```bash
cd /home/ubuntu/fixdev
bash ops/deploy.sh
```

`ops/deploy.sh` hanya merestart `fixdev-erp`. Development tidak ikut terganggu.

## Database

Migration tidak berjalan otomatis ketika deploy aplikasi.
Setelah backup dan verifikasi, jalankan secara eksplisit:

```bash
npm run db:migrate:production
```

Jika migration gagal, hentikan proses, simpan error, jangan mengedit migration yang sudah applied, dan gunakan migration perbaikan baru atau restore backup.

## Health

```bash
bash ops/health.sh
```

## Rollback kode

Rollback kode tidak membatalkan migration database:

```bash
bash ops/rollback-code.sh <commit-baik>
```

Jangan menaruh file environment, password, token, dump database, atau private key di folder ini.
