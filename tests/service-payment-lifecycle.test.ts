import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reception = readFileSync("src/server/controllers/serviceReception.controller.ts", "utf8");
const workflow = readFileSync("src/server/controllers/serviceWorkflow.controller.ts", "utf8");
const lifecycleMigration = readFileSync("migrations/058_service_payment_lifecycle.sql", "utf8");
const financeMigration = readFileSync("migrations/059_service_payment_tax_snapshot.sql", "utf8");

test("handover melepas DP tanpa mencatat pendapatan ganda", () => {
  assert.match(reception, /downPayment/);
  assert.match(workflow, /depositAccountId/);
  assert.match(workflow, /'21000'/);
  assert.match(workflow, /invoice\.downPaymentUsed/);
  assert.match(workflow, /invoice\.subtotal/);
});

test("payment servis mendukung DP dan pelunasan terpisah", () => {
  assert.match(lifecycleMigration, /att\.attname = 'ticket_id'/);
  assert.match(lifecycleMigration, /ALTER TABLE service_payments DROP CONSTRAINT/);
});

test("finance servis memakai pajak server, piutang TEMPO, dan HPP", () => {
  assert.doesNotMatch(workflow, /parsed\.data\.taxRate/);
  assert.match(workflow, /service_receivables/);
  assert.match(workflow, /purchase_cost/);
  assert.match(workflow, /'10500'/);
  assert.match(financeMigration, /service_receivable_payments/);
  assert.match(financeMigration, /tax_rate NUMERIC/);
});
