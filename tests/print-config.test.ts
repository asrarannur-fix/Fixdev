import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/utils/printJob.ts", "utf8");

test("browser dan QZ memakai dokumen print berbasis konfigurasi yang sama", () => {
  assert.match(source, /createPrintDocument/);
  assert.match(source, /getPrintBaseCss\(printConfig\)/);
  assert.match(source, /getPaperWidthStyle\(printConfig\)/);
  assert.match(source, /data: createPrintDocument\(title, html, printConfig\)/);
  assert.match(source, /createPrintDocument\(title, html, printConfig\)/);
});
