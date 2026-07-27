import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const routes = readFileSync('src/server/routes/printJob.routes.ts', 'utf8');
const controller = readFileSync('src/server/controllers/printJob.controller.ts', 'utf8');

test('route print job dipasang sebelum fallback API dan CRUD generik', () => {
  const printJobs = server.indexOf('app.use("/api/print-jobs"');
  assert.ok(printJobs > 0);
  assert.ok(printJobs < server.indexOf('app.use("/api/crud"'));
  assert.ok(printJobs < server.indexOf('app.use("/api", (req, res)'));
});

test('route lifecycle print tersedia', () => {
  assert.match(routes, /router\.post\('\/', createPrintJob\)/);
  assert.match(routes, /router\.post\('\/:id\/result', recordPrintResult\)/);
  assert.match(routes, /router\.post\('\/:id\/reprint', reprintPrintJob\)/);
});

test('controller mengikat job dan hasil pada scope tenant serta cabang', () => {
  assert.match(controller, /req\.tenantId/);
  assert.match(controller, /req\.branchId/);
  assert.match(controller, /status='started'/);
  assert.match(controller, /Alasan cetak ulang wajib diisi/);
});
