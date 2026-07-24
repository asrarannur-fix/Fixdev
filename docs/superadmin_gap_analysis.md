# Superadmin Gap Analysis

## Executive Summary
Superadmin console saat ini berfokus ke **Control Plane SaaS**. Belum ada **Operational Oversight** per modul tenant.

## Current Capabilities (API + UI)
- Platform monitoring: overview, health, incidents, alerts, notifications/outbox
- Tenant lifecycle: list/detail, register, invitations, status, config, impersonation
- Billing/subscription: terminate, extend, invoices, payments, cron, gateway, template
- Audit/compliance: audit log, backup jobs, console sessions
- RBAC: roles/permissions matrix, superadmin users

## Missing: Operational Oversight
Per module:

### Services
- ❌ Superadmin API/UI untuk melihat daftar tiket servis antar tenant
- ❌ Monitoring SPK, estimasi biaya, garansi
- ❌ Trigger/print dokumen servis

### POS
- ❌ Superadmin API/UI untuk transaksi POS antar tenant
- ❌ Monitoring shift control & void nota
- ❌ Summary struk harian

### Inventory
- ❌ Superadmin API/UI untuk stok per gudang antar tenant
- ❌ Monitoring transfer stok antar cabang
- ❌ Purchase order & reorder monitoring

### Accounting
- ❌ Superadmin API/UI untuk COA, jurnal, laporan keuangan antar tenant
- ❌ Monitoring double-entry & posting ledger

### HR
- ❌ Superadmin API/UI untuk presensi, payroll, komisi, kasbon
- ❌ Monitoring karyawan dan shift kerja

### CRM
- ❌ Superadmin API/UI untuk pipeline deals & campaign antar tenant
- ❌ Monitoring broadcast WhatsApp/Telegram

### Settings
- ✅ Role/permission matrix ada
- ⚠️ printConfig per tenant belum ada UI/edit dari superadmin
- ⚠️ branding/white-label belum ada UI superadmin

## Recommended Roadmap
1. Phase 1: Tenant Detail > Operational Summary (read-only aggregation per module)
2. Phase 2: Module Health Dashboard + alerts
3. Phase 3: Module-level enforcement/config from superadmin
