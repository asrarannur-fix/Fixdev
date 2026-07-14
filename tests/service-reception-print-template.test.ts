import test from "node:test";
import assert from "node:assert/strict";

import { buildServiceReceptionPrintTemplate } from "../src/utils/serviceReceptionUtils.ts";

test("buildServiceReceptionPrintTemplate returns formal print content", () => {
  const template = buildServiceReceptionPrintTemplate({
    ticketNo: "TKT-2507-0001",
    deviceName: "iPhone 14",
    deviceBrandModel: "Apple iPhone 14",
    customerComplaints: "Baterai cepat habis",
    downPayment: 500000,
    estimatedCompletionDate: "2026-07-12",
    isCheckOnly: false,
  } as any, "Budi", "08123456789");

  assert.match(template, /TANDA TERIMA UNIT/);
  assert.match(template, /TKT-2507-0001/);
  assert.match(template, /Budi/);
  assert.match(template, /iPhone 14/);
  assert.match(template, /Rp 500.000/);
});
