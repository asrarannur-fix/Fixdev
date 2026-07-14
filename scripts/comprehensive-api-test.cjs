#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const http = require("http");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
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
  console.log("=== FIXDEV Comprehensive API Test ===\n");
  console.log("--- 1. Health Check ---");
  await test("GET /api/health", async () => {
    const r = await req("GET", "/api/health");
    return r.status === 200 && r.body.status === "ok" ? true : `status=${r.status}`;
  });

  console.log("\n--- 2. Auth Enforcement ---");
  await test("GET /api/bootstrap returns 401", async () => {
    const r = await req("GET", "/api/bootstrap?tenantId=tenant-owner-1");
    return r.status === 401 || r.status === 403 ? true : `status=${r.status}`;
  });

  console.log("\n--- 3. Onboarding Validation ---");
  await test("POST /api/onboarding/register validation", async () => {
    const r = await req("POST", "/api/onboarding/register", {});
    return r.status === 422 ? true : `status=${r.status}`;
  });

  console.log("\n--- 5. Supabase Env Status ---");
  await test("GET /api/supabase/env-status", async () => {
    const r = await req("GET", "/api/supabase/env-status");
    return r.status === 200 ? true : `status=${r.status}`;
  });

  console.log("\n--- 6. CORS Headers ---");
  await test("CORS origin header present", async () => {
    const r = await req("GET", "/api/health", undefined, { origin: "http://localhost:3000" });
    const cors = r.headers["access-control-allow-origin"];
    return cors === "http://localhost:3000" ? true : `missing/incorrect header: ${cors}`;
  });

  await test("CORS deny wrong origin", async () => {
    const r = await req("GET", "/api/health", undefined, { origin: "https://evil.com" });
    const cors = r.headers["access-control-allow-origin"];
    return cors === undefined || cors === "" ? true : `accepted wrong origin: ${cors}`;
  });

  console.log(`\n=== Results: ${passed} PASS, ${failed} FAIL ===`);
  if (failed > 0) {
    console.log("\n❌ Comprehensive API Test: FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ Comprehensive API Test: PASS");
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
