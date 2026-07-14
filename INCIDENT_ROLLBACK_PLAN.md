# Incident Rollback Plan

Langkah rollback saat deploy bermasalah. Sumber: `deploy.sh`, `server.ts`, `supabase-schema.sql`.

## Prinsip
- Rollback = **kembalikan kode + rebuild + restart pm2**, bukan manipulasi DB langsung.
- Simpan artifact `dist/` sebelumnya sebelum deploy baru (backup `dist` ke `dist.bak`).

## Rollback Aplikasi
1. `cd /var/www/fixdev`
2. `git revert <commit_problematik>` (atau `git checkout <last_good_commit> -- .`)
3. `npm run build`
4. `pm2 restart fixdev-erp`
5. `pm2 logs fixdev-erp` → pastikan sehat.

## Rollback Database
- Migrasi hanya lewat `POST /api/supabase/migrate` (admin). Jika migrasi gagal/rusak:
  - Gunakan **Supabase dashboard / SQL editor** untuk `ROLLBACK` DDL manual (tidak ada auto-rollback).
  - Jangan `DROP` tabel bisnis; preferensikan `ALTER` reversibel.
  - `module_records` adalah store generik — restore dari backup sebelum hapus baris.

## Komunikasi
- Tandai insiden di log `audit_logs` (`action: 'INCIDENT_ROLLBACK'`).
- Beri tahu pelanggan via WhatsApp/Telegram bila downtime > 5 menit.

## Pencegahan
- Selalu jalankan `npm run validate` di CI sebelum `git pull` di prod.
- `deploy.sh` pakai `git pull --ff-only` → cegah merge tak terduga.
