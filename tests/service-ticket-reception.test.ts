import test from "node:test";
import assert from "node:assert/strict";

import { sanitizePayloadForTable } from "../src/server/controllers/data.controller.ts";

test("sanitizePayloadForTable keeps supported service ticket fields and drops unsupported ones", () => {
  const payload = {
    id: "ticket-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    ticketNo: "TKT-2507-0001",
    deviceName: "iPhone 14",
    customerComplaints: "Baterai cepat habis",
    initialChecklist: [{ name: "Layar", checked: true }],
    capturedConditions: [{ id: "cond-1", category: "visual" }],
    metadata: { source: "reception-ui" },
  };

  const result = sanitizePayloadForTable("service_tickets", payload, [
    "id",
    "tenant_id",
    "branch_id",
    "ticket_no",
    "device_name",
    "customer_complaints",
  ]);

  assert.deepEqual(result, {
    id: "ticket-1",
    tenant_id: "tenant-1",
    branch_id: "branch-1",
    ticket_no: "TKT-2507-0001",
    device_name: "iPhone 14",
    customer_complaints: "Baterai cepat habis",
  });
});
