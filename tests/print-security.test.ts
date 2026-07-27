import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printJob = readFileSync('src/utils/printJob.ts', 'utf8');
const settings = readFileSync('src/server/controllers/settings.controller.ts', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const ui = readFileSync('src/components/tenant/SettingsPrinterTerms.tsx', 'utf8');

test('renderer membersihkan script, event handler, dan QR eksternal', () => {
  assert.match(printJob, /sanitizePrintHtml\(html\)/);
  assert.match(printJob, /<script/);
  assert.match(printJob, /qr-placeholder/);
});

test('QZ retry hanya terjadi sebelum qz.print', () => {
  const qzPrint = printJob.slice(printJob.indexOf('const qzPrint'), printJob.indexOf('export const listQzPrinters'));
  const retry = qzPrint.indexOf('await qz.websocket.connect();');
  const submission = qzPrint.indexOf('await qz.print', retry);
  assert.ok(retry > 0 && retry < submission);
  assert.equal(qzPrint.indexOf('await qz.websocket.connect();', submission), -1);
});

test('konfigurasi print backend memakai enum ketat dan margin UI mm', () => {
  assert.match(settings, /paperSize: z\.enum/);
  assert.match(settings, /printFontSize: z\.enum/);
  assert.match(settings, /labelFontSize: z\.enum/);
  assert.match(ui, /\{printMargin\} mm/);
  assert.doesNotMatch(ui, /printMargin\} px/);
});

test('endpoint signing memiliki limiter khusus', () => {
  assert.match(server, /app\.post\("\/api\/qz\/sign", qzSigningLimiter/);
});
