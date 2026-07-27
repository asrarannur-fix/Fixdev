import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateAdditionalCost,
  calculateServiceInvoice,
  canTransition,
  SERVICE_TRANSITIONS,
} from "../src/server/controllers/serviceWorkflow.controller.ts";
import { ServiceStatus } from "../src/types/index.ts";
import { SERVICE_STATUS_META, SERVICE_TERMINAL_STATUSES } from "../src/domain/serviceWorkflow.ts";

test("service workflow supports the complete happy path", () => {
  const path = ["DITERIMA", "DIAGNOSA", "MENUGGU_APPROVAL", "SEDANG_DIKERJAKAN", "QC", "SELESAI", "DIAMBIL"];
  for (let index = 0; index < path.length - 1; index++) {
    assert.equal(canTransition(path[index], path[index + 1]), true, `${path[index]} -> ${path[index + 1]}`);
  }
});

test("service workflow blocks invalid handover from reception", () => {
  assert.equal(canTransition("DITERIMA", "DIAMBIL"), false);
  assert.equal(canTransition("MENUGGU_APPROVAL", "QC"), false);
});

test("QC can return a unit to rework and back to repair", () => {
  assert.ok(SERVICE_TRANSITIONS.QC.includes("REWORK"));
  assert.ok(SERVICE_TRANSITIONS.REWORK.includes("SEDANG_DIKERJAKAN"));
});

test("every service status has operational metadata", () => {
  for (const status of Object.values(ServiceStatus)) {
    assert.ok(SERVICE_STATUS_META[status], `missing metadata for ${status}`);
  }
});

test("terminal service statuses have no outgoing transitions", () => {
  for (const status of SERVICE_TERMINAL_STATUSES) {
    assert.deepEqual(SERVICE_TRANSITIONS[status] || [], [], status);
  }
});

test("operational exception paths remain reachable", () => {
  assert.equal(canTransition("MENUGGU_APPROVAL", "CUSTOMER_TIDAK_MERESPON"), true);
  assert.equal(canTransition("SEDANG_DIKERJAKAN", "RUSAK"), true);
  assert.equal(canTransition("SIAP_DIAMBIL", "BARANG_TIDAK_DIAMBIL"), true);
  assert.equal(canTransition("APPROVAL_DITOLAK", "DIAGNOSA"), true);
});

test("invoice calculation applies tax and consumes down payment", () => {
  assert.deepEqual(calculateServiceInvoice(1_000_000, 200_000, 11), {
    subtotal: 1_000_000,
    taxAmount: 110_000,
    total: 1_110_000,
    downPaymentUsed: 200_000,
    amountDue: 910_000,
  });
});

test("approved additional cost preserves previous and calculates new total", () => {
  assert.deepEqual(calculateAdditionalCost(500_000, 150_000), {
    previousCost: 500_000,
    additionalCost: 150_000,
    newCost: 650_000,
  });
});

test("invoice down payment never creates a negative balance", () => {
  assert.deepEqual(calculateServiceInvoice(100_000, 500_000, 0), {
    subtotal: 100_000,
    taxAmount: 0,
    total: 100_000,
    downPaymentUsed: 100_000,
    amountDue: 0,
  });
});
