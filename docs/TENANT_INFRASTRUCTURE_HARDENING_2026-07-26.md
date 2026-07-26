# Hardening Infrastruktur Tenant

## Ringkasan perubahan

- Custom domain dan MFA placeholder dihapus; tenant memakai subdomain tunggal platform.
- API settings membaca dan menyimpan credential tanpa mengirim secret ke browser.
- Scope tenant memvalidasi status billing dan cabang aktif yang ditugaskan kepada user.
- Bootstrap membatasi data finansial dan audit ke owner/admin; data cabang difilter untuk role lain.
- Rental memakai feature gate dan role guard untuk mutasi finansial serta kontrak.
- Migration `053_tenant_infrastructure_hardening.sql` menghapus kolom lama dan menolak relasi user/cabang atau branch/tenant lintas tenant.
- Session normal memakai cookie `HttpOnly` host-only, tabel `auth_sessions`, logout server-side, serta revokasi seluruh sesi saat password berubah.
- Mutasi cookie memvalidasi `Origin` terhadap `ALLOWED_ORIGINS` untuk menahan CSRF.

## Batas Infrastruktur

- RLS database belum diaktifkan. Aktivasi memerlukan role PostgreSQL runtime `fixdev_app` non-owner/non-bypass dan role platform terpisah, lalu semua query direct-pool harus dipindah ke wrapper tenant-scoped dengan `SET LOCAL app.current_tenant_id`.
- Bukti billing masih filesystem private. Object storage nyata memerlukan bucket/provider dan kredensial deployment; jangan mengklaim upload URL saat ini sebagai signed object-storage URL.

## File terkait

- `src/middleware/auth.middleware.ts`
- `src/server/controllers/settings.controller.ts`
- `src/server/controllers/bootstrap.controller.ts`
- `src/server/routes/rental.routes.ts`
- `migrations/053_tenant_infrastructure_hardening.sql`
- `tests/tenant-infrastructure-security.test.ts`
