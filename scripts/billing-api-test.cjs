#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const http = require("http");
const BASE = process.env.TEST_BASE_URL || "https://fixdev.web.id";
let passed = 0, failed = 0;

function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...extraHeaders },
      timeout: 10000,
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
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}: ${result}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log("=== Billing API End-to-End Test ===\n");
  console.log("Note: Billing endpoints require Supabase JWT authentication.");
  console.log("      Unauthenticated tests verify auth enforcement.\n");

  const tenantId = "tenant-owner-1";

  console.log("--- 1. Auth Enforcement ---");
  await test("GET /api/billing/plans returns 401 without auth", async () => {
    const r = await req("GET", "/api/billing/plans");
    return r.status === 401 ? true : `status=${r.status}`;
  });

  await test("GET /api/billing/subscription returns 401 without auth", async () => {
    const r = await req("GET", `/api/billing/subscription?tenantId=${tenantId}`);
    return r.status === 401 ? true : `status=${r.status}`;
  });

  await test("POST /api/billing/create-invoice returns 401 without auth", async () => {
    const r = await req("POST", "/api/billing/create-invoice", {
      tenantId, tier: "BASIC", billingCycle: "monthly"
    });
    return r.status === 401 ? true : `status=${r.status}`;
  });

  console.log("\n--- 2. Public Endpoints (if any) ---");
  await test("GET /api/health returns 200", async () => {
    const r = await req("GET", "/api/health");
    return r.status === 200 && r.body.status === "ok" ? true : `status=${r.status}`;
  });

  console.log("\n--- 3. Notification Endpoints (require auth) ---");
  await test("POST /api/billing/notify-due-reminders returns 401 without auth", async () => {
    const r = await req("POST", "/api/billing/notify-due-reminders", {});
    return r.status === 401 ? true : `status=${r.status}`;
  });

  await test("POST /api/billing/notify-overdue-alerts returns 401 without auth", async () => {
    const r = await req("POST", "/api/billing/notify-overdue-alerts", {});
    return r.status === 401 ? true : `status=${r.status}`;
  });

  await test("POST /api/billing/notify-payment-confirmation returns 401 without auth", async () => {
    const r = await req("POST", "/api/billing/notify-payment-confirmation", {
      invoiceId: "test-inv", tenantId
    });
    return r.status === 401 ? true : `status=${r.status}`;
  });

  console.log("\n--- 4. Gateway Config (require auth) ---");
  await test("GET /api/billing/gateway-config returns 401 without auth", async () => {
    const r = await req("GET", "/api/billing/gateway-config");
    return r.status === 401 ? true : `status=${r.status}`;
  });

  console.log("\n--- 5. Migration Verification ---");
  await test("Migration file 005_billing.sql exists", async () => {
    const fs = require("fs");
    const path = require("path");
    const migrationPath = path.join(process.cwd(), "migrations", "005_billing.sql");
    return fs.existsSync(migrationPath) ? true : "file not found";
  });

  console.log("\n=== Summary ===");
  console.log(`Auth enforcement tests: ${passed} PASS, ${failed} FAIL`);
  
  if (failed > 0) {
    console.log("\n❌ Some tests failed.");
    console.log("   To run full authenticated tests, set TEST_BASE_URL and provide a valid Supabase JWT.");
    process.exit(1);
  } else {
    console.log("\n✅ All billing API tests passed!");
    console.log("   Note: Full payment flow testing requires a valid Supabase JWT token.");
    console.log("   Run with a valid token by setting Authorization header in test script.");
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
