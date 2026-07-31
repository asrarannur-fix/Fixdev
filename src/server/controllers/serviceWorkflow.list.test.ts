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
    expect(controller).toContain("const from = String(req.query.from");
    expect(controller).toContain("const to = String(req.query.to");
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

  it('logs safe workflow and upload outcomes', () => {
    expect(controller).toContain("logServiceOperation(req, 'workflow_transition'");
    expect(controller).toContain("logServiceOperation(req, 'photo_upload'");
    expect(controller).toContain("reason: 'duplicate_file'");
  });

  it('persists uploaded photos under locked ticket with audit and file rollback', () => {
    expect(controller).toContain('const locked = await lockedTicket(client, req);');
    expect(controller).toContain('SERVICE_PHOTO_UPLOADED');
    expect(controller).toContain("await fs.unlink(target).catch(() => undefined);");
    expect(controller).toContain('RETURNING ${ticketSelect()}');
  });

  it('records micro stock movements with signed quantity and absolute amount', () => {
    const micro = readFileSync(new URL('../controllers/microComponents.controller.ts', import.meta.url), 'utf8');
    expect(micro).toContain('quantity_change,reference_no,note) VALUES($1,$2,$3,$4,$5::numeric,$6::integer,$7,$8)');
    expect(micro).toContain('Math.abs(movementQty)');
  });

  it('serializes spare-part reservations and scopes stock mutations', () => {
    expect(controller).toContain('SELECT quantity::float AS stock FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE');
    expect(controller).toContain("ON CONFLICT (tenant_id,idempotency_key) DO NOTHING");
    expect(controller).toContain("WHERE id=$3 AND tenant_id=$4 AND ticket_id=$5");
    expect(controller).toContain("WHERE id=$1 AND tenant_id=$2 AND ticket_id=$3 AND status='RESERVED'");
  });

  it('serves only photos registered on tenant and branch scoped ticket', () => {
    expect(controller).toContain('SELECT initial_photos, qc_photos FROM service_tickets WHERE id=$1 AND tenant_id=$2 AND branch_id=$3');
    expect(controller).toContain('if (!registered) return res.status(404).end();');
  });
});
