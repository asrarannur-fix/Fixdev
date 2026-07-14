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
