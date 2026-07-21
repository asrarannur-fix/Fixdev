# FIXDEV

Multi-tenant ERP SaaS untuk layanan servis perangkat (Komputer Makassar Service).

## Stack
React + Vite + TypeScript (frontend) · Express + tsx (server) · PostgreSQL via Supabase.

## Commands
- `npm run dev` — jalankan dev server (`tsx server.ts`)
- `npm run lint` — typecheck (`tsc --noEmit`)
- `npm run build` — build frontend + bundle server (`vite build` + esbuild)
- `npm run validate` — `lint` + `build`
- `npm test:workflow` / `npm test:frontend` / `npm test:browser` — smoke test lokal/browser

## Aturan Rilis
- Jangan menjalankan build mode produksi (`npm run build` atau `npm run validate`) sebelum pengguna memerintahkannya.
- Jangan push ke GitHub sebelum pengguna memerintahkannya.
- Perintah eksplisit pengguna diperlukan sebelum setiap tindakan build produksi atau push GitHub.

## Aturan Dokumentasi
- Setiap perbaikan yang selesai wajib dicatat di file `.md` yang relevan.
- Catatan harus berbahasa Indonesia dan mencantumkan ringkasan perubahan serta file terkait.

## Aturan Desain Landing Page
- Landing page harus berorientasi pada konversi penyewa dengan visual premium, modern, dan mewah.
- Tonjolkan manfaat bisnis, fitur nyata aplikasi, alur kerja, bukti kepercayaan, paket harga, dan CTA pendaftaran.
- Dilarang memakai aset, ikon, desain, kode, atau hasil generatif Gemini/Gemini 2.
- Gunakan rancangan orisinal serta ikon dari pustaka yang sudah tersedia di proyek.
- Paket dan harga landing page wajib dimuat dinamis dari konfigurasi billing; dilarang hardcode nama paket, harga, batas, atau fitur paket di komponen landing page.

## Modul
Services (Servis) · POS (Kasir) · Inventory (Stok) · Accounting · HR · CRM · WhatsApp · Settings.

## Detailed Instructions
Untuk panduan spesifik, lihat file tertaut:
- [Agent Skill & Modul](FIXDEV_AGENT_SKILL.md)
- [Database Schema Guardrail](DATABASE_SCHEMA_GUARDRAIL.md)
- [Customer Portal Rules](CUSTOMER_PORTAL_RULES.md)
- [Mobile PWA Rules](MOBILE_PWA_RULES.md)
- [Performance & Scalability](PERFORMANCE_SCALABILITY_RULES.md)
- [Role–Menu Matrix](ROLE_MENU_MATRIX.md)
- [Module Registry](MODULE_REGISTRY.md)
- [Deployment Checklist](DEPLOYMENT_PRODUCTION_CHECKLIST.md)
- [Validation Checklist](VALIDATION_CHECKLIST.md)
- [E2E Test Plan](E2E_TEST_PLAN.md)
- [Incident Rollback Plan](INCIDENT_ROLLBACK_PLAN.md)
- [Release Sign-off Template](RELEASE_SIGNOFF_TEMPLATE.md)
- [Production Readiness Gate](PRODUCTION_READINESS_GATE.md)
- [Visual Regression Checklist](VISUAL_REGRESSION_CHECKLIST.md)
- [Acceptance Criteria by Module](ACCEPTANCE_CRITERIA_BY_MODULE.md)
