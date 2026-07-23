# FIXDEV — Agent Execution Master Plan

> Dokumen kerja wajib untuk agent/engineer yang melanjutkan proyek FixDev ERP.
>
> **Tujuan:** menyelesaikan proyek secara utuh, bukan patch setengah jadi; menjaga source canonical, memperbaiki akar masalah, menyederhanakan operasi, meningkatkan keamanan, dan menghasilkan aplikasi yang mudah dipakai serta siap diskalakan.
>
> **Aturan utama:** jangan menyatakan “selesai”, “aman”, “siap production”, atau “tidak ada bug” tanpa bukti command, test, endpoint, screenshot, atau verifikasi yang sesuai.

---

## 1. Identitas proyek dan batasan wajib

### 1.1 Source canonical

```text
/home/ubuntu/fixdev
```

Direktori berikut **bukan** source runtime:

```text
/var/www/fixdev
```

Jangan membuat salinan source kedua untuk production atau development.

### 1.2 Runtime resmi

```text
Production:
  PM2: fixdev-erp
  Entry: /home/ubuntu/fixdev/dist/server.cjs
  NODE_ENV: production
  FIXDEV_PROFILE: production
  FIXDEV_DATABASE_NAME: fixdev
  Bind: 127.0.0.1:3000
  Public URL: https://fixdev.web.id
  Environment: /etc/fixdev/fixdev.production.env

Development:
  PM2: fixdev-dev
  Entry: /home/ubuntu/fixdev/node_modules/.bin/tsx server.ts
  NODE_ENV: development
  FIXDEV_PROFILE: development
  FIXDEV_DATABASE_NAME: fixdev_dev
  Bind: 127.0.0.1:3001
  Public URL: https://dev.fixdev.web.id
  Environment: /home/ubuntu/fixdev/.env.dev
```

### 1.3 Database

```text
Production database: fixdev
Development database: fixdev_dev
```

Jangan memakai database production untuk test development. Jangan menyalin credential production ke development. Jika membutuhkan akun yang sama secara visual/fungsional, gunakan sanitized seed account dengan credential development khusus.

### 1.4 Data yang tidak boleh dihapus

```text
uploads/
certs/
migrations/
src/
public/
tests/
test_data/
```

Khusus `uploads/`, perlakukan sebagai runtime data. Jangan menghapus, memindahkan, atau mengganti nama file tanpa backup dan inventory.

### 1.5 Secret

Dilarang menampilkan, commit, menulis ke dokumentasi, atau memasukkan ke ringkasan:

- password
- API key
- JWT secret
- token
- private key
- credential cloud
- connection string lengkap
- isi file environment
- dump database

Gunakan `[REDACTED]` untuk semua nilai sensitif.

---

## 2. Prinsip kerja agent

1. Baca dokumen ini sebelum mengubah file.
2. Baca `AGENTS.md`, `README.md`, dan `docs/FIXDEV_STABILIZATION_MASTER.md`.
3. Periksa `git status --short` dan `git diff --stat` sebelum bekerja.
4. Jangan menjalankan `git pull` pada working tree dirty.
5. Jangan menghapus file secara massal tanpa daftar path, alasan, dan verifikasi backup/runtime.
6. Jangan melakukan reset database production.
7. Jangan mengubah secret.
8. Jangan membuat endpoint baru tanpa auth, authorization, tenant scope, validation, dan test.
9. Jangan menerima `tenantId`, `branchId`, `userId`, atau scope sensitif dari client tanpa verifikasi server-side.
10. Jangan mengembalikan raw error database/internal ke client.
11. Jangan mengejar tampilan dengan mengorbankan aksesibilitas, keyboard navigation, mobile layout, atau performa.
12. Jangan menutup error dengan `catch {}` kosong tanpa logging dan status yang benar.
13. Setiap perubahan besar harus memiliki regression test.
14. Setiap perubahan UI besar harus memiliki screenshot/evidence atau browser verification.
15. Perubahan belum dianggap selesai sebelum quality gate lulus.
16. Jangan membuat commit/tag/push kecuali pengguna memintanya secara eksplisit.

---

## 3. Alur kerja standar

### Fase A — Inventarisasi

Jalankan:

```bash
cd /home/ubuntu/fixdev
git status --short
git diff --stat
npm run lint
npm test
npm audit --audit-level=high
```

Lalu periksa:

- root folder
- script aktif pada `package.json`
- PM2 ecosystem
- `.gitignore`
- environment metadata tanpa nilai secret
- route registration
- migration count/checksum
- file orphan/stale
- query SQL dinamis
- upload path handling
- raw error response
- test discovery

Output fase ini harus berupa tabel:

```text
ID | Severity | Area | Path:line | Bukti | Rencana | Status
```

### Fase B — Rencana kecil dan berurutan

Kelompokkan perubahan ke dalam:

1. security/auth/tenant
2. database/integrity
3. backend/API
4. runtime/deployment
5. UI/UX/visual
6. testing/observability
7. cleanup/documentation

Jangan mencampur perubahan database destruktif dengan cleanup file.

### Fase C — Implementasi akar masalah

Untuk setiap temuan:

1. buat reproduksi atau test RED;
2. ubah implementasi minimum yang benar;
3. jalankan test GREEN;
4. refactor bila perlu;
5. verifikasi diff dan side effect;
6. dokumentasikan keputusan.

### Fase D — Validasi berlapis

Jalankan seluruh gate pada bagian 13. Satu kegagalan berarti status belum selesai.

### Fase E — Handoff

Handoff wajib berisi:

- ringkasan perubahan
- daftar file
- command yang dijalankan
- output penting
- test pass/fail
- risiko tersisa
- langkah rollback
- apakah commit/push dilakukan

---

## 4. Target keamanan dan authorization

### 4.1 Authentication

Verifikasi semua jalur:

- login
- logout
- refresh token
- password reset
- onboarding
- owner invitation
- session expiry
- super admin session
- API token
- webhook signature

Kriteria:

- password tidak pernah dicatat ke log;
- token plaintext hanya muncul saat provisioning resmi;
- token database disimpan hashed;
- session invalid setelah logout/expiry;
- rate limit aktif pada login/onboarding/reset;
- error auth tidak membocorkan apakah email tertentu terdaftar;
- CORS dan cookie policy sesuai domain resmi.

### 4.2 Tenant isolation

Untuk setiap endpoint tenant:

- tenant ditentukan dari JWT/session/host yang tervalidasi;
- tenant ID dari query/body hanya dianggap sebagai input tidak tepercaya;
- actor tenant A tidak dapat membaca atau mengubah tenant B;
- super admin memiliki jalur eksplisit dan audit trail;
- branch scope diverifikasi terhadap tenant dan actor;
- object ID yang valid secara format tetapi milik tenant lain harus ditolak;
- response tidak membocorkan keberadaan object tenant lain.

Wajib membuat test matrix:

```text
Actor A → resource A: allow
Actor A → resource B: deny
Actor B → resource A: deny
Super Admin → resource sesuai permission: allow
Unauthenticated → protected route: deny
```

### 4.3 Input dan upload

Semua input wajib memiliki:

- schema validation
- batas panjang
- enum allowlist
- numeric/date validation
- UUID validation
- ownership check
- SQL parameterization
- file size limit
- MIME/extension validation
- magic-byte validation
- filename/path traversal protection

Dilarang:

- `eval`
- shell command dari input user
- SQL identifier dari input tanpa allowlist
- path upload yang dibentuk dari input mentah
- memercayai MIME client tanpa signature check

### 4.4 Error handling

Client hanya menerima pesan yang aman dan berguna:

```json
{"error":"Operasi gagal diproses."}
```

Server wajib mencatat:

- request ID
- actor/tenant ID yang tidak sensitif
- route
- operation
- error type
- stack trace internal bila perlu

Jangan mencatat password, token, connection string, atau payload sensitif.

---

## 5. Target database dan integritas transaksi

### 5.1 Migration policy

- migration diberi nomor berurutan;
- migration forward-only;
- checksum migration tidak boleh berubah setelah applied;
- migration production tidak otomatis saat deploy aplikasi;
- backup wajib sebelum migration production;
- migration harus bisa dijalankan ulang tanpa merusak data;
- destructive migration memerlukan rencana rollback dan persetujuan eksplisit;
- schema production dan repository harus dibandingkan setelah migration.

Command resmi:

```bash
npm run db:migrate:production
```

Gunakan wrapper:

```bash
bash ops/migrate-production.sh
```

Wrapper membuat backup terlebih dahulu.

### 5.2 Failure handling

Jika database tidak tersedia:

1. hentikan deploy/migration;
2. cek PostgreSQL, disk, connection limit, dan network;
3. cek log tanpa menampilkan credential;
4. verifikasi koneksi dengan command aman;
5. pulihkan database atau koneksi;
6. jalankan health/readiness check;
7. baru lanjutkan deployment.

Jika migration gagal:

1. jangan menghapus record migration;
2. jangan mengedit file migration yang sudah applied;
3. simpan error dan migration ID;
4. pastikan transaksi rollback;
5. buat migration perbaikan baru atau restore backup;
6. test di `fixdev_dev`;
7. ulangi dengan backup production baru.

### 5.3 Transactional business flow

Audit dan perbaiki terutama:

- POS sale
- inventory decrement
- payment confirmation
- invoice state transition
- refund
- stock adjustment
- journal/accounting posting
- notification outbox

Kriteria:

- operasi kritis atomic;
- concurrent request tidak menyebabkan oversell;
- gunakan transaction dan row locking sesuai kebutuhan;
- idempotency key untuk webhook/payment;
- retry aman;
- journal tidak boleh diam-diam dilewati tanpa status degraded/audit;
- partial success harus dapat dideteksi dan dipulihkan.

Wajib membuat test concurrent untuk inventory dan payment flow.

---

## 6. Target API dan backend

Untuk setiap route, dokumentasikan:

```text
METHOD | PATH | Auth | Permission | Tenant scope | Input schema | Success | Error | Audit
```

Pastikan:

- route yang terdaftar benar-benar memiliki handler;
- handler yang tidak punya route dihapus atau diimplementasikan;
- status HTTP konsisten;
- pagination memiliki limit maksimum;
- sort/filter memakai allowlist;
- response shape stabil;
- data sensitif tidak masuk response publik;
- webhook diverifikasi signature dan idempotency;
- public endpoint memiliki rate limit dan abuse protection.

`ServiceApprovalPortal` harus diputuskan secara final:

- implementasikan endpoint backend yang dibutuhkan; atau
- hapus komponen dan route mati secara terencana.

Tidak boleh dibiarkan sebagai fitur setengah terhubung.

---

## 7. Target visual dan UX

Prioritas visual: bersih, teratur, cepat dipahami, dan mudah dioperasikan.

### 7.1 Design system

Gunakan token terpusat untuk:

- warna
- typography
- spacing
- radius
- shadow
- border
- status color
- focus ring
- z-index
- motion

Jangan menulis warna/spacing acak berulang di setiap komponen.

### 7.2 Layout aplikasi

Setiap halaman wajib memiliki:

1. judul halaman yang jelas;
2. konteks tenant/cabang bila relevan;
3. primary action yang terlihat;
4. filter/search yang mudah ditemukan;
5. loading state;
6. empty state;
7. error state;
8. success feedback;
9. pagination/limit bila data besar;
10. responsive layout.

### 7.3 Dashboard dan tabel

- jangan memenuhi layar dengan kartu yang tidak actionable;
- gunakan hierarchy visual yang jelas;
- tabel harus terbaca pada mobile atau memiliki responsive strategy;
- action destruktif harus terpisah dan memiliki confirmation;
- status gunakan label + warna, bukan warna saja;
- angka penting harus memiliki format konsisten;
- jangan menampilkan raw ID jika user tidak membutuhkannya;
- gunakan skeleton/loading yang tidak menggeser layout secara berlebihan.

### 7.4 Aksesibilitas

Wajib memverifikasi:

- keyboard navigation;
- visible focus;
- label form;
- contrast;
- aria label pada icon-only button;
- modal focus trap;
- escape untuk menutup modal;
- error form terhubung ke field;
- ukuran target sentuh mobile memadai.

### 7.5 Bahasa dan copy

Gunakan Bahasa Indonesia yang natural, ringkas, dan operasional. Hindari:

- istilah internal database di UI;
- pesan error teknis;
- kalimat bot/keyword stuffing;
- action ambigu;
- tombol tanpa konteks.

---

## 8. Target performa dan scalability

Untuk kesiapan ribuan pengguna:

- semua list endpoint wajib pagination;
- query harus memiliki index yang sesuai;
- hindari N+1 query;
- gunakan connection pool dengan batas aman;
- proses berat memakai queue/outbox;
- upload tidak dibaca seluruhnya ke memory tanpa limit;
- cache hanya untuk data yang aman dan invalidation jelas;
- log memiliki rotation;
- health/readiness dan metrics tersedia;
- frontend lazy-load modul besar;
- bundle besar dipecah berdasarkan area fitur;
- image/file delivery tidak memblokir request utama;
- error rate dan latency dapat diobservasi.

Target awal yang harus diukur, bukan ditebak:

```text
p95 read API < 500 ms pada beban normal
p95 write API < 800 ms pada beban normal
error rate < 1%
no unbounded query
no unbounded upload
```

Angka final harus berdasarkan load test yang disimpan sebagai evidence.

---

## 9. Cleanup dan struktur repository

Root repository hanya boleh berisi:

- source/config utama;
- dokumen aturan tingkat proyek yang memang aktif;
- `package.json` dan lockfile;
- schema/migration penting;
- README.

Folder operasi wajib:

```text
ops/
```

Artifact yang boleh dibersihkan dan dibuat ulang:

```text
dist/
logs/
coverage/
test-results/
screenshots-bukti/
```

Jangan menghapus runtime data atau material certificate tanpa prosedur backup.

Setelah cleanup:

```bash
git status --short
git diff --check
npm run build
```

---

## 10. Deployment dan rollback

### 10.1 Normal deployment

```bash
# Development
npm run lint
npm test
npm run build
bash ops/push.sh "type: ringkasan perubahan"

# Production server
bash ops/deploy.sh
bash ops/health.sh
```

### 10.2 Production migration

```bash
bash ops/migrate-production.sh
bash ops/health.sh
```

Migration production harus dilakukan terpisah dari deploy kode agar kegagalan schema tidak mengacaukan release aplikasi.

### 10.3 Application rollback

```bash
bash ops/rollback-code.sh <commit-baik>
```

Jika migration sudah applied, rollback aplikasi tidak otomatis membatalkan migration. Tentukan compatibility antara kode lama dan schema baru sebelum rollback.

### 10.4 PM2/Nginx

Pastikan:

```text
fixdev-erp online
fixdev-dev online
pm2-ubuntu enabled + active
127.0.0.1:3000 listening
127.0.0.1:3001 listening
Nginx → 3000 untuk production
Nginx → 3001 untuk development
```

---

## 11. Testing wajib

### 11.1 Static/quality

```bash
npm run lint
npm test
npm run build
git diff --check
npm audit --audit-level=high
bash -n ops/*.sh
```

### 11.2 Test discovery

```bash
npx playwright test --list --config=playwright.config.ts
```

### 11.3 API/security

Wajib menguji:

- unauthenticated access;
- invalid token;
- expired token;
- cross-tenant access;
- cross-branch access;
- IDOR;
- mass assignment;
- invalid UUID;
- SQL injection payload;
- path traversal;
- upload signature mismatch;
- oversized upload;
- webhook replay;
- rate-limit behavior;
- generic internal errors.

### 11.4 Browser/UI

Untuk setiap modul utama, verifikasi:

- login;
- dashboard;
- service ticket;
- inventory;
- POS;
- accounting;
- CRM;
- HR;
- billing;
- settings;
- super admin;
- customer portal;
- responsive mobile.

Bukti dapat berupa test output, screenshot, atau rekaman browser test yang tidak mengandung credential.

### 11.5 Runtime

```bash
pm2 list
pm2 save
systemctl is-enabled pm2-ubuntu
systemctl is-active pm2-ubuntu
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health
ss -ltnp | grep -E ':3000|:3001'
```

---

## 12. Definition of Done — Strict 100%

Target release adalah **100% selesai terhadap seluruh scope proyek dan seluruh acceptance gate**. Tidak ada status setengah jadi yang boleh dipromosikan ke production.

Pekerjaan hanya berstatus **DONE / RELEASE-READY** jika seluruh checklist berikut bernilai PASS dan memiliki evidence:

- [ ] tidak ada TODO/FIXME terkait scope aktif;
- [ ] tidak ada route mati tanpa keputusan final;
- [ ] tidak ada raw internal error response;
- [ ] tidak ada token/password/credential/private key di source, log, test, docs, atau artifact;
- [ ] tenant isolation test lulus;
- [ ] branch scope test lulus;
- [ ] upload security test lulus;
- [ ] payment/idempotency test lulus;
- [ ] inventory concurrency test lulus;
- [ ] migration checksum cocok;
- [ ] backup dan restore benar-benar diverifikasi;
- [ ] production dan development profile tidak tertukar;
- [ ] role database production/development telah terisolasi;
- [ ] PM2 kedua mode online dan recovery teruji;
- [ ] Nginx/TLS/DNS/health lulus;
- [ ] lint, unit, security, build, audit lulus;
- [ ] browser discovery dan smoke flow semua modul lulus;
- [ ] visual review desktop/tablet/mobile selesai;
- [ ] accessibility review selesai;
- [ ] performance/load evidence memenuhi target;
- [ ] cleanup tidak menghapus runtime data;
- [ ] working tree bersih sebelum release;
- [ ] rollback kode dan database telah diuji atau memiliki prosedur terverifikasi;
- [ ] semua temuan severity critical/high/medium ditutup;
- [ ] tidak ada known bug yang disembunyikan atau ditunda;
- [ ] handoff berisi bukti command, artifact, dan hasil aktual;
- [ ] `Risks` pada laporan handoff kosong atau seluruh item sudah ditutup.

### Strict release rule

- Satu checkbox gagal = **NOT READY**.
- Satu test gagal = **NOT READY**.
- Satu known bug yang memengaruhi scope = **NOT READY**.
- Satu secret exposure = **NOT READY**.
- Satu migration mismatch = **NOT READY**.
- Satu endpoint critical tanpa authorization test = **NOT READY**.
- Agent dilarang menggunakan kata “selesai”, “aman”, “keren”, atau “production-ready” sebelum gate 100% lulus.
- Tidak boleh memakai status `PARTIAL` sebagai hasil release.
- Jika ada blocker, agent wajib memperbaikinya atau menghentikan handoff dengan status `NOT READY` dan bukti blocker yang nyata.

Angka 100% di sini berarti seluruh requirement, test, evidence, dan acceptance criteria yang didefinisikan proyek sudah dipenuhi. Tidak ada sistem yang dapat membuktikan bug matematis nol tanpa batas pengujian tak terbatas; karena itu agent wajib menggunakan test, static scan, browser verification, load test, monitoring, dan rollback evidence sebagai bukti engineering yang terukur.

Jangan menyebut hasil sebagai production-ready sebelum seluruh aturan di atas lulus.

---

## 13. Format laporan agent

Setiap agent wajib mengembalikan:

```markdown
## Scope
...

## Changes
- path:line — perubahan

## Verification
- command: result

## Security
- finding resolved:
- finding remaining:

## Runtime
- production:
- development:

## Database
- migration status:
- backup status:
- destructive action: none / detail

## UI/UX
- desktop:
- mobile:
- accessibility:

## Risks
- ...

## Handoff
- next exact command:
- commit/push performed: yes/no
```

Tidak boleh menulis “semua aman” tanpa daftar bukti yang mendukung.

---

## 14. Prioritas implementasi tersisa

Kerjakan dalam urutan ini:

1. Pisahkan role PostgreSQL development dari production.
2. Buat sanitized seed account dan fixture development.
3. Tutup atau implementasikan `ServiceApprovalPortal`.
4. Perbaiki atomicity POS/inventory dan buat concurrent tests.
5. Tegaskan fail-closed/fail-safe pada journal accounting.
6. Tutup raw error yang tersisa melalui static guard dan logger konsisten.
7. Tambahkan readiness check database yang aman untuk monitoring internal.
8. Audit seluruh route dan permission matrix.
9. Pecah frontend bundle besar berdasarkan fitur.
10. Jalankan browser smoke test per modul.
11. Jalankan load test dan simpan hasil.
12. Bereskan warning Nginx/Hestia `db.fixdev.web.id`.
13. Uji recovery PM2 dan database secara terukur.
14. Baru lakukan release sign-off.

---

## 15. Hasil yang diharapkan

Hasil akhir bukan hanya aplikasi yang “bisa dibuka”, tetapi sistem yang:

- mudah dipahami operator;
- visualnya bersih dan konsisten;
- aman untuk multi-tenant;
- tidak mudah salah konfigurasi;
- memiliki workflow push/deploy sederhana;
- memiliki prosedur database yang jelas;
- dapat dipantau;
- dapat di-rollback;
- memiliki test dan evidence;
- tidak menyimpan sampah, secret, atau script eksperimen;
- dapat dikembangkan oleh agent/engineer lain tanpa menebak-nebak.
