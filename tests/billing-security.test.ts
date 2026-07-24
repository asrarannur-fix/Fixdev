import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMidtransSignature } from "../src/server/controllers/billing.controller";
import { readFileSync, readdirSync } from "node:fs";
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

test("manual payment persists before best-effort notification", () => {
  const controller = readFileSync(resolve("src/server/controllers/manualPayment.controller.ts"), "utf8");
  const submit = controller.match(/export async function submitManualPayment[\s\S]*?export async function listManualPayments/)?.[0] || "";
  assert.match(submit, /const result = await dbTransaction[\s\S]*?return \{ request: inserted\.rows\[0\] \};[\s\S]*?await dbTransaction\(\(client\) => notify/);
  assert.match(submit, /Manual payment notification failed/);
});

test("public payment and tracking handlers do not expose raw internal errors", () => {
  const tracking = readFileSync(resolve("src/server/controllers/serviceTracker.controller.ts"), "utf8");
  const billing = readFileSync(resolve("src/server/controllers/billing.controller.ts"), "utf8");
  assert.doesNotMatch(tracking, /res\.status\(500\)\.json\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(billing, /Midtrans webhook failed[\s\S]{0,180}res\.status\(500\)\.json\(\{ error: err\.message \}\)/);
});
test("API tenant boundaries and public tracking do not accept arbitrary fallbacks", () => {
  const apiV1 = readFileSync(resolve("src/server/controllers/apiV1.controller.ts"), "utf8");
  const tracking = readFileSync(resolve("src/server/controllers/serviceTracker.controller.ts"), "utf8");
  assert.match(apiV1, /req\.hostTenant && req\.hostTenant\.id !== tokenRecord\.tenantId/);
  assert.doesNotMatch(apiV1, /km_sanctum_token_owner|SEED_TOKENS_FALLBACK/);
  assert.doesNotMatch(tracking, /req\.query\?\.tenantId|req\.body\?\.tenantId/);
});

test("manual payment uploads validate PDF signatures", () => {
  const controller = readFileSync(resolve("src/server/controllers/manualPayment.controller.ts"), "utf8");
  assert.match(controller, /matchesPdfSignature/);
  assert.match(controller, /contentType === "application\/pdf"/);
  assert.match(controller, /fileBuffer\.length !== sizeBytes/);
});
test("controller 5xx responses do not expose internal error messages", () => {
  const controllersDir = resolve("src/server/controllers");
  const rawErrorResponse = /res\.status\((?:500|502|503)\)\.json\(\{[^}]*\b(?:err|error)\.message/;
  for (const file of readdirSync(controllersDir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(resolve(controllersDir, file), "utf8");
    assert.doesNotMatch(source, rawErrorResponse, file);
  }
});
test("generic sync excludes privileged tables and dynamic id fields", () => {
  const controller = readFileSync(resolve("src/server/controllers/data.controller.ts"), "utf8");
  const allowlist = controller.match(/const ALLOWED_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
  assert.doesNotMatch(allowlist, /"users"|"audit_logs"|"api_tokens"/);
  assert.doesNotMatch(controller, /const \{ table, action, data, idField \}/);
  assert.match(controller, /const idCol = "id"/);
});
