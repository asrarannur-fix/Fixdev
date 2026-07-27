import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/utils/printJob.ts", "utf8");

test("browser dan QZ memakai dokumen print berbasis konfigurasi yang sama", () => {
  assert.match(source, /export const createPrintDocument/);
  assert.match(source, /getPrintBaseCss\(printConfig\)/);
  assert.match(source, /getPaperWidthStyle\(printConfig\)/);
  assert.match(source, /data: createPrintDocument\(title, html, printConfig\)/);
  assert.match(source, /doc\.write\(createPrintDocument\(title, html, printConfig\)\)/);
  assert.match(source, /if \(printConfig\?\.printMode === 'qz'\) return qzPrint/);
  assert.doesNotMatch(source, /fallback browser aktif/);
});

test("pratinjau Settings memakai renderer dokumen print yang sama", () => {
  const settingsSource = readFileSync("src/components/tenant/SettingsPrinterTerms.tsx", "utf8");
  assert.match(settingsSource, /import \{ createPrintDocument \} from '..\/..\/utils\/printJob'/);
  assert.match(settingsSource, /const previewDocument = createPrintDocument\(/);
  assert.match(settingsSource, /srcDoc=\{previewDocument\}/);
});
