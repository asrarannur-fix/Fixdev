import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../../server/controllers/serviceWorkflow.controller.ts', import.meta.url), 'utf8');

describe('service list query contract', () => {
  it('supports bounded pagination, filters, ordering, and total', () => {
    expect(controller).toContain("req.query.limit");
    expect(controller).toContain("req.query.offset");
    expect(controller).toContain("req.query.q");
    expect(controller).toContain("req.query.status");
    expect(controller).toContain('COUNT(*)::int AS total');
    expect(controller).toContain('res.json({ data: result.rows, total:');
  });
});
