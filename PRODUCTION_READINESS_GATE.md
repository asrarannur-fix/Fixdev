# Production Readiness Gate

Gerbang kelayakan production. Semua item wajib hijau sebelum deploy.

## Gate 1 — Kode & Build
- [ ] `tsc --noEmit` tanpa error (`npm run lint`).
- [ ] `npm run build` sukses, artifact valid.
- [ ] Tidak ada `console.error`/`TODO` kritis di jalur utama.

## Gate 2 — Keamanan & Auth
- [ ] `npm run check:auth` hijau.
- [ ] `npm run check:hardening` hijau.
- [ ] Semua API terproteksi `requireSupabaseJwt` + `requireTenantScope` (kecuali route publik & onboarding).
- [ ] Secret/token hanya di `.env`, tidak di-commit.

## Gate 3 — Data & Multi-Tenant
- [ ] Setiap query filter `tenant_id` (`DATABASE_SCHEMA_GUARDRAIL.md`).
- [ ] Migrasi DB di-test di staging.

## Gate 4 — Uji
- [ ] E2E (`tests/`) hijau di Chromium.
- [ ] Acceptance per modul terpenuhi (`ACCEPTANCE_CRITERIA_BY_MODULE.md`).

## Gate 5 — Ops
- [ ] `ops/deploy.sh` teruji di staging.
- [ ] Nginx proxy & TLS benar.
- [ ] Log `pm2` & `audit_logs` terpasang.
- [ ] Rollback plan divalidasi.

**Keputusan:** ☐ GO  ☐ NO-GO  ☐ GO WITH CONDITIONS (sebutkan: ____)
