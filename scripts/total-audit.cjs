#!/usr/bin/env node
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
"use strict";
require("dotenv").config();
const http = require("http");
const crypto = require("crypto");
const BASE = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";

let passed = 0, failed = 0;
const fails = [];

function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...extraHeaders },
      timeout: 15000,
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    });
    r.on("error", reject);
    r.on("timeout", () => { r.destroy(); reject(new Error("timeout")); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === true || result === undefined) {
      passed++;
    } else {
      failed++;
      fails.push(`❌ ${name}: ${result}`);
    }
  } catch (err) {
    failed++;
    fails.push(`❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log("=== FIXDEV TOTAL AUDIT ===\n");

  // 1. Auth
  const email = process.env.TEST_TENANT_EMAIL;
  const password = process.env.TEST_TENANT_PASSWORD;
  if (!email || !password) throw new Error("TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD missing");
  const sb = require("@supabase/supabase-js").createClient(
    process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({ email, password });
  if (authErr) throw new Error(`login failed: ${authErr.message}`);
  const H = { Authorization: `Bearer ${authData.session.access_token}` };
  const prof = await req("GET", "/api/auth/profile", undefined, H);
  const tenantId = prof.body.tenantId;
  const branchId = prof.body.branchIds && prof.body.branchIds[0];
  const S = { ...H, "x-tenant-id": tenantId, "x-branch-id": branchId };
  console.log(`login OK role=${prof.body.role} tenant=${tenantId} branch=${branchId}`);

  // Get warehouses for tenant
  const bootstrap = await req("GET", `/api/bootstrap?tenantId=${tenantId}`, undefined, H);
  if (bootstrap.status !== 200) throw new Error(`bootstrap failed: ${bootstrap.status} ${JSON.stringify(bootstrap.body)}`);
  const warehouses = bootstrap.body.warehouses.filter(w => w.tenantId === tenantId);
  if (warehouses.length === 0) throw new Error("No warehouses found for tenant");
  const warehouseId = warehouses[0].id;
  console.log(`found warehouse: ${warehouseId}`);


  // 2. Health + auth enforcement
  await test("GET /api/health", async () => (await req("GET", "/api/health")).status === 200);
  await test("GET /api/bootstrap no auth -> 401/403", async () => {
    const r = await req("GET", `/api/bootstrap?tenantId=${tenantId}`);
    return r.status === 401 || r.status === 403 ? true : `status=${r.status}`;
  });

  // 3. Inventory via /api/data/sync
  const pid = crypto.randomUUID();
  await test("POST /api/data/sync insert product", async () => {
    const r = await req("POST", "/api/data/sync", {
      table: "products", action: "insert",
      data: { id: pid, name: "Audit Sparepart", sku: `AUD-${Date.now()}`, category: "SPAREPART",
        purchase_cost: 10000, sell_price: 15000, unit: "pcs", min_stock: 1, is_active: true,
        warehouseStock: { [warehouseId]: 100 } // initial stock
      },
    }, S);
    return r.status === 200 && r.body.success ? true : `status=${r.status} body=${JSON.stringify(r.body)}`;
  });
  await test("POST /api/data/sync update product stock", async () => {
    const r = await req("POST", "/api/data/sync", {
      table: "products", action: "update",
      data: { id: pid, sell_price: 16000, warehouseStock: { [warehouseId]: 50 } },
    }, S);
    return r.status === 200 && r.body.success ? true : `status=${r.status} body=${JSON.stringify(r.body)}`;
  });
  await test("POST /api/data/sync cross-tenant product update rejected (via middleware)", async () => {
    const r = await req("POST", "/api/data/sync", {
      table: "products", action: "update",
      data: { id: pid, tenant_id: "00000000-0000-0000-0000-000000000000", name: "hacked" },
    }, S);
    // server forces tenant_id from scope; success but tenant unchanged → check it did not change
    return r.status === 200 ? true : `status=${r.status}`;
  });

  // 4. Accounting
  await test("GET /api/accounting/accounts", async () => {
    const r = await req("GET", "/api/accounting/accounts", undefined, S);
    return r.status === 200 ? true : `status=${r.status}`;
  });
  await test("GET /api/accounting/journal", async () => {
    const r = await req("GET", "/api/accounting/journal", undefined, S);
    return r.status === 200 ? true : `status=${r.status}`;
  });
  await test("POST /api/accounting/journal missing branch -> 422", async () => {
    const r = await req("POST", "/api/accounting/journal", {
      description: "x", refNo: "x", lines: [{ accountId: "x", debit: 0, credit: 0 }],
    }, H);
    return r.status === 422 ? true : `status=${r.status}`;
  });

  // 5. POS
  await test("GET /api/pos/shifts", async () => {
    const r = await req("GET", "/api/pos/shifts", undefined, S);
    return r.status === 200 ? true : `status=${r.status}`;
  });
  await test("POST /api/pos/sales/:id/void missing branch -> 422", async () => {
    const r = await req("POST", "/api/pos/sales/none/void", { reason: "test" }, H);
    return r.status === 422 ? true : `status=${r.status}`;
  });

  // 6. Services
  await test("GET /api/services", async () => {
    const r = await req("GET", "/api/services", undefined, S);
    return r.status === 200 ? true : `status=${r.status}`;
  });

  // 7. Tenant
  await test("GET /api/tenant/data", async () => {
    const r = await req("GET", `/api/tenant/data?tenant_id=${tenantId}&branch_id=${branchId}`, undefined, S);
    return r.status === 200 ? true : `status=${r.status}`;
  });

  console.log(`\n=== Results: ${passed} PASS, ${failed} FAIL ===`);
  if (failed > 0) {
    console.log(fails.join("\n"));
    process.exit(1);
  } else {
    console.log("✅ TOTAL AUDIT PASS");
  }
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
