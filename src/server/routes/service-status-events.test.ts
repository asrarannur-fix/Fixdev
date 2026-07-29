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

describe('service status event routes', () => {
  it('exposes status history as read-only and tenant-scoped', () => {
    expect(workflowRoutes).toContain("router.get('/:id/status-events', requireServiceTicketTenant");
    expect(receptionRoutes).toContain("router.get('/:id/status-events', requireServiceTicketTenant");
    expect(workflowRoutes).not.toContain("router.post('/:id/status-events'");
    expect(receptionRoutes).not.toContain("router.post('/:id/status-events'");
  });

  it('registers bulk delete before ticket detail', () => {
    expect(workflowRoutes.indexOf("router.delete(\n  '/bulk'")).toBeLessThan(
      workflowRoutes.indexOf("router.get('/:id'")
    );
  });
});

describe('service audit schema', () => {
  it('scopes reception idempotency to tenant and ignores absent keys', () => {
    const sql = migration('063_service_reception_idempotency.sql');

    expect(sql).toContain('ON service_tickets (tenant_id, reception_idempotency_key)');
    expect(sql).toContain('WHERE reception_idempotency_key IS NOT NULL');
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
});
