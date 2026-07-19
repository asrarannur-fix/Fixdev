#!/usr/bin/env node
"use strict";
require("dotenv").config();
const { chromium } = require("playwright");

const BASE = process.env.TEST_BASE_URL || "https://fixdev.web.id";
const email = process.env.TEST_TENANT_EMAIL;
const password = process.env.TEST_TENANT_PASSWORD;
if (!email || !password) throw new Error("TEST_TENANT_EMAIL and TEST_TENANT_PASSWORD are required at runtime");

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((error) => console.log("NAVIGATION_TIMEOUT_CONTINUE", error.message));
  await page.waitForTimeout(12000);
  console.log("LANDING", await page.title(), page.url());
  console.log("LANDING_CONTROLS", await page.locator("button,a,input").evaluateAll(es => es.map(e => ({ tag:e.tagName, text:(e.textContent||"").trim().slice(0,80), type:e.getAttribute("type"), id:e.id, aria:e.getAttribute("aria-label") })).filter(x=>x.text||x.type||x.id||x.aria).slice(0,80)));
  await page.screenshot({ path: "screenshots-bukti/live-settings-01-landing.png", fullPage: true });

  const masuk = page.getByRole("button", { name: /^Masuk$/ }).first();
  if (await masuk.count()) await masuk.click();
  else await page.getByText("Masuk", { exact: true }).first().click();
  await page.waitForTimeout(1000);
  console.log("LOGIN_FORM", await page.locator("#login-page").count(), await page.locator('input[type="email"]').count(), await page.locator('input[type="password"]').count());
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('#login-page button[type="submit"]').click();
  await page.waitForTimeout(15000);
  console.log("AFTER_LOGIN", page.url(), "main", await page.locator("#main-app-container").count(), "login", await page.locator("#login-page").count());
  console.log("DASHBOARD_TEXT", (await page.locator("body").innerText()).slice(0,1000));
  await page.screenshot({ path: "screenshots-bukti/live-settings-02-after-login.png", fullPage: true });

  const controls = await page.locator("button,a").evaluateAll(es => es.map(e => ({ text:(e.textContent||"").trim().replace(/\\s+/g," ").slice(0,100), id:e.id, aria:e.getAttribute("aria-label") })).filter(x=>x.text||x.id||x.aria));
  console.log("APP_CONTROLS", controls.slice(0,160));
  const settings = page.locator("#settings-trigger-btn");
  console.log("SETTINGS_MATCH", await settings.count(), await settings.isVisible().catch(() => false));
  await settings.click();
  await page.waitForTimeout(3000);
  console.log("SETTINGS_VIEW", { url:page.url(), settingsPane:await page.locator("#settings-pane").count(), body:(await page.locator("body").innerText()).slice(0,2000) });
  await page.screenshot({ path: "screenshots-bukti/live-settings-03-settings.png", fullPage: true });

  const settingsText = await page.locator("body").innerText();
  console.log("SETTINGS_BUTTONS", await page.locator('button').evaluateAll(es => es.map(e => ({text:(e.textContent||"").trim().replace(/\\s+/g," "), id:e.id, aria:e.getAttribute("aria-label")})).filter(x=>x.text||x.id||x.aria).slice(-40)));
  const waTab = page.locator("button").filter({ hasText: /^WhatsApp$/ }).first();
  console.log("WA_TAB", await waTab.count());
  if (await waTab.count()) {
    await waTab.click(); await page.waitForTimeout(2500);
    console.log("WA_VIEW", { pane:await page.locator("#whatsapp-connector-module").count(), body:(await page.locator("body").innerText()).slice(-2200) });
    await page.screenshot({ path:"screenshots-bukti/live-settings-04-whatsapp.png", fullPage:true });
    console.log("WA_BUTTONS", await page.locator('button').evaluateAll(es => es.map(e => (e.textContent||"").trim().replace(/\\s+/g," ")).filter(Boolean).slice(-60)));
    const test = page.getByRole("button", { name: "Ping Test", exact: true }).first();
    console.log("WA_TEST_BUTTON", await test.count());
    if (await test.count()) { await test.click(); await page.waitForTimeout(2500); console.log("WA_TEST_RESULT", (await page.locator("body").innerText()).slice(-900)); }
  }
  const tgTab = page.locator("button").filter({ hasText: /^Bot Telegram Alert$/ }).first();
  console.log("TG_TAB", await tgTab.count());
  if (await tgTab.count()) {
    await tgTab.click(); await page.waitForTimeout(2500);
    console.log("TG_VIEW", { pane:await page.locator("#telegram-bot-pane").count(), body:(await page.locator("body").innerText()).slice(-2000) });
    await page.screenshot({ path:"screenshots-bukti/live-settings-05-telegram.png", fullPage:true });
    const test = page.getByRole("button", { name:/Uji Kirim Pesan/i }).first();
    console.log("TG_TEST_BUTTON", await test.count());
    if (await test.count()) { await test.click(); await page.waitForTimeout(2500); console.log("TG_TEST_RESULT", (await page.locator("body").innerText()).slice(-900)); }
  }
  console.log("BROWSER_ERRORS", errors);
  await browser.close();
})().catch(e => { console.error("AUDIT_FATAL", e.stack || e.message); process.exit(1); });
