#!/usr/bin/env node
"use strict";
require("dotenv").config();
const { chromium } = require("playwright");
const BASE = process.env.TEST_BASE_URL || "https://fixdev.web.id";
const email = process.env.TEST_TENANT_EMAIL;
const password = process.env.TEST_TENANT_PASSWORD;
if (!email || !password) throw new Error("TEST credentials required at runtime");

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(e.message));
  page.on("requestfailed", r => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText || "failed"}`));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: /^Masuk$/ }).click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('#login-page button[type="submit"]').click();
  await page.waitForTimeout(9000);
  const loginOK = await page.locator("#main-app-container").count() === 1 && await page.locator("#login-page").count() === 0;
  console.log("LOGIN", loginOK ? "PASS" : "FAIL", page.url());
  if (!loginOK) throw new Error("Owner login failed");

  await page.locator("#settings-trigger-btn").click();
  await page.waitForTimeout(3500);
  const settingsOK = (await page.getByText("PENGATURAN SISTEM", { exact: true }).count()) === 1;
  console.log("SETTINGS_BUTTONS", await page.locator("button").evaluateAll(es => es.map(e => (e.textContent || "").trim().replace(/\\s+/g, " ")).filter(Boolean).slice(-40)));
  console.log("SETTINGS_OPEN", settingsOK ? "PASS" : "FAIL");
  await page.screenshot({ path: "screenshots-bukti/settings-full-00-open.png", fullPage: true });

  const tabs = [
    ["White-Label", "Branding & White-Label"], ["White-Label", "Multi-Cabang & Lokasi"], ["White-Label", "Hak Akses & Staff"],
    ["Parameter", "Parameter & Modul"], ["Parameter", "Printer & Ketentuan Nota"], ["Parameter", "Workflow Automation"], ["Parameter", "Kontrak Maintenance Berkala"], ["Parameter", "Operasional (Servis, POS, Stok, Akuntansi, HRM)"],
    ["SaaS", "SaaS Subscription Billing"], ["SaaS", "Voucher & Poin Loyalitas"], ["SaaS", "Impor / Ekspor Data Massal"], ["SaaS", "Aplikasi & Tampilan (Umum, Portal, Email, Tema)"],
    ["WhatsApp", "WhatsApp Connector"], ["WhatsApp", "Bot Telegram Alert"], ["WhatsApp", "Integrasi & Notifikasi"], ["WhatsApp", "Developer REST API & Tokens"],
    ["Keamanan", "Keamanan & Login"], ["Keamanan", "Backup & Audit"],
  ];
  console.log("TAB_COUNT", tabs.length, tabs.map(x => x[1]));
  const results = [];
  for (const [groupButtonLabel, label] of tabs) {
    const groupNeedle = { "White-Label": "Perusahaan", "Parameter": "Operasional", "SaaS": "Keuangan", "WhatsApp": "Integrasi", "Keamanan": "Keamanan" }[groupButtonLabel];
    const groupIndex = await page.locator("button").evaluateAll((els, needle) => els.findIndex((e) => (e.textContent || "").includes(needle)), groupNeedle);
    if (groupIndex < 0) { results.push({ label, status: "GROUP_BUTTON_MISSING" }); continue; }
    await page.locator("button").nth(groupIndex).click();
    await page.waitForTimeout(350);
    const tab = page.locator("button").filter({ hasText: label }).first();
    if (!(await tab.count()) || !(await tab.isVisible().catch(() => false))) { results.push({ label, status: "TAB_MISSING" }); continue; }
    await tab.click();
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    const inputs = await page.locator("input, select, textarea").count();
    const marker = text.slice(-900).replace(/\\n/g, " | ");
    const hasErrorText = /exception|cannot read|undefined is not/i.test(marker);
    results.push({ label, status: hasErrorText ? "VISIBLE_WITH_ERROR_TEXT" : "PASS", inputs, marker });
    await page.screenshot({ path: `screenshots-bukti/settings-full-${String(results.length).padStart(2, "0")}.png`, fullPage: true });
  }
  console.log("TAB_RESULTS", JSON.stringify(results, null, 2));
  console.log("BROWSER_ERRORS", errors);
  console.log("FAILED_REQUESTS", failedRequests);
  await browser.close();
})().catch(e => { console.error("AUDIT_FATAL", e.stack || e.message); process.exit(1); });
