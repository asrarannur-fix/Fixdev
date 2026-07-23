# FIXDEV — Stabilization Master

> Dokumen kanonik untuk perbaikan, operasi, keamanan, dan validasi FixDev ERP.
>
> **Source canonical:** `/home/ubuntu/fixdev`
> **Production:** `fixdev-erp` → `127.0.0.1:3000`
> **Development:** `fixdev-dev` → `127.0.0.1:3001`

## 1. Prinsip kerja

1. Jangan memakai `/var/www/fixdev` sebagai source runtime.
2. Production dan development selalu berasal dari `/home/ubuntu/fixdev`.
3. Secret tidak boleh berada di source, dokumentasi, test, log, atau response API.
4. Semua operasi tenant wajib mempunyai boundary `tenant_id` dan, bila relevan, `branch_id`.
5. Semua perubahan data kritis harus atomik, tervalidasi server, dan memiliki audit trail.
6. Public endpoint tidak boleh menerima tenant scope arbitrer dari query/body.
7. Error internal dicatat server-side dan response client harus generik.
8. Tidak membuat commit otomatis; perubahan tetap di working tree sampai ditinjau pemilik.

## 2. Runtime dan environment

### Database dan akun

Production dan development memakai **role database yang sama** (`fixdev`) tetapi database berbeda:

```text
production → database fixdev
development → database fixdev_dev
```

Ini sengaja: kode dan struktur schema sama, tetapi data login, tenant, invoice, upload, dan transaksi development tidak boleh menyentuh production. Jika user login terlihat berbeda, penyebabnya adalah database berbeda, bukan source code berbeda. Menyalin akun production ke development harus dilakukan melalui seed/sanitized fixture resmi, bukan dengan memakai `DATABASE_URL` production.

Profile aktif ditentukan eksplisit oleh ecosystem PM2:

- Production: `FIXDEV_PROFILE=production`, `FIXDEV_DATABASE_NAME=fixdev`.
- Development: `FIXDEV_PROFILE=development`, `FIXDEV_DATABASE_NAME=fixdev_dev`.
- `server.ts` memverifikasi profile terhadap `NODE_ENV` dan nama database terhadap `DATABASE_URL`.
- Dotenv menggunakan `override: true`, sehingga environment stale yang diwariskan PM2 tidak dapat mengalahkan file profile aktif.

### Production

- PM2: `fixdev-erp`
- Entry: `/home/ubuntu/fixdev/dist/server.cjs`
- `NODE_ENV=production`
- `PORT=3000`
- Environment eksternal: `/etc/fixdev/fixdev.production.env`
- Permission environment: `600`
- Public URL: `https://fixdev.web.id`

### Development

- PM2: `fixdev-dev`
- Entry: `/home/ubuntu/fixdev/node_modules/.bin/tsx server.ts`
- `NODE_ENV=development`
- `PORT=3001`
- `DEV_PORT=3001`
- Environment: `/home/ubuntu/fixdev/.env.dev`
- HMR: aktif melalui Vite middleware
- Public URL: `https://dev.fixdev.web.id`

### Binding jaringan

Aplikasi hanya bind ke loopback. Nginx adalah entrypoint publik.

```text
127.0.0.1:3000 → production
127.0.0.1:3001 → development
```

## 3. Security baseline

### Authentication dan tenant boundary

- JWT route memakai `requireJwt`.
- Tenant route memakai `requireTenantScope`.
- Sanctum API v1 memvalidasi:
  - token aktif dan database-backed
  - tenant token cocok dengan `hostTenant`
  - branch token aktif dan milik tenant yang sama
  - abilities token sesuai route
- Tidak ada developer token hardcoded.
- Token database disimpan hashed dan token plaintext hanya ditampilkan saat provisioning.

### Public endpoint

Endpoint tracking/warranty mengambil tenant dari hostname tenant yang tervalidasi:

```text
req.hostTenant?.id
```

`tenantId` arbitrer dari query/body tidak boleh dipercaya.

### Upload

File upload wajib memvalidasi:

- nama file allowlist
- MIME type
- ukuran maksimum
- magic bytes/signature
- tenant ownership
- path storage yang sudah dinormalisasi

### Error handling

Jangan gunakan pola berikut pada response:

```ts
res.status(500).json({ error: err.message });
```

Gunakan pesan generik dan log internal tanpa credential:

```ts
logger.error({ err: err.message }, "operation failed");
res.status(500).json({ error: "Operasi gagal diproses." });
```

## 4. Data integrity

- Query tenant harus menggunakan parameter SQL.
- Stock deduction memakai conditional atomic update dengan syarat stok mencukupi.
- Transaksi POS dan accounting memakai transaction boundary database.
- Journal harus balance: total debit sama dengan total credit.
- Migration harus idempotent dan dijalankan melalui runner resmi.
- Production migration harus sama dengan folder `migrations/`.

## 5. Quality gate wajib

Jalankan dari `/home/ubuntu/fixdev`:

```bash
npm install --include=dev
npm run lint
npm test
npm run build
npm run preflight:production
npm audit --audit-level=high
git diff --check
npx playwright test --list --config=playwright.config.ts
```

Expected baseline saat dokumen ini dibuat:

```text
unit tests: 15 passed
security tests: 8 passed
npm audit: 0 vulnerabilities
Playwright discovery: 20 tests / 14 files
```

## 6. Operasional dan recovery

```bash
pm2 list
pm2 save
systemctl is-enabled pm2-ubuntu
systemctl is-active pm2-ubuntu
sudo nginx -t
ss -ltnp | grep -E ':3000|:3001'
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health
```

Restart production saja:

```bash
cd /home/ubuntu/fixdev
npm run build
pm2 restart fixdev-erp --update-env
pm2 save
```

Jika environment PM2 development stale, recreate hanya development:

```bash
pm2 delete fixdev-dev
pm2 start ecosystem.config.cjs --only fixdev-dev
pm2 save
```

## 7. Dokumentasi yang dipertahankan

- `AGENTS.md` — aturan kerja agent dan arsitektur.
- `DATABASE_SCHEMA_GUARDRAIL.md` — aturan schema/query.
- `ROLE_MENU_MATRIX.md` — matriks role dan menu.
- `DEPLOYMENT_PRODUCTION_CHECKLIST.md` — checklist deploy.
- `INCIDENT_ROLLBACK_PLAN.md` — rollback operasional.
- `docs/runtime-development-production.md` — detail runtime.
- `E2E_TEST_PLAN.md` — strategi browser test.
- `VALIDATION_CHECKLIST.md` — checklist validasi modul.

Dokumen audit historis yang berisi status lama tidak dijadikan sumber kebenaran. Status terbaru harus merujuk dokumen ini dan output command aktual.

## 8. Backlog residual terukur

### Prioritas tinggi

- Audit dan normalisasi seluruh response error controller secara konsisten dengan helper logger bersama.
- Validasi ulang flow oversell POS/inventory dengan integration test concurrent.
- Pastikan journal POS gagal secara atomik jika COA wajib tidak tersedia.

### Prioritas menengah

- Hapus atau implementasikan `ServiceApprovalPortal` beserta endpoint portal yang belum terdaftar.
- Tambahkan integration test untuk Sanctum host mismatch dan invalid branch token.
- Jalankan browser E2E penuh dengan credential test resmi; discovery saja bukan bukti flow login.
- Pecah bundle frontend besar dengan lazy loading/chunk strategy.

### Proses

- Review dan stage perubahan Git secara eksplisit sebelum commit.
- Jangan mengubah secret production saat refactor.
- Setelah perubahan database, bandingkan migration lokal dan production.

## 9. Definition of done

Perubahan dianggap selesai bila:

- source canonical tetap `/home/ubuntu/fixdev`
- production dan development online pada port benar
- health publik HTTP 200
- `npm run preflight:production` pass
- audit dependency tidak memiliki vulnerability high
- test regression security pass
- tidak ada secret baru di diff
- dokumentasi master diperbarui bila aturan runtime/security berubah
- residual risk dicatat, bukan disembunyikan
