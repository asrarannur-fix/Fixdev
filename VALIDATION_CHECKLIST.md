# Validation Checklist

Langkah validasi wajib sebelum merge/release. Sumber: `package.json` (`scripts`).

## Static & Build
- [ ] `npm run lint` → `tsc --noEmit` bersih (tidak ada type error).
- [ ] `npm run build` → `vite build` + `esbuild server.ts` sukses, artifact `dist/server.cjs` & `dist/assets` terbentuk.
- [ ] `npm run validate` → gabungan lint + build (jalankan di CI).

## Smoke Tests (lokal)
- [ ] `npm test:workflow` → `scripts/e2e-smoke.cjs` (alur utama).
- [ ] `npm test:frontend` → `scripts/frontend-smoke.cjs`.
- [ ] `npm test:browser` → `playwright test` (Chromium, `http://localhost:3000`).
- [ ] `npm test:comprehensive` → `scripts/comprehensive-api-test.cjs`.
- [ ] `npm test:superadmin-browser` → `scripts/superadmin-browser-smoke.cjs`.

## Audit & Hardening
- [ ] `npm run check:hardening` → `scripts/validate-hardening.cjs`.
- [ ] `npm run check:auth` → `scripts/check-auth-status.cjs`.

## Konvensi
- Jangan commit jika `lint` gagal.
- Build harus lolos di environment CI (retries playwright = 2 bila `CI`).
- Cek ukuran chunk tidak membengkak drastis (lihat `PERFORMANCE_SCALABILITY_RULES.md`).
