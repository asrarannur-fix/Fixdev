# FIXDEV — Module, Submodule, Function, and Integration Map

> Peta fungsional resmi untuk agent/engineer/designer yang melanjutkan FixDev ERP.
>
> Dokumen ini menjelaskan **modul**, **submodul**, **fungsi**, **alur kerja**, **integrasi data**, **route backend**, **role**, dan **acceptance criteria**. Nama modul harus konsisten dengan dokumen ini dan `src/config/nav.config.ts`.

---

## 1. Cara membaca sistem

```text
User / Customer
      ↓
Frontend module
      ↓
apiFetch / authenticated request
      ↓
Express route
      ↓
Authentication + permission + tenant scope
      ↓
Controller / service logic
      ↓
PostgreSQL transaction
      ↓
Audit log / outbox / notification
      ↓
Frontend refresh + status feedback
```

### Boundary wajib

Setiap operasi bisnis harus melewati:

1. authentication;
2. tenant scope;
3. branch scope bila berlaku;
4. permission/role;
5. input schema validation;
6. business rule;
7. database transaction untuk operasi kritis;
8. audit trail;
9. safe response ke client.

Tidak boleh ada frontend yang langsung dipercaya untuk menentukan:

- tenant;
- branch;
- owner data;
- harga final;
- diskon final;
- stok final;
- status pembayaran;
- status approval;
- status ticket;
- journal/accounting result.

---

## 2. Aktor sistem

| Aktor | Fungsi utama | Batasan |
|---|---|---|
| `SUPER_ADMIN` | Mengelola platform, tenant, billing, operasional global | Tidak boleh melewati audit/permission |
| `OWNER` | Pemilik tenant, konfigurasi, staff, laporan, transaksi | Scope tenant sendiri |
| `ADMIN` | Operasi tenant dan konfigurasi yang diizinkan | Scope tenant/branch sesuai assignment |
| `MANAGER` | Supervisi POS, inventory, laporan, approval tertentu | Tidak boleh mengubah area OWNER-only |
| `CS` | Customer service, penerimaan, approval, komunikasi | Tidak boleh mengubah accounting/permission kritis |
| `TEKNISI` | Diagnosis, pengerjaan, parts request, QC | Tidak boleh mengubah harga/approval final tanpa permission |
| `KASIR` | Shift, penjualan, pembayaran POS | Tidak boleh void/adjust tanpa manager |
| `CUSTOMER` | Portal tracking, approval estimate, warranty request | Hanya data milik ticket/customer melalui token/host tervalidasi |
| `API_CLIENT` | Integrasi machine-to-machine melalui API token | Tenant, branch, abilities, dan expiry wajib diverifikasi |

---

## 3. Modul operasional utama

Modul utama yang tampil di navigation:

```text
Dashboard
Servis
POS
Inventory
Keuangan
HR
CRM
Keamanan
Data Manager
```

Modul konfigurasi:

```text
Branding
Multi-Cabang
WhatsApp
Telegram
Notifikasi
Workflow Builder
Hak Akses & Staff
Parameter & Modul
Printer & Nota
Developer API
SaaS Subscription
Impor/Ekspor
Voucher & Loyalty
Maintenance Contract
Cloud Storage
Operasional ERP
Aplikasi & Tampilan
Keamanan & Login
Backup & Audit
```

---

# 4. Dashboard

## Tujuan

Memberikan ringkasan operasional yang dapat langsung ditindaklanjuti.

## Submodul

- KPI servis aktif;
- ticket menunggu diagnosis;
- ticket menunggu approval;
- ticket dalam pengerjaan;
- ticket menunggu QC;
- ticket siap diambil;
- warranty claim terbuka;
- penjualan hari ini;
- kasir/shift aktif;
- stok menipis;
- purchase order pending;
- invoice/billing overdue;
- notifikasi gagal;
- incident/security alert.

## Alur kerja

```text
Dashboard load
  → bootstrap tenant + permission
  → query KPI tenant/branch
  → tampilkan card + list actionable
  → klik KPI
  → buka modul dengan filter yang sama
```

## Integrasi

- Servis: ticket count dan aging;
- POS: sales dan shift;
- Inventory: low stock dan transfer;
- Accounting: revenue/cash/ledger;
- Billing: invoice/subscription;
- Security: audit/fraud/incident;
- HR: attendance/payroll summary.

## Acceptance criteria

- Tidak ada KPI dari tenant lain;
- angka memiliki timestamp dan periode;
- klik card membuka data sumber;
- loading/empty/error state lengkap;
- query memakai pagination/aggregation aman;
- dashboard tidak memuat seluruh tabel besar sekaligus.

---

# 5. Servis / Service Operations

**Frontend utama:** `ServicesTab`, `ServiceReceptionWizard`, `ServiceList`, `TicketEditorDock`, `QCChecklistModal`, `DocumentPrintouts`, `HandoverPanel`, `WarrantyPanel`, `SparepartsLedger`, `QueuePanel`, `WhatsAppHub`, `ServiceCostCalculator`, `ServiceTrackerQr`.

**Backend:** `/api/service-receptions`, `/api/services`, `/api/service-tracking`, `/api/complaint-templates`.

## 5.1 Penerimaan / Service Reception

### Fungsi

- membuat customer;
- mencari customer lama;
- mendaftarkan device;
- mencatat keluhan;
- mencatat kondisi fisik;
- upload foto penerimaan;
- memilih branch;
- membuat ticket number;
- mencetak tanda terima;
- membuat QR tracker;
- menghitung estimasi awal.

### Route

```text
/api/service-receptions
```

### Alur

```text
Customer
  → device + complaint
  → inspection awal
  → estimasi awal
  → ticket dibuat: RECEIVED
  → QR/token tracking dibuat
  → customer menerima tanda terima/notifikasi
```

### Integrasi

- CRM/customer master;
- branch;
- service catalog;
- complaint template;
- QR tracker;
- WhatsApp/Telegram notification;
- audit log.

## 5.2 Daftar dan detail ticket

### Fungsi

- list ticket dengan filter status, branch, technician, aging;
- membuka detail ticket;
- melihat timeline;
- melihat customer/device history;
- melihat diagnosis, parts, costs, payment, QC, handover;
- mencetak dokumen.

### Route

```text
GET  /api/services
GET  /api/services/:id
```

### Wajib

- tenant/branch ownership check;
- pagination;
- filter allowlist;
- tidak membocorkan ticket tenant lain;
- status transition hanya melalui endpoint resmi.

## 5.3 Diagnosis

### Fungsi

- teknisi mencatat hasil pemeriksaan;
- severity dan root cause;
- estimasi parts/labor;
- rekomendasi tindakan;
- attachment/foto;
- status menjadi `DIAGNOSED` atau `WAITING_APPROVAL`.

### Route

```text
POST /api/services/:id/diagnosis
```

### Integrasi

- service catalog;
- inventory availability;
- spareparts ledger;
- customer approval;
- notification.

## 5.4 Approval estimate

### Fungsi

- customer menyetujui/menolak estimasi;
- CS/owner mencatat approval manual bila diperlukan;
- tambahan biaya harus memiliki alasan dan approval baru;
- status menjadi `APPROVED`, `REJECTED`, atau `WAITING_APPROVAL`.

### Route

```text
POST /api/services/:id/approval
```

### Aturan

- harga final dihitung server-side;
- approval harus immutable/audit-able;
- perubahan setelah approval menjadi additional-cost flow;
- customer tidak boleh mengubah tenant/ticket target dari request.

## 5.5 Pengerjaan dan workflow transition

### Route

```text
POST /api/services/:id/transition
PATCH /api/services/:id/work-metadata
```

### State machine minimum

```text
RECEIVED
  → DIAGNOSIS
  → WAITING_APPROVAL
  → APPROVED
  → IN_PROGRESS
  → WAITING_PARTS
  → READY_FOR_QC
  → QC_FAILED / QC_PASSED
  → READY_FOR_HANDOVER
  → HANDED_OVER
  → CLOSED
```

State tambahan harus didefinisikan dengan:

- siapa yang boleh mengubah;
- state asal yang valid;
- state tujuan yang valid;
- side effect database;
- audit event;
- notification event;
- rollback/recovery behavior.

## 5.6 Parts request dan part orders

### Fungsi

- request sparepart dari inventory;
- membuat order part;
- menerima part;
- membatalkan order;
- mencatat pemakaian part;
- menambahkan biaya part ke ticket;
- menjaga hubungan ticket ↔ inventory movement.

### Route

```text
POST /api/services/:id/part-orders
PUT  /api/services/:id/part-orders/:orderId
POST /api/services/:id/part-orders/:orderId/receive
POST /api/services/:id/part-orders/:orderId/cancel
POST /api/services/:id/request-part
POST /api/services/:id/additional-costs
```

### Integrasi

```text
Ticket
  → part request
  → inventory reservation
  → purchase order bila stok kurang
  → receiving
  → stock movement
  → ticket cost
  → invoice/POS/accounting
```

## 5.7 QC

### Fungsi

- checklist kualitas;
- foto hasil pekerjaan;
- teknisi/QC reviewer;
- pass/fail;
- alasan fail;
- rework loop.

### Route

```text
POST /api/services/:id/qc
```

### Aturan

QC pass tidak boleh dilakukan jika required checklist belum lengkap. QC fail harus mengembalikan ticket ke state pengerjaan dengan alasan yang jelas.

## 5.8 Handover

### Fungsi

- verifikasi customer;
- verifikasi pembayaran;
- serah terima device;
- tanda tangan/bukti;
- cetak dokumen;
- update warranty;
- close ticket.

### Route

```text
POST /api/services/:id/handover
```

### Integrasi

- billing/payment;
- POS/cashier;
- warranty;
- CRM history;
- notification;
- audit.

## 5.9 Warranty

### Fungsi

- warranty period;
- claim;
- diagnosis claim;
- approve/reject;
- link ke ticket asal;
- anti-abuse dan duplicate claim.

Public tracking/warranty wajib mengambil tenant dari hostname tervalidasi.

## 5.10 Customer portal dan QR tracker

### Fungsi customer

- cek status ticket;
- melihat timeline aman;
- melihat approval estimate;
- menyetujui/menolak;
- melihat instruksi pengambilan;
- mengajukan warranty.

### Aturan security

- token/QR tidak boleh menjadi akses global;
- ticket harus terikat ke tenant;
- response publik tidak menampilkan data internal;
- ID ticket lain tidak boleh dapat ditebak untuk membaca data;
- link expired/revocable.

---

# 6. POS / Point of Sale

**Frontend:** `POSTab`.

**Backend:** `/api/pos` dan `pos.controller.ts`.

## Submodul

- kasir/terminal;
- open shift;
- close shift;
- cash in/out;
- sale transaction;
- sale history;
- void sale;
- receipt/print;
- marketplace hub;
- payment method;
- reconciliation.

## Route

```text
POST /api/pos/shifts/open
POST /api/pos/shifts/close
GET  /api/pos/shifts
GET  /api/pos/shifts/:id/summary
POST /api/pos/sales
GET  /api/pos/sales
GET  /api/pos/sales/:id
POST /api/pos/sales/:id/void
```

## Alur penjualan

```text
Open shift
  → pilih customer / walk-in
  → pilih product/service
  → server hitung harga, tax, discount
  → validasi stok atomic
  → create sale
  → reserve/decrement stock
  → create payment
  → create journal/outbox
  → print/send receipt
  → update dashboard/CRM
```

## Role

- `KASIR`: open/close shift dan sale;
- `MANAGER`: void dan reconciliation;
- `OWNER/ADMIN`: konfigurasi dan review;
- `SUPER_ADMIN`: hanya bila permission platform relevan.

## Wajib ditutup agent

- oversell concurrent;
- duplicate submit;
- void setelah periode close;
- payment mismatch;
- journal skip tanpa status;
- stock reversal saat void.

---

# 7. Inventory / Gudang

**Frontend:** `InventoryStockPanel`, `InventoryTransferPanel`, `SmallPartsSearch`, `CannibalWorkshop`, komponen lokasi/aset/konsinyasi.

**Backend:** `/api/crud`, `/api/purchasing`, `/api/services`, `/api/pos`.

## Submodul

- product master;
- category/brand/unit;
- stock balance;
- warehouse;
- storage location;
- stock transfer;
- stock adjustment;
- spare parts ledger;
- trade-in;
- cannibal parts;
- fixed assets;
- consignment;
- purchase order;
- receiving;
- low-stock alert.

## Alur stok

```text
Master product
  → warehouse/location
  → opening balance
  → purchase receiving / transfer / sale / service usage
  → stock movement ledger
  → balance recalculation
  → low stock alert
```

## Integrasi

```text
POS sale             → stock decrement
POS void             → stock reversal
Service part usage   → stock decrement + ticket cost
Purchase receiving   → stock increment + payable
Transfer             → source decrement + destination increment
Cannibal             → source asset/part decrement + recovered part increment
Accounting           → inventory valuation/journal
```

## Wajib

- setiap perubahan stok memiliki movement record;
- saldo tidak diedit langsung tanpa audit;
- quantity tidak boleh negatif kecuali policy eksplisit;
- concurrent update memakai transaction/locking;
- transfer harus atomic antara source dan destination.

---

# 8. Keuangan / Accounting

**Frontend:** `AccountingTab`.

**Backend:** `/api/accounting`.

## Submodul

- chart of accounts / COA;
- journal entries;
- cash transactions;
- general ledger;
- trial balance;
- balance sheet;
- profit and loss;
- tax/fee mapping;
- reconciliation.

## Route

```text
GET  /api/accounting/accounts
POST /api/accounting/accounts
PUT  /api/accounting/accounts/:id
GET  /api/accounting/journal
POST /api/accounting/journal
GET  /api/accounting/journal/:id
POST /api/accounting/cash
GET  /api/accounting/trial-balance
GET  /api/accounting/balance-sheet
GET  /api/accounting/profit-and-loss
```

## Integrasi jurnal

```text
POS sale/payment
  → revenue + cash/receivable journal

Purchase receiving
  → inventory + payable journal

Service labor/parts
  → cost + revenue/receivable journal

Manual cash transaction
  → debit/credit journal

Refund/void
  → reversal journal, bukan delete history
```

## Aturan

- debit = credit;
- journal posted tidak dihapus;
- koreksi memakai reversal/adjustment;
- COA wajib tersedia sebelum posting;
- jika posting gagal, transaksi utama tidak boleh terlihat sukses tanpa status degraded;
- laporan memiliki periode, tenant, branch, dan timezone yang jelas.

---

# 9. HR

**Frontend:** `HRTab`, `HRAttendancePanel`.

## Submodul

- staff directory;
- role/permission assignment;
- branch assignment;
- attendance;
- shift/working schedule;
- payroll;
- commission;
- kasbon/employee advance;
- leave/absence bila tersedia.

## Integrasi

```text
Staff
  → branch + role
  → attendance
  → payroll/commission
  → kasbon
  → accounting journal
  → audit
```

## Aturan

- staff hanya melihat scope yang diizinkan;
- payroll tidak boleh terbuka ke staff biasa;
- perubahan kompensasi memiliki audit;
- attendance adjustment memiliki reason dan reviewer.

---

# 10. CRM dan Customer

**Frontend:** `CRMTab`, `CustomerActivityFeed`, `B2BPipeline`, `CustomerPortal`.

## Submodul

- customer master;
- contact/history;
- lead;
- B2B pipeline;
- follow-up/task;
- campaign/broadcast;
- loyalty/voucher;
- customer activity;
- service history;
- complaint/warranty history.

## Integrasi

```text
Customer
  → service ticket
  → POS sale
  → invoice/payment
  → WhatsApp/Telegram notification
  → loyalty/voucher
  → CRM activity timeline
```

## Aturan

- customer duplicate detection;
- consent untuk broadcast;
- unsubscribe/opt-out;
- data contact tidak bocor lintas tenant;
- activity timeline immutable/audit-able.

---

# 11. Keamanan, Audit, dan Fraud

**Frontend:** area `fraud`, audit views, `SuperAdminDashboard`.

**Backend:** `/api/admin`, `/api/platform`, `/api/monitoring`, `audit.controller.ts`.

## Submodul

- audit log;
- login/session events;
- permission changes;
- suspicious activity;
- failed payment;
- unusual stock adjustment;
- repeated void/refund;
- incident management;
- platform health;
- API token management.

## Integrasi event

```text
Auth event
  → audit log

Permission change
  → audit log + security notification

Stock adjustment
  → audit log + inventory movement

POS void/refund
  → audit log + reversal journal

Billing webhook
  → payment event + invoice state + audit
```

## Acceptance criteria

- event penting memiliki actor, tenant, timestamp, request ID;
- audit tidak bisa diubah user tenant biasa;
- Super Admin action memiliki permission;
- sensitive payload disensor;
- monitoring membedakan liveness dan database readiness.

---

# 12. Data Manager / Generic CRUD

**Frontend:** `DataExplorer`.

**Backend:** `/api/crud`, `/api/module-records`, `/api/data/sync`.

## Submodul data master

- customers;
- products;
- service tickets;
- warehouses;
- branches;
- COA accounts;
- journal entries;
- POS shifts.

## Fungsi

- list/search/filter;
- create/update sesuai allowlist;
- export/import bila diizinkan;
- sync local/offline data;
- bulk operation terbatas;
- audit perubahan.

## Aturan penting

Generic CRUD **tidak boleh** menjadi bypass untuk:

- password;
- token;
- role/permission;
- tenant ID;
- financial posted journal;
- payment status;
- stock balance langsung;
- system config sensitif.

Tabel dan kolom harus allowlisted server-side.

---

# 13. Billing SaaS dan Subscription

**Frontend:** `SaaSSubscription`.

**Backend:** `/api/billing`.

## Submodul

- public plans;
- private plan management;
- subscription status;
- invoice;
- recurring billing;
- trial expiry;
- Midtrans webhook;
- manual payment;
- QRIS config/upload;
- payment confirmation;
- due/overdue notification;
- gateway config;
- billing outbox.

## Route utama

```text
GET  /api/billing/public-plans
GET  /api/billing/plans
POST /api/billing/plans
GET  /api/billing/subscription
POST /api/billing/create-invoice
POST /api/billing/midtrans-webhook
GET  /api/billing/manual-payments
POST /api/billing/invoices/:invoiceId/manual-payments
POST /api/billing/manual-payments/:id/approve
POST /api/billing/manual-payments/:id/reject
```

## Alur pembayaran

```text
Plan
  → subscription
  → invoice
  → Midtrans/manual payment
  → signature/file validation
  → payment verification
  → invoice state transition
  → subscription entitlement
  → notification outbox
  → audit
```

## Aturan

- webhook idempotent;
- signature wajib diverifikasi;
- jangan percaya status dari frontend;
- invoice ID unik;
- manual proof memiliki MIME/extension/magic-byte/size validation;
- approve/reject hanya role/permission resmi;
- payment confirmation bukan endpoint publik tanpa auth/verification.

---

# 14. Settings dan Configuration

**Frontend:** `SettingsTab` dan panel settings.

**Backend:** `/api/tenant`, `/api/tenant/settings`, branch/RBAC/settings controllers.

## Submodul

### Branding

- logo;
- warna;
- nama bisnis;
- favicon;
- white-label preset;
- branding history.

### Multi-cabang

- branch create/update/delete;
- lokasi usaha;
- warehouse mapping;
- staff branch assignment;
- branch scope.

### Operasional ERP

- ticket status;
- SLA;
- service categories;
- payment method;
- tax/fee;
- numbering;
- workflow settings.

### Workflow Builder

- trigger;
- condition;
- action;
- notification;
- retry;
- audit;
- disable/enable.

### RBAC

- role matrix;
- user permission;
- branch assignment;
- feature access;
- session/security policy.

### Printer dan nota

- QZ certificate;
- printer profile;
- receipt template;
- terms and warranty text;
- test print.

### Developer API

- API token provisioning;
- token abilities;
- expiry/revoke;
- tenant/branch scope;
- API documentation.

### Storage/backup

- storage provider config;
- backup job;
- retention;
- restore evidence;
- audit.

## Aturan settings

- domain settings harus permission-gated;
- sensitive settings tidak dikirim ke role rendah;
- perubahan config memiliki audit;
- config tenant tidak boleh cross-tenant;
- invalid config tidak boleh membuat seluruh server crash tanpa pesan operasional.

---

# 15. Integrasi eksternal

## WhatsApp

```text
Service/CRM/Billing event
  → notification template
  → queue/outbox
  → WhatsApp connector
  → delivery log
  → retry/failure state
```

Frontend:

- `WhatsAppConnector`;
- `WhatsAppHub`;
- queue/log panel.

Backend:

```text
/api/whatsapp/logs
/api/whatsapp/queue
/api/tenant/whatsapp/test
```

## Telegram

```text
Incident/billing/service event
  → Telegram template
  → bot connector
  → delivery log
```

Backend test route wajib permission-gated:

```text
/api/tenant/telegram/test
```

## Midtrans

```text
Midtrans webhook
  → signature verification
  → idempotency
  → invoice update
  → subscription entitlement
  → audit/outbox
```

## QZ Tray

```text
Frontend print request
  → QZ certificate
  → authenticated signing endpoint
  → local QZ Tray
  → printer
  → print result/log
```

Route:

```text
GET  /api/qz/certificate
GET  /api/qz/certificate/download
GET  /api/qz/installer.bat
POST /api/qz/sign
```

Private key tidak boleh masuk Git atau response publik.

## Developer API v1

```text
API token
  → hash lookup
  → active/expiry check
  → tenant-host match
  → branch scope
  → abilities
  → endpoint
  → audit/rate limit
```

Base path:

```text
/api/v1
```

Tidak ada fallback token developer hardcoded.

---

# 16. Alur bisnis end-to-end utama

## 16.1 Dari customer sampai ticket selesai

```text
Customer dibuat/ditemukan
  ↓
Device didaftarkan
  ↓
Service reception
  ↓
Ticket RECEIVED
  ↓
QR/token tracker
  ↓
Diagnosis teknisi
  ↓
Estimasi parts + labor
  ↓
Approval customer
  ↓
Reservasi/request parts
  ↓
Pengerjaan
  ↓
QC
  ↓
Invoice/payment
  ↓
Handover
  ↓
Warranty period
  ↓
CRM history + audit
```

## 16.2 Penjualan POS

```text
Open shift
  ↓
Cart product/service
  ↓
Server price/discount/tax validation
  ↓
Atomic stock check
  ↓
Sale transaction
  ↓
Payment
  ↓
Journal
  ↓
Receipt
  ↓
CRM activity + dashboard
```

## 16.3 Pembelian dan stok

```text
Low stock alert
  ↓
Purchase order
  ↓
Supplier
  ↓
Receiving
  ↓
Warehouse/location stock increment
  ↓
Inventory ledger
  ↓
Payable/accounting journal
```

## 16.4 Billing subscription

```text
Tenant pilih plan
  ↓
Subscription
  ↓
Invoice
  ↓
Midtrans/manual payment
  ↓
Verification
  ↓
Invoice PAID
  ↓
Entitlement aktif
  ↓
Notification
  ↓
Audit
```

## 16.5 Warranty claim

```text
Customer buka claim
  ↓
Token/tenant/ticket verification
  ↓
Claim created
  ↓
CS review
  ↓
Technician diagnosis
  ↓
Approve/reject
  ↓
New service workflow bila valid
  ↓
CRM/audit update
```

---

# 17. Integration contract antar-modul

| Producer | Event/data | Consumer | Wajib |
|---|---|---|---|
| Service Reception | ticket created | Service, CRM, QR, Notification | tenant/branch/audit |
| Diagnosis | estimate/parts | Approval, Inventory, Billing | server-side price |
| Approval | approved estimate | Service, Billing | immutable approval |
| Inventory | stock movement | POS, Service, Accounting | atomic ledger |
| POS | sale/payment | Inventory, Accounting, CRM | idempotent |
| Purchase | receiving | Inventory, Accounting | receiving audit |
| Accounting | journal posted | Reports, Dashboard | balanced debit/credit |
| Billing | invoice/payment | Entitlement, Notification, Audit | signature/idempotency |
| HR | attendance/payroll | Accounting, Dashboard | role privacy |
| CRM | customer/activity | Service, POS, Notification | consent/scope |
| Audit | security/business event | Security, Super Admin | immutable evidence |
| Settings | config change | All affected modules | validation/cache refresh |
| Notification | event/outbox | WhatsApp/Telegram/Email | retry/failure state |

Setiap integration wajib mendefinisikan:

```text
Event name
Payload schema
Producer
Consumer
Retry policy
Idempotency key
Failure behavior
Audit event
Tenant/branch scope
```

---

# 18. Modul yang wajib diaudit agar tidak setengah jadi

## ServiceApprovalPortal

File frontend terdeteksi, tetapi route backend portal harus diverifikasi.

Agent wajib memilih satu:

1. implementasikan endpoint portal detail/approval lengkap dengan token, expiry, tenant binding, audit, dan test; atau
2. hapus komponen, import, nav entry, dan dokumentasi yang tidak digunakan.

Tidak boleh dibiarkan memanggil endpoint yang tidak terdaftar.

## Generic CRUD/Data Explorer

Pastikan tidak menjadi bypass untuk financial, security, credential, tenant, branch, stock, atau journal data.

## Accounting journal

Pastikan semua producer transaksi memiliki status posting yang jelas dan failure tidak menjadi silent success.

## POS inventory

Pastikan race condition, duplicate submit, void, reversal, dan stock balance diuji concurrent.

## Billing webhook

Pastikan signature, idempotency, invoice transition, subscription entitlement, dan notification outbox konsisten.

---

# 19. Acceptance matrix per modul

Setiap modul baru/diubah wajib melengkapi tabel:

```text
Modul:
Submodul:
Frontend path:
Backend route:
Controller/service:
Database tables:
Aktor yang boleh:
Tenant scope:
Branch scope:
Input schema:
State machine:
Producer event:
Consumer event:
Audit event:
Failure behavior:
Unit test:
Security test:
Browser test:
Mobile review:
Performance evidence:
Rollback plan:
Status: NOT READY / READY
```

`READY` hanya boleh dipilih jika semua field diisi dan evidence tersedia.

---

# 20. Definition of integrated completion

Proyek dianggap memiliki modul lengkap jika:

- setiap menu navigation punya fungsi nyata;
- setiap submodul punya route/handler atau keputusan penghapusan;
- setiap route punya auth/permission/scope;
- setiap fungsi kritis punya database transaction;
- setiap producer-consumer integration diuji;
- setiap failure state terlihat oleh operator;
- setiap status dapat dipahami user;
- setiap halaman memiliki loading/empty/error/success state;
- setiap modul memiliki mobile behavior;
- tidak ada komponen orphan;
- tidak ada endpoint orphan;
- tidak ada tabel penting tanpa owner flow;
- tidak ada tombol yang hanya menampilkan toast palsu;
- tidak ada data mock yang tampil sebagai data production;
- tidak ada bug yang ditandai “nanti”;
- seluruh acceptance matrix berstatus `READY`.

Jika belum memenuhi semua poin:

```text
STATUS = NOT READY
```
