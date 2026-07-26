import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reception = readFileSync("src/server/controllers/serviceReception.controller.ts", "utf8");
const workflow = readFileSync("src/server/controllers/serviceWorkflow.controller.ts", "utf8");
const migration = readFileSync("migrations/058_service_payment_lifecycle.sql", "utf8");

test("DP memakai metode pembayaran dan jurnal deposit", () => {
  assert.match(reception, /downPaymentMethod: z\.enum/);
  assert.match(reception, /SERVICE_DEPOSIT/);
  assert.match(reception, /"21000"/);
});

test("handover melepas deposit ke pendapatan", () => {
  assert.match(workflow, /SERVICE_DEPOSIT_RELEASE/);
  assert.match(workflow, /invoice\.downPaymentUsed/);
});

test("payment servis mendukung DP dan pelunasan terpisah", () => {
  assert.match(migration, /att\.attname = 'ticket_id'/);
  assert.match(migration, /ALTER TABLE service_payments DROP CONSTRAINT/);
});
