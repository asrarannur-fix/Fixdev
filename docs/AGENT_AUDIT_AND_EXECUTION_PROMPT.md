# FIXDEV — Prompt Audit dan Eksekusi Agent

> File ini adalah prompt siap-copy untuk agent coding/audit lain.
>
> Gunakan bersama:
>
> - `docs/FIXDEV_STABILIZATION_MASTER.md`
> - `docs/MODULE_CATALOG_INTEGRATION_MAP.md`
> - `ops/README.md`
> - `AGENTS.md`

---

## Prompt siap pakai

```text
Anda bekerja di repository FixDev ERP pada:

/home/ubuntu/fixdev

Baca terlebih dahulu dan patuhi seluruh isi:

1. AGENTS.md
2. README.md
3. docs/FIXDEV_STABILIZATION_MASTER.md
4. docs/MODULE_CATALOG_INTEGRATION_MAP.md
5. docs/AGENT_EXECUTION_MASTER_PLAN.md
6. ops/README.md

TUJUAN UTAMA
============

Selesaikan proyek FixDev secara menyeluruh sampai seluruh acceptance gate bernilai PASS. Jangan membuat patch setengah jadi. Jangan hanya membuat laporan. Audit akar masalah, perbaiki implementasi, buat regression test, jalankan verifikasi, dan dokumentasikan evidence.

Target akhir:

- semua modul memiliki fungsi nyata;
- semua submodul memiliki alur kerja yang jelas;
- semua frontend terhubung ke backend yang benar;
- semua backend memiliki auth, permission, tenant scope, branch scope, validation, audit, dan error handling;
- semua integrasi antar-modul konsisten;
- tidak ada route mati atau komponen orphan;
- tidak ada raw internal error;
- tidak ada secret exposure;
- tidak ada race condition transaksi kritis yang belum ditutup;
- database migration konsisten dan recovery terverifikasi;
- UI bersih, konsisten, responsive, accessible, dan mudah dioperasikan;
- deployment dan rollback sederhana serta dapat dibuktikan;
- seluruh test dan evidence lulus.

ATURAN KESELAMATAN
==================

1. Source canonical hanya /home/ubuntu/fixdev.
2. Jangan gunakan /var/www/fixdev sebagai source runtime.
3. Jangan mengubah secret atau menampilkan nilai secret.
4. Jangan commit, tag, push, reset, atau melakukan operasi destruktif tanpa instruksi eksplisit pemilik.
5. Jangan menjalankan git pull jika working tree dirty.
6. Jangan reset/drop database production.
7. Jangan menghapus uploads/, certs/, migrations/, src/, tests/, public/, atau test_data/.
8. Cache/artifact boleh dibersihkan hanya jika dapat dibuat ulang dan runtime tetap aman.
9. Semua nilai password, token, private key, API key, dan connection string harus [REDACTED].
10. Jika menemukan blocker, jangan menutupinya. Hentikan scope dengan status NOT READY dan bukti error.
11. Jangan menyatakan “100%”, “aman”, atau “production-ready” tanpa evidence aktual.
12. Jika perubahan membutuhkan keputusan bisnis, dokumentasikan keputusan yang diperlukan dan jangan menebak.

RUNTIME YANG HARUS DIPERTAHANKAN
=================================

Production:
- PM2: fixdev-erp
- Entry: dist/server.cjs
- NODE_ENV=production
- FIXDEV_PROFILE=production
- FIXDEV_DATABASE_NAME=fixdev
- Port: 3000
- Bind: 127.0.0.1
- URL: https://fixdev.web.id
- Environment: /etc/fixdev/fixdev.production.env

Development:
- PM2: fixdev-dev
- Entry: node_modules/.bin/tsx server.ts
- NODE_ENV=development
- FIXDEV_PROFILE=development
- FIXDEV_DATABASE_NAME=fixdev_dev
- Port: 3001
- Bind: 127.0.0.1
- URL: https://dev.fixdev.web.id
- Environment: /home/ubuntu/fixdev/.env.dev

Development tidak boleh membaca database production. Production tidak boleh membaca database development. Jangan menyalin credential production ke development.

FASE 0 — KONDISI AWAL DAN INVENTARISASI
=======================================

Jalankan dan simpan output non-secret:

cd /home/ubuntu/fixdev
git status --short
git diff --stat
git branch --show-current
npm run lint
npm test
npm audit --audit-level=high
bash -n ops/*.sh
npx playwright test --list --config=playwright.config.ts
pm2 list
ss -ltnp | grep -E ':3000|:3001' || true
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health

Audit file dan folder:

- root files;
- src/components;
- src/config;
- src/server/routes;
- src/server/controllers;
- src/middleware;
- migrations;
- tests;
- ops;
- uploads metadata tanpa isi sensitif;
- certs metadata tanpa isi private key;
- dist/log/cache artifact.

Buat tabel temuan:

ID | Severity | Area | Path:line | Bukti | Dampak | Fix | Test | Status

Jangan lanjut ke implementasi sebelum memahami entrypoint, route registration, auth middleware, tenant resolver, DB helper, dan navigation config.

FASE 1 — PETAKAN MODUL DAN SUBMODUL
===================================

Gunakan docs/MODULE_CATALOG_INTEGRATION_MAP.md sebagai baseline, lalu cocokkan dengan implementasi nyata.

Audit modul berikut satu per satu:

1. Dashboard
2. Servis
3. POS
4. Inventory
5. Keuangan
6. HR
7. CRM
8. Keamanan/Audit
9. Data Manager
10. Billing/Subscription
11. Settings/Configuration
12. WhatsApp
13. Telegram
14. QZ Printer
15. Developer API
16. Customer Portal
17. Super Admin
18. Backup/Monitoring

Untuk setiap modul, isi dan verifikasi:

- navigation entry;
- frontend component;
- submodule;
- backend route;
- controller/service;
- database table/query;
- actor/role;
- tenant scope;
- branch scope;
- input schema;
- state machine;
- side effects;
- audit event;
- notification event;
- error behavior;
- unit test;
- security test;
- browser test;
- responsive behavior;
- status READY/NOT READY.

Jika menu ada tetapi backend tidak ada, implementasikan atau hapus dengan keputusan final. Jangan membiarkan tombol/komponen palsu.

FASE 2 — AUDIT SECURITY DAN AUTHORIZATION
=========================================

Audit seluruh route dan endpoint terhadap:

- authentication;
- role;
- permission;
- tenant scope;
- branch scope;
- object ownership;
- input validation;
- pagination limit;
- sort/filter allowlist;
- raw error exposure;
- rate limit;
- upload safety;
- replay/idempotency;
- audit log.

Buat matrix minimal:

Actor A → tenant A resource: ALLOW
Actor A → tenant B resource: DENY
Actor B → tenant A resource: DENY
Branch A → Branch B resource: DENY
Super Admin → permission sesuai: ALLOW
Unauthenticated → protected route: DENY
Expired token → protected route: DENY
API token tenant mismatch → DENY

Tambahkan regression test untuk setiap temuan.

FASE 3 — AUDIT DATABASE DAN TRANSAKSI
======================================

Verifikasi:

- jumlah migration local vs production;
- checksum migration;
- schema_migrations;
- index dan foreign key penting;
- transaction boundary;
- advisory lock migration;
- backup command;
- restore command/procedure;
- database role isolation;
- connection pool;
- query timeout;
- N+1 query;
- unbounded list query.

Audit transaksi kritis:

1. POS sale dan void;
2. inventory decrement/increment;
3. transfer stock;
4. service part usage;
5. purchase receiving;
6. invoice/payment;
7. payment webhook;
8. refund/reversal;
9. accounting journal;
10. notification outbox.

Wajib memperbaiki:

- oversell concurrent;
- duplicate submit;
- partial success;
- silent journal failure;
- double webhook;
- invalid state transition;
- stock negative tanpa policy;
- delete history financial.

Gunakan transaction, locking, idempotency key, reversal record, dan audit sesuai kebutuhan.

Jangan melakukan migration production tanpa backup. Gunakan:

bash ops/migrate-production.sh

FASE 4 — AUDIT FLOW BISNIS END-TO-END
=====================================

Verifikasi alur berikut dari frontend sampai database dan kembali ke UI:

A. Service:
customer → device → reception → ticket → diagnosis → estimate → approval → parts → work → QC → payment → handover → warranty → CRM.

B. POS:
open shift → cart → price validation → stock lock → sale → payment → journal → receipt → CRM.

C. Inventory:
low stock → purchase order → receiving → stock ledger → accounting.

D. Billing:
plan → subscription → invoice → Midtrans/manual payment → verification → paid → entitlement → notification.

E. HR:
staff → branch/role → attendance → payroll/commission → accounting.

F. CRM:
customer → activity → service/POS history → campaign/notification → opt-out.

Untuk setiap alur, uji:

- happy path;
- invalid input;
- permission denied;
- tenant mismatch;
- database error;
- duplicate request;
- retry;
- reload/browser refresh;
- mobile layout;
- audit record.

FASE 5 — AUDIT FRONTEND DAN VISUAL UX
=====================================

Audit setiap halaman dan subtab:

- hierarchy visual;
- primary action;
- navigation clarity;
- consistent spacing/token;
- typography;
- contrast;
- loading state;
- empty state;
- error state;
- success feedback;
- form validation;
- destructive confirmation;
- keyboard navigation;
- focus ring;
- screen reader label;
- mobile/tablet layout;
- large table behavior;
- pagination/filter/search;
- bundle/lazy-load behavior.

Perbaiki visual yang:

- padat dan membingungkan;
- terlalu banyak card tidak actionable;
- memakai label teknis;
- memakai tombol icon tanpa label;
- tidak membedakan status selain warna;
- menampilkan toast palsu;
- memiliki orphan panel;
- tidak memberi feedback saat request berjalan.

Gunakan Bahasa Indonesia natural dan konsisten.

FASE 6 — AUDIT INTEGRASI EKSTERNAL
===================================

Audit:

- Midtrans webhook;
- WhatsApp connector;
- Telegram bot;
- QZ Tray certificate/signing;
- storage/upload;
- backup;
- Developer API v1;
- Nginx/TLS;
- PM2/systemd.

Untuk setiap integrasi dokumentasikan:

- credential source;
- timeout;
- retry;
- idempotency;
- failure state;
- log/audit;
- user feedback;
- disable/degraded mode;
- test method.

FASE 7 — IMPLEMENTASI DAN TEST
==============================

Jangan hanya membuat laporan. Untuk setiap temuan yang dapat diperbaiki:

1. buat test reproduksi;
2. lakukan fix akar masalah;
3. jalankan test yang relevan;
4. cek diff;
5. cek side effect;
6. update dokumentasi;
7. ulangi audit pada area yang sama.

Minimal quality gate:

npm run lint
npm test
npm run build
git diff --check
npm audit --audit-level=high
bash -n ops/*.sh
npx playwright test --list --config=playwright.config.ts

Jika credential test resmi tersedia, jalankan browser smoke test. Jangan bypass CAPTCHA, OTP, atau login resmi.

FASE 8 — RUNTIME DAN RECOVERY
=============================

Verifikasi:

pm2 list
pm2 save
systemctl is-enabled pm2-ubuntu
systemctl is-active pm2-ubuntu
ss -ltnp | grep -E ':3000|:3001'
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health

Uji secara aman:

- restart production hanya melalui ops/deploy.sh;
- development tetap online saat production restart;
- PM2 recovery;
- health setelah restart;
- database readiness internal;
- log tidak berisi secret;
- artifact dist tersedia setelah build.

Jangan reboot host atau melakukan restore production tanpa persetujuan eksplisit.

FASE 9 — CLEANUP
=================

Cari dan tangani:

- script eksperimen;
- file stale;
- route mati;
- component orphan;
- screenshot/cache/log lama;
- duplicate docs;
- hardcoded secret;
- generated artifact yang tidak perlu dilacak.

Pertahankan:

- uploads;
- certs;
- migration;
- source;
- tests;
- fixture yang memang dipakai;
- config aktif.

Setiap deletion wajib dilaporkan path + alasan + verifikasi bahwa bukan runtime data.

FASE 10 — STRICT 100% GATE
==========================

Status akhir hanya salah satu:

DONE / RELEASE-READY
atau
NOT READY

Tidak boleh menggunakan PARTIAL sebagai hasil release.

DONE hanya jika:

- semua modul dan submodul memiliki fungsi nyata;
- semua integration contract memiliki producer/consumer;
- semua critical/high/medium findings ditutup;
- tidak ada known bug terkait scope;
- tidak ada TODO/FIXME terkait scope;
- tidak ada orphan route/component;
- semua test pass;
- semua runtime check pass;
- database backup/restore diverifikasi;
- migration checksum cocok;
- UI desktop/tablet/mobile pass;
- accessibility pass;
- load/performance evidence tersedia;
- working tree bersih;
- rollback terverifikasi;
- Risks kosong.

Jika satu item gagal, jangan mengklaim 100%.

FORMAT OUTPUT WAJIB
===================

## Status
DONE / RELEASE-READY atau NOT READY

## Scope audited
Daftar modul, submodul, route, controller, dan komponen yang diperiksa.

## Findings
| ID | Severity | Area | Path:line | Bukti | Fix | Test | Status |

## Implemented changes
- path:line — perubahan dan alasan

## Module matrix
| Modul | Submodul | Frontend | Backend | DB | Auth | Integration | Test | Status |

## Integration flows
- Service:
- POS:
- Inventory:
- Accounting:
- Billing:
- HR:
- CRM:

## Verification commands
Tuliskan command persis dan hasil aktualnya.

## Security result
- tenant isolation:
- branch isolation:
- raw error scan:
- secret scan:
- upload validation:
- rate limit:

## Database result
- migration count:
- checksum:
- backup:
- restore:
- transaction/concurrency:

## UI/UX result
- desktop:
- tablet:
- mobile:
- accessibility:
- visual evidence:

## Runtime result
- PM2:
- ports:
- Nginx/TLS:
- production health:
- development health:

## Risks
Kosong jika DONE. Jika tidak kosong, status harus NOT READY.

## Commit/push
Nyatakan hanya fakta. Jangan commit/push tanpa instruksi pemilik.

FINAL RULE
==========

Jangan berhenti setelah menemukan masalah.
Jangan memperbaiki satu file lalu menyebut proyek selesai.
Jangan menyembunyikan error.
Jangan mengarang output.
Jangan menghapus runtime data.
Jangan melewati database backup.
Jangan menampilkan secret.

Kerjakan sampai bukti 100% tersedia atau laporkan NOT READY dengan blocker yang benar-benar terverifikasi.
```

---

## Urutan audit yang benar

Gunakan urutan berikut, jangan mulai dari kosmetik UI:

```text
1. source dan runtime
2. environment dan database boundary
3. server startup dan route registration
4. authentication dan authorization
5. tenant/branch isolation
6. database schema dan migration
7. transaksi POS/inventory/payment/accounting
8. service workflow end-to-end
9. frontend-to-backend integration
10. external integration
11. visual UX/accessibility
12. performance/load
13. cleanup
14. deploy/rollback/recovery
15. final 100% gate
```

Alasannya: UI dapat terlihat bagus tetapi tetap salah jika authorization, database, atau transaksi belum benar.

---

## Pembagian agent yang disarankan

Jika memakai beberapa agent, gunakan worktree/branch terpisah dan jangan dua agent mengubah file yang sama.

```text
Agent A — Backend/Auth/Tenant
Agent B — Database/Transaction/Accounting
Agent C — Frontend/Visual/Accessibility
Agent D — E2E/Performance/Operations
```

Setiap agent wajib mengembalikan format output di atas. Agent utama kemudian melakukan merge review, menjalankan semua quality gate, dan menentukan DONE/NOT READY.
