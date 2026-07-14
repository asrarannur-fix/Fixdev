#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const http = require("http");

const BASE_URL = "http://localhost:3000";

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...headers },
      timeout: 10000,
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
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
      return true;
    } else {
      console.log(`  ❌ ${name}: ${result}`);
      return false;
    }
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("=== Superadmin Browser Smoke Test ===\n");
  let passed = 0, failedCount = 0;
  const t = async (n, f) => { const ok = await test(n, f); if (ok) passed++; else failedCount++; };

  await t("Health endpoint", async () => {
    const r = await req("GET", "/api/health");
    return r.status === 200 && r.body.status === "ok" ? true : `status=${r.status}`;
  });

  await t("Supabase env status", async () => {
    const r = await req("GET", "/api/supabase/env-status");
    return r.status === 200 ? true : `status=${r.status}`;
  });

  await t("CORS headers present on health", async () => {
    const r = await req("GET", "/api/health", undefined, { origin: "http://localhost:3000" });
    const cors = r.headers["access-control-allow-origin"];
    return cors === "http://localhost:3000" ? true : `missing/incorrect: ${cors}`;
  });

  await t("CORS denies wrong origin", async () => {
    const r = await req("GET", "/api/health", undefined, { origin: "https://evil.com" });
    const cors = r.headers["access-control-allow-origin"];
    return cors === undefined || cors === "" ? true : `accepted: ${cors}`;
  });

  console.log(`\n=== Results: ${passed} PASS, ${failedCount} FAIL ===`);
  if (failedCount > 0) {
    console.log("❌ Superadmin Browser Smoke Test: FAILED");
    process.exit(1);
  } else {
    console.log("✅ Superadmin Browser Smoke Test: PASS");
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});