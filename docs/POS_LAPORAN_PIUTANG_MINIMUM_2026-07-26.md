# POS Laporan dan Piutang Minimum

Tanggal: 2026-07-26

## Ringkasan

- Tambah endpoint tenant + branch scoped untuk list/detail `pos_receivables`.
- Tambah pembayaran piutang atomik dan idempotent memakai `idempotencyKey`.
- Pembayaran membuat jurnal debit kas/bank dan kredit piutang akun `10300`.
- Tambah aging bucket serta filter `status` dan `days`.
- Analytics menerima filter aman `days`, `from`, `to`, dan `status`; revenue/refund/top products memakai transaksi dan item JSONB yang sesuai.

## File terkait

- `src/server/controllers/pos.controller.ts`
- `src/server/routes/pos.routes.ts`
- `src/services/posService.ts`
- `migrations/056_pos_receivable_payments.sql`
- `tests/pos.api.test.ts`
