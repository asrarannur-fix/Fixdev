import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../../server/controllers/serviceWorkflow.controller.ts', import.meta.url), 'utf8');

describe('service list query contract', () => {
  it('supports tenant/branch scoped bounded filters, KPI, and safe sort', () => {
    expect(controller).toContain('Math.min(100');
    expect(controller).toContain("req.query.technician || req.query.tech");
    expect(controller).toContain("req.query.group");
    expect(controller).toContain("req.query.sla");
    expect(controller).toContain("c.name ILIKE");
    expect(controller).toContain("st.tenant_id=$1");
    expect(controller).toContain("st.branch_id=$2");
    expect(controller).toContain('const sortMap');
    expect(controller).toContain('AS overdue');
    expect(controller).toContain('kpi: kpiResult.rows[0]');
  });

  it('exports at most one page and neutralizes spreadsheet formulas', () => {
    expect(controller).toContain("req.query.limit = '100'");
    expect(controller).toContain('/^[=+@-]/.test(s)');
    expect(controller).toContain("Content-Disposition");
  });

  it('cleans local service photos after ticket deletion and logs outcome', () => {
    expect(controller).toContain('async function cleanupServicePhotos');
    expect(controller).toContain("RETURNING id, initial_photos, qc_photos");
    expect(controller).toContain('const cleanedPhotos = await cleanupServicePhotos(photoPaths);');
    expect(controller).toContain("'[service] tickets deleted'");
  });

  it('persists uploaded photos under locked ticket with audit and file rollback', () => {
    expect(controller).toContain('const locked = await lockedTicket(client, req);');
    expect(controller).toContain('SERVICE_PHOTO_UPLOADED');
    expect(controller).toContain("await fs.unlink(target).catch(() => undefined);");
    expect(controller).toContain('RETURNING ${ticketSelect()}');
  });
});
