import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const print = readFileSync("src/utils/print.ts", "utf8");
const preview = readFileSync("src/components/tenant/SettingsPrinterTerms.tsx", "utf8");
const documents = readFileSync("src/components/tenant/services/DocumentPrintouts.tsx", "utf8");

test("preview dan dokumen cetak berbagi ukuran dan unit margin", () => {
  assert.match(print, /hvs_letter.*return "100%"/s);
  assert.match(preview, /getPaperWidthStyle/);
  assert.match(preview, /printMargin\}mm/);
  assert.match(documents, /getPrintBaseCss\(printConfig\)/);
  assert.doesNotMatch(documents, /hvs_letter.*A4/s);
});
