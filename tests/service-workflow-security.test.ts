import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dataController = readFileSync("src/server/controllers/data.controller.ts", "utf8");
const apiRoutes = readFileSync("src/server/routes/apiV1.routes.ts", "utf8");
const workflow = readFileSync("src/server/controllers/serviceWorkflow.controller.ts", "utf8");

test("generic data sync tidak membuka mutasi service_tickets", () => {
  assert.equal(dataController.includes("'service_tickets',"), false);
  assert.equal(dataController.includes("await ensureServiceTicketColumns()"), false);
});

test("workflow mencegah handover dan payment method invalid", () => {
  assert.match(workflow, /if \(ticket\.handoverAt\)/);
  assert.match(workflow, /z\.enum\(\['CASH', 'BANK_TRANSFER', 'QRIS', 'EDC', 'E_WALLET', 'TEMPO'\]\)/);
  assert.match(workflow, /requireTicketWarehouse/);
  assert.match(workflow, /deleted_at IS NULL/);
});

test("API v1 menolak mutasi ticket legacy", () => {
  assert.equal(apiRoutes.includes("Mutasi tiket wajib melalui API workflow Servis."), true);
  assert.match(apiRoutes, /router\.all\(\s*\['\/tickets', '\/tickets\/:id'\]/);
});
