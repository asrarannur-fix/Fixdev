# FIXDEV ERP

SaaS ERP multi-tenant untuk operasional servis laptop, inventory, POS, accounting, CRM, HR, dan billing.

## Source dan runtime

- Source canonical: `/home/ubuntu/fixdev`
- Production: PM2 `fixdev-erp`, loopback port `3000`
- Development: PM2 `fixdev-dev`, loopback port `3001`, Vite HMR aktif
- Production URL: <https://fixdev.web.id>
- Development URL: <https://dev.fixdev.web.id>

## Quick validation

```bash
npm run lint
npm test
npm run build
npm run preflight:production
npm audit --audit-level=high
git diff --check
```

## Operasional

```bash
pm2 list
pm2 save
systemctl is-active pm2-ubuntu
sudo nginx -t
curl -fsSk https://fixdev.web.id/api/health
curl -fsSk https://dev.fixdev.web.id/api/health
```

## Aturan penting

- Jangan menjalankan production dari `/var/www/fixdev`.
- Jangan memasukkan secret/token/password ke source, docs, test, atau log.
- Semua API tenant wajib memvalidasi `tenant_id`; operasi branch wajib memvalidasi `branch_id`.
- Public tracking memakai tenant dari hostname tervalidasi, bukan `tenantId` bebas dari client.
- Error internal harus dicatat server-side dan response client harus generik.
- Jangan commit atau mengubah secret tanpa review pemilik.

## Operasional sederhana

Semua workflow push/deploy/database/rollback ada di [ops/README.md](ops/README.md).

```bash
bash ops/push.sh "type: ringkasan perubahan"
bash ops/deploy.sh
bash ops/health.sh
bash ops/migrate-production.sh
```

## Dokumentasi agent

- [Module Catalog & Integration Map](docs/MODULE_CATALOG_INTEGRATION_MAP.md)
- [Agent Audit & Execution Prompt](docs/AGENT_AUDIT_AND_EXECUTION_PROMPT.md)
- [Agent Execution Master Plan](docs/AGENT_EXECUTION_MASTER_PLAN.md)

## Dokumentasi kanonik

Baca [FIXDEV Stabilization Master](docs/FIXDEV_STABILIZATION_MASTER.md) untuk:

- arsitektur runtime
- boundary authentication dan tenant
- aturan upload/error handling
- deployment dan recovery
- quality gate
- backlog residual dan definition of done

Dokumen domain yang tetap berlaku:

- [AGENTS.md](AGENTS.md)
- [Database Schema Guardrail](DATABASE_SCHEMA_GUARDRAIL.md)
- [Role/Menu Matrix](ROLE_MENU_MATRIX.md)
- [Deployment Checklist](DEPLOYMENT_PRODUCTION_CHECKLIST.md)
- [Rollback Plan](INCIDENT_ROLLBACK_PLAN.md)
