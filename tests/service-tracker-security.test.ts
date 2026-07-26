import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tracker = readFileSync("src/server/controllers/serviceTracker.controller.ts", "utf8");

test("public tracker tidak mengirim nominal dan metadata timeline", () => {
  assert.equal(tracker.includes("estimatedCost: Number(row.estimatedCost"), true);
  assert.equal(tracker.includes("downPayment: Number(row.downPayment"), true);
  assert.match(tracker, /function portalTicketRow/);
  assert.match(tracker, /status: event\.status/);
  assert.match(tracker, /timestamp: event\.timestamp/);
});

test("token tracker wajib tenant host", () => {
  assert.match(tracker, /const tenantId = req\.hostTenant\?\.id/);
  assert.match(tracker, /s\.tenant_id=\$2 AND s\.deleted_at IS NULL/);
});
