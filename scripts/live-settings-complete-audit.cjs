#!/usr/bin/env node
"use strict";
require("dotenv").config();
const { chromium } = require("playwright");
const BASE = process.env.TEST_BASE_URL || "https://fixdev.web.id";
const email = process.env.TEST_TENANT_EMAIL;
const password = process.env.TEST_TENANT_PASSWORD;
if (!email || !password) throw new Error("TEST credentials required at runtime");

const tabs = [
  "White-Label", "Multi-Cabang", "WhatsApp", "Bot", "Integrasi",
  "Workflow", "Hak", "Parameter", "Printer", "Developer", "SaaS",
  "Impor", "Voucher", "Kontrak", "Cloud", "Operasional", "Aplikasi",
  "Keamanan", "Backup",
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-http2"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText || "failed"}`));

  const auditUrl = `${BASE}${BASE.includes("?") ? "&" : "?"}audit=1`;
  let navigated = false;
  for (let attempt = 1; attempt <= 3 && !navigated; attempt++) {
    try {
      await page.goto(auditUrl, { waitUntil: "commit", timeout: 20000 });
      navigated = true;
    } catch (error) {
      if (await page.locator("#root").count().catch(() => 0)) {
        navigated = true;
        break;
      }
      if (attempt === 3) throw error;
      await page.waitForTimeout(attempt * 1000);
    }
  }
  await page.locator("#root").waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /^Masuk$/ }).click({ noWaitAfter: true });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('#login-page button[type="submit"]').click({ noWaitAfter: true });
  await page.waitForTimeout(8000);
  const loginPass = await page.locator("#main-app-container").count() === 1 && await page.locator("#login-page").count() === 0;
  console.log("LOGIN", loginPass ? "PASS" : "FAIL");
  if (!loginPass) throw new Error("Owner login failed");

  await page.locator("#settings-trigger-btn").click({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const inputInfo = await page.locator('input').evaluateAll((els) => els.map((e) => ({ placeholder: e.placeholder, type: e.type, value: e.value, visible: !!(e.offsetWidth || e.offsetHeight) })));
  console.log("SETTINGS_INPUTS", JSON.stringify(inputInfo));
  const settingsSearch = page.locator('input[placeholder*="Cari"]:visible').first();
  console.log("SETTINGS_SEARCH", await settingsSearch.count() === 1 ? "PASS" : "FAIL");
  if (await settingsSearch.count() !== 1) throw new Error("Settings search missing");
  const search = settingsSearch;

  const results = [];
  for (let i = 0; i < tabs.length; i++) {
    const label = tabs[i];
    if (i > 0 && !(await page.getByText("PENGATURAN SISTEM", { exact: true }).count())) {
      await page.locator("#settings-trigger-btn").dispatchEvent("click");
      await page.waitForTimeout(500);
    }
    await search.fill("");
    const matchingButton = page.locator("button").filter({ hasText: label }).first();
    await matchingButton.waitFor({ state: "visible", timeout: 15000 });
    await matchingButton.dispatchEvent("click");
    await page.waitForTimeout(700);
    const after = await page.locator("body").innerText({ timeout: 15000 });
    const visible = after.includes(label) && !after.includes("Tidak ditemukan pengaturan");
    const tail = after.slice(-900).replace(/\n/g, " | ");
    const runtimeError = /TypeError|ReferenceError|Cannot read properties|Unhandled|exception/i.test(tail);
    const buttons = await page.locator("button").evaluateAll((els) => els.map((e) => (e.textContent || "").trim().replace(/\s+/g, " ")).filter(Boolean).slice(-14));
    results.push({ index: i + 1, label, status: !visible ? "NOT_RENDERED" : runtimeError ? "RUNTIME_ERROR_TEXT" : "PASS", fields: await page.locator("input,select,textarea").count(), buttons, marker: tail });
    await page.screenshot({ path: `/home/ubuntu/barufix/screenshots-bukti/settings-complete-${String(i + 1).padStart(2, "0")}.png`, fullPage: true });
  }

  // Real function checks, no fake success claims.
  await search.fill("WhatsApp"); await page.waitForTimeout(700);
  const waButton = page.locator("button").filter({ hasText: "WhatsApp Connector" }).first();
  if (await waButton.count()) await waButton.click().catch(() => {});
  await page.waitForTimeout(1000);
  const waPane = await page.locator("#whatsapp-connector-module").count();
  const ping = page.getByRole("button", { name: "Ping Test", exact: true }).first();
  let waTest = "NOT_AVAILABLE_MANUAL_OR_DISCONNECTED";
  if (await ping.count() && await ping.isVisible().catch(() => false)) {
    await ping.click(); await page.waitForTimeout(1500);
    waTest = (await page.locator("body").innerText()).slice(-700).replace(/\n/g, " | ");
  }

  await search.fill("Telegram"); await page.waitForTimeout(700);
  const tgButton = page.locator("button").filter({ hasText: "Bot Telegram Alert" }).first();
  if (await tgButton.count()) await tgButton.click().catch(() => {});
  await page.waitForTimeout(1000);
  const tgPane = await page.locator("#telegram-bot-pane").count();
  const tgTest = page.getByRole("button", { name: "Uji Kirim Pesan", exact: true }).first();
  let tgTestResult = "NOT_CLICKED";
  if (await tgTest.count() && await tgTest.isVisible().catch(() => false)) {
    await tgTest.click(); await page.waitForTimeout(1500);
    tgTestResult = (await page.locator("body").innerText()).slice(-700).replace(/\n/g, " | ");
  }

  console.log("TAB_RESULTS", JSON.stringify(results, null, 2));
  console.log("WHATSAPP", JSON.stringify({ pane: waPane, test: waTest }));
  console.log("TELEGRAM", JSON.stringify({ pane: tgPane, test: tgTestResult }));
  console.log("CONSOLE_ERRORS", JSON.stringify(consoleErrors));
  console.log("FAILED_REQUESTS", JSON.stringify(failedRequests));
  await browser.close();
})().catch((e) => { console.error("AUDIT_FATAL", e.stack || e.message); process.exit(1); });

// ponytail: this audit proves rendered panel access and real integration test paths; add per-panel CRUD fixtures only when each API contract has isolated rollback support.
// upgrade path: one create/update/read-back/delete transaction per mutable manager.
