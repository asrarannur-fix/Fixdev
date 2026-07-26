import assert from "node:assert/strict";
import test from "node:test";
import { CRUD_RESOURCES } from "../src/server/plugins/crudPlugin.js";

test("Data Manager exposes suppliers and protects workflow-owned resources", () => {
  assert.equal(CRUD_RESOURCES.suppliers.table, "suppliers");
  assert.equal(CRUD_RESOURCES.service_tickets.readOnly, true);
  assert.equal(CRUD_RESOURCES.journal_entries.readOnly, true);
  assert.equal(CRUD_RESOURCES.pos_shifts.readOnly, true);
});
