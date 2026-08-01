import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = (name: string) =>
  readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), 'utf8');

const workflowRoutes = readFileSync(
  new URL('./serviceWorkflow.routes.ts', import.meta.url),
  'utf8'
);
const receptionRoutes = readFileSync(
  new URL('./serviceReception.routes.ts', import.meta.url),
  'utf8'
);
const workflowController = readFileSync(
  new URL('../controllers/serviceWorkflow.controller.ts', import.meta.url),
  'utf8'
);
const receptionController = readFileSync(
  new URL('../controllers/serviceReception.controller.ts', import.meta.url),
  'utf8'
);
const trackerController = readFileSync(
  new URL('../controllers/serviceTracker.controller.ts', import.meta.url),
  'utf8'
);
const migrationScript = readFileSync(
  new URL('../../../scripts/migrate.ts', import.meta.url),
  'utf8'
);
const databaseController = readFileSync(
  new URL('../controllers/database.controller.ts', import.meta.url),
  'utf8'
);

describe('service portal contracts', () => {
  it('returns ticket identity and stores declared portal signature', () => {
    expect(trackerController).toContain('ticketId: row.id');
    expect(trackerController).toContain('provisional_signature=$4');
    expect(trackerController).toContain('signature: z.string()');
    expect(trackerController).toContain("Cache-Control");
  });
});

describe('service status event routes', () => {
  it('exposes status history as read-only and tenant-scoped', () => {
    expect(workflowRoutes).toContain("router.get('/:id/status-events', requireServiceTicketTenant");
    expect(receptionRoutes).toContain("router.get('/:id/status-events', requireServiceTicketTenant");
    expect(workflowRoutes).not.toContain("router.post('/:id/status-events'");
    expect(receptionRoutes).not.toContain("router.post('/:id/status-events'");
  });

  it('exposes scoped photo list, upload, stream, and delete endpoints', () => {
    expect(workflowRoutes).toContain("router.get('/:id/photos', requireServiceTicketTenant, listServicePhotos)");
    expect(workflowRoutes).toContain("router.put('/:id/photos/:fileName'");
    expect(workflowRoutes).toContain("router.get('/:id/photos/:fileName'");
    expect(workflowRoutes).toContain("router.delete('/:id/photos/:fileName'");
    expect(workflowController).toContain("flag: 'wx'");
    expect(workflowController).toContain('validPhotoSignature');
    expect(workflowController).toContain('].includes(objectPath)');
    expect(workflowController.indexOf('await lockedTicket(client, req)')).toBeLessThan(
      workflowController.indexOf('await storage.write(objectPath, req.body)')
    );
  });

  it('validates storage locations through tenant-scoped module records', () => {
    expect(workflowController).toContain("module='storage_locations'");
    expect(receptionController).toContain("module='storage_locations'");
    expect(workflowController).not.toContain('requireTicketWarehouse(client, current, parsed.data.storageLocationId)');
  });

  it('exposes draft-only intake and QC endpoints with role policy', () => {
    expect(workflowRoutes).toContain("router.patch(\n  '/:id/intake-checklist'");
    expect(workflowRoutes).toContain("requireRoles('OWNER', 'ADMIN', 'CS', 'SUPER_ADMIN')");
    expect(workflowRoutes).toContain("router.patch('/:id/qc-draft'");
    expect(workflowRoutes).toContain("requireRoles('OWNER', 'ADMIN', 'TEKNISI', 'SUPER_ADMIN'), updateServiceQcDraft");
    expect(workflowController).toContain('FOR UPDATE');
    expect(workflowController).toContain('SERVICE_INTAKE_CHECKLIST_UPDATED');
    expect(workflowController).toContain('SERVICE_QC_DRAFT_UPDATED');
    expect(workflowController).toContain('return finalTicket(client, req)');
    expect(workflowController).toContain("current.status !== 'QC'");
  });

  it('exposes scoped estimate creation through the workflow router', () => {
    expect(workflowRoutes).toContain("router.post(\n  '/:id/estimate'");
    expect(workflowRoutes).toContain("createServiceEstimate");
    expect(workflowController).toContain('ESTIMATE_PENDING');
    expect(workflowController).toContain('Estimasi biaya dibuat: Rp ');
    expect(workflowController).toContain("'DIAGNOSA', 'APPROVAL_DITOLAK'");
  });

  it('registers bulk delete before ticket detail', () => {
    expect(workflowRoutes).toContain("requireServiceReceivableTenant");
    expect(workflowRoutes.indexOf("router.delete(\n  '/bulk'")).toBeLessThan(
      workflowRoutes.indexOf("router.get('/:id'")
    );
  });
});

describe('migration runners', () => {
  it('shares version-checksum ledger and upgrades filename-only ledgers', () => {
    for (const runner of [migrationScript, databaseController]) {
      expect(runner).toContain('version TEXT PRIMARY KEY, checksum TEXT');
      expect(runner).toContain("RENAME COLUMN filename TO version");
      expect(runner).toContain('sha256');
      expect(runner).toContain('UPDATE schema_migrations SET checksum');
      expect(runner).toContain("pg_advisory_");
    }
  });
});

describe('service audit schema', () => {
  it('scopes reception idempotency to tenant and ignores absent keys', () => {
    const sql = migration('063_service_reception_idempotency.sql');

    expect(sql).toContain('ON service_tickets (tenant_id, reception_idempotency_key)');
    expect(sql).toContain('WHERE reception_idempotency_key IS NOT NULL');
  });

  it('freezes terminal service ticket business fields', () => {
    const sql = migration('071_service_terminal_integrity.sql');
    expect(sql).toContain("to_jsonb(NEW) - ARRAY['updated_at','deleted_at']::text[]");
    expect(sql).toContain('terminal service ticket is immutable');
  });

  it('supports handover stock movement conflict target', () => {
    const sql = migration('019_service_schema_fixes.sql');

    expect(sql).toContain('UNIQUE (ticket_id, product_id, warehouse_id, movement_type)');
    expect(sql).toContain("movement_type TEXT NOT NULL DEFAULT 'SERVICE_OUT'");
  });

  it('scopes receivable payment retries to receivable', () => {
    const sql = migration('065_service_workflow_audit_fixes.sql');

    expect(sql).toContain('DROP CONSTRAINT IF EXISTS');
    expect(sql).toContain('ON service_receivable_payments(tenant_id, receivable_id, idempotency_key)');
  });

  it('backfills one initial event only when ticket has none', () => {
    const sql = migration('022_backfill_service_initial_events.sql');

    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain("ev.ticket_id=st.id AND ev.to_status='DITERIMA'");
  });

  it('enforces each event tenant-ticket pair without scanning legacy rows', () => {
    const sql = migration('069_service_status_event_tenant_scope.sql');

    expect(sql).toContain('ON service_tickets(tenant_id, id)');
    expect(sql).toContain('FOREIGN KEY (tenant_id, ticket_id)');
    expect(sql).toContain('REFERENCES service_tickets(tenant_id, id)');
    expect(sql).toContain('NOT VALID');
    expect(sql).not.toMatch(/\bUPDATE\b|\bDELETE\b|\bINSERT\b/);
  });
});
