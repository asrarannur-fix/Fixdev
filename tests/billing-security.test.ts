import test from "node:test";
import assert from "node:assert/strict";
import { buildMidtransSignature } from "../src/server/controllers/billing.controller";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("Midtrans signature uses the documented SHA-512 payload", () => {
  const signature = buildMidtransSignature("inv-1", "200", "99000.00", "server-secret");
  assert.equal(signature.length, 128);
  assert.equal(signature, buildMidtransSignature("inv-1", "200", "99000.00", "server-secret"));
  assert.notEqual(signature, buildMidtransSignature("inv-1", "200", "100000.00", "server-secret"));
});

test("manual payment migration enforces evidence and exactly one settlement", () => {
  const migration = readFileSync(resolve("migrations/006_secure_manual_payments.sql"), "utf8");
  assert.match(migration, /proof_size_bytes BIGINT NOT NULL CHECK \(proof_size_bytes BETWEEN 1 AND 5242880\)/);
  assert.match(migration, /BANK_TRANSFER.*MANUAL_QRIS/);
  assert.match(migration, /uq_manual_payment_pending_invoice/);
  assert.match(migration, /uq_billing_invoice_settlement/);
  assert.match(migration, /billing_notification_outbox/);
});

test("billing routes require role and tenant guards", () => {
  const routes = readFileSync(resolve("src/server/routes/billing.routes.ts"), "utf8");
  assert.match(routes, /router\.post\("\/plans", requireSuperAdmin/);
  assert.match(routes, /router\.get\("\/subscription", requireTenantOrSuperAdminPermission\("billing:view_subscription"\)/);
  assert.match(routes, /manual-payments\/:id\/approve", requireSuperAdmin/);
  assert.match(routes, /Direct payment confirmation has been removed/);
});

test("generic sync excludes privileged tables and dynamic id fields", () => {
  const controller = readFileSync(resolve("src/server/controllers/data.controller.ts"), "utf8");
  const allowlist = controller.match(/const ALLOWED_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
  assert.doesNotMatch(allowlist, /"users"|"audit_logs"|"api_tokens"/);
  assert.doesNotMatch(controller, /const \{ table, action, data, idField \}/);
  assert.match(controller, /const idCol = "id"/);
});
