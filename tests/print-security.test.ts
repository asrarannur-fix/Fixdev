import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printJob = readFileSync('src/utils/printJob.ts', 'utf8');
const settings = readFileSync('src/server/controllers/settings.controller.ts', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const ui = readFileSync('src/components/tenant/SettingsPrinterTerms.tsx', 'utf8');

test('renderer membersihkan script, event handler, dan QR eksternal', () => {
  assert.match(printJob, /const sanitizePrintHtml = \(html: string/);
  assert.match(printJob, /querySelectorAll\('script,iframe,object,embed/);
  assert.match(printJob, /qr-placeholder/);
});

test('QZ retry hanya terjadi sebelum qz.print', () => {
  const qzPrint = printJob.slice(printJob.indexOf('const qzPrint'), printJob.indexOf('export const listQzPrinters'));
  const retry = qzPrint.indexOf('await qz.websocket.connect();');
  const submission = qzPrint.indexOf('await qz.print', retry);
  assert.ok(retry > 0 && retry < submission);
  assert.equal(qzPrint.indexOf('await qz.websocket.connect();', submission), -1);
});

test('konfigurasi print backend memakai enum ketat dan menerima fitur UI', () => {
  assert.match(settings, /paperSize: z\.enum/);
  assert.match(settings, /printFontSize: z\.enum/);
  assert.match(settings, /labelFontSize: z\.enum/);
  for (const key of ['thermalCompact', 'multiPrinterMap', 'printTemplates', 'watermark', 'printBarcode', 'printTax']) {
    assert.match(settings, new RegExp(`${key}:`));
  }
  assert.match(ui, /\{printMargin\} mm/);
  assert.doesNotMatch(ui, /printMargin\} px/);
});

test('renderer memakai DOM parser dan mempertahankan gambar base64 aman', () => {
  assert.match(printJob, /new DOMParser\(\)/);
  assert.match(printJob, /querySelectorAll\('script,iframe,object,embed/);
  assert.match(printJob, /allowedDataImage/);
  assert.match(printJob, /data:image/);
});

test('endpoint signing memiliki limiter khusus', () => {
  assert.match(server, /app\.post\("\/api\/qz\/sign", qzSigningLimiter/);
});
