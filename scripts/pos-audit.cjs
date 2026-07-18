#!/usr/bin/env node
/**
 * POS Module Audit Script
 * Tests all 6 POS endpoints with real HTTP requests.
 * Run: node scripts/pos-audit.cjs
 */
"use strict";
require("dotenv").config();
const http = require("http");

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const TENANT_ID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";
const BRANCH_ID = "51149a85-9d18-4d5d-82bd-f14d473cf4c6";
const TOKEN = process.env.POS_TEST_TOKEN || "";

function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
        "x-tenant-id": TENANT_ID,
        ...extraHeaders,
      },
      timeout: 15000,
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, body: json || data });
      });
    });
    r.on("error", reject);
    r.on("timeout", () => { r.destroy(); reject(new Error("timeout")); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const results = [];
function log(step, pass, status, detail) {
  results.push({ step, pass, status, detail });
  const icon = pass ? "✅ PASS" : "❌ FAIL";
  console.log(`\n[${icon}] ${step}`);
  console.log(`  Status: ${status}`);
  console.log(`  Response: ${JSON.stringify(detail, null, 2).slice(0, 1000)}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("  AUDIT MODUL POS — FIXDEV ERP");
  console.log("=".repeat(60));
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Branch: ${BRANCH_ID}`);
  console.log(`Token: ${TOKEN ? TOKEN.slice(0, 20) + "..." : "(none)"}`);

  // ── STEP 1: GET /api/pos/shifts ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 1: GET /api/pos/shifts — List shift");
  console.log("-".repeat(60));
  try {
    const r = await req("GET", "/api/pos/shifts");
    const pass = r.status === 200 && r.body && Array.isArray(r.body.data);
    log("GET /api/pos/shifts", pass, r.status, r.body);
    var existingShifts = r.body?.data || [];
  } catch (e) {
    log("GET /api/pos/shifts", false, "ERROR", e.message);
    var existingShifts = [];
  }

  // ── STEP 2: POST /api/pos/shifts/open ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 2: POST /api/pos/shifts/open — Buka shift baru");
  console.log("-".repeat(60));

  // 2a. Test WITHOUT x-branch-id header (should fail or behave differently)
  console.log("\n  2a. Tanpa header x-branch-id (menggunakan query/body):");
  try {
    const r = await req("POST", "/api/pos/shifts/open", { startingCash: 1000000 });
    const pass = r.status === 201 && r.body?.data?.id;
    log("POST /api/pos/shifts/open (no x-branch-id)", r.status === 201 || r.status === 400, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/shifts/open (no x-branch-id)", false, "ERROR", e.message);
  }

  // 2b. Test WITH x-branch-id header
  console.log("\n  2b. Dengan header x-branch-id:");
  let shiftId = null;
  try {
    const r = await req("POST", "/api/pos/shifts/open", { startingCash: 500000 }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 201 && r.body?.data?.id;
    if (pass) shiftId = r.body.data.id;
    log("POST /api/pos/shifts/open (with x-branch-id)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/shifts/open (with x-branch-id)", false, "ERROR", e.message);
  }

  // 2c. Test ZOD validation (negative starting cash)
  console.log("\n  2c. Validasi ZOD (startingCash negatif):");
  try {
    const r = await req("POST", "/api/pos/shifts/open", { startingCash: -100 }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 422 && r.body?.errors;
    log("POST /api/pos/shifts/open (ZOD invalid)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/shifts/open (ZOD invalid)", false, "ERROR", e.message);
  }

  // 2d. Test opening second shift (should 409 conflict)
  console.log("\n  2d. Buka shift kedua (harus 409 conflict):");
  try {
    const r = await req("POST", "/api/pos/shifts/open", { startingCash: 300000 }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 409;
    log("POST /api/pos/shifts/open (duplicate)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/shifts/open (duplicate)", false, "ERROR", e.message);
  }

  // ── STEP 4: POST /api/pos/transactions (before close) ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 4: POST /api/pos/transactions — Buat transaksi POS");
  console.log("-".repeat(60));

  // 4a. Valid transaction
  console.log("\n  4a. Transaksi valid (CASH):");
  let txId = null;
  try {
    const r = await req("POST", "/api/pos/transactions", {
      items: [{ name: "Test Item POS", quantity: 2, unitPrice: 50000, discount: 0 }],
      paymentMethod: "CASH",
      amountPaid: 110000,
    }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 201 && r.body?.data?.id;
    if (pass) txId = r.body.data.id;
    log("POST /api/pos/transactions (valid CASH)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/transactions (valid CASH)", false, "ERROR", e.message);
  }

  // 4b. ZOD validation - empty items
  console.log("\n  4b. Validasi ZOD (items kosong):");
  try {
    const r = await req("POST", "/api/pos/transactions", {
      items: [],
      paymentMethod: "CASH",
    }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 422;
    log("POST /api/pos/transactions (empty items)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/transactions (empty items)", false, "ERROR", e.message);
  }

  // 4c. ZOD validation - invalid payment method
  console.log("\n  4c. Validasi ZOD (paymentMethod invalid):");
  try {
    const r = await req("POST", "/api/pos/transactions", {
      items: [{ name: "Item", quantity: 1, unitPrice: 10000 }],
      paymentMethod: "BITCOIN",
    }, { "x-branch-id": BRANCH_ID });
    const pass = r.status === 422;
    log("POST /api/pos/transactions (invalid payment)", pass, r.status, r.body);
  } catch (e) {
    log("POST /api/pos/transactions (invalid payment)", false, "ERROR", e.message);
  }

  // ── STEP 5: Idempotency check ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 5: Idempotency Check — POST /api/pos/transactions");
  console.log("-".repeat(60));
  console.log("\n  Catatan: Controller POS tidak memiliki mekanisme idempotency key.");
  console.log("  Tidak ada field idempotencyKey di posSaleSchema.");
  console.log("  Tidak ada pengecekan duplikat di createSale().");
  console.log("  Hasil: FITUR IDEMPOTENCY TIDAK ADA di modul POS.");
  log("Idempotency (POS module)", false, "N/A",
    { note: "No idempotency key support in posSaleSchema or createSale()",
      schema_fields: ["customerId","items","paymentMethod","amountPaid","discountAmount","depositUsed","paymentDetails","notes","splitPayments"],
      idempotencyKeyPresent: false });

  // ── STEP 6: GET /api/pos/sales ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 6: GET /api/pos/sales — Report penjualan");
  console.log("-".repeat(60));
  try {
    const r = await req("GET", "/api/pos/sales");
    const pass = r.status === 200 && r.body && Array.isArray(r.body.data);
    log("GET /api/pos/sales", pass, r.status, r.body);
  } catch (e) {
    log("GET /api/pos/sales", false, "ERROR", e.message);
  }

  // ── STEP 3: POST /api/pos/shifts/:id/close ──
  console.log("\n" + "-".repeat(60));
  console.log("STEP 3: POST /api/pos/shifts/:id/close — Tutup shift");
  console.log("-".repeat(60));
  if (shiftId) {
    try {
      const r = await req("POST", `/api/pos/shifts/${shiftId}/close`, {
        actualEndingCash: 650000,
        notes: "Audit test close",
      }, { "x-branch-id": BRANCH_ID });
      const pass = r.status === 200 && r.body?.data?.status === "CLOSED";
      log(`POST /api/pos/shifts/${shiftId}/close`, pass, r.status, r.body);
    } catch (e) {
      log(`POST /api/pos/shifts/${shiftId}/close`, false, "ERROR", e.message);
    }
  } else {
    log("POST /api/pos/shifts/:id/close", false, "SKIPPED", "No shift ID from step 2");
  }

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  console.log("  RINGKASAN AUDIT");
  console.log("=".repeat(60));
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`  Total checks: ${results.length}`);
  console.log(`  PASS: ${passed}`);
  console.log(`  FAIL: ${failed}`);
  console.log("");
  console.log("  Detail per langkah:");
  results.forEach((r) => {
    console.log(`    ${r.pass ? "✅" : "❌"} ${r.step} — ${r.status}`);
  });
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
