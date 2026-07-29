import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
