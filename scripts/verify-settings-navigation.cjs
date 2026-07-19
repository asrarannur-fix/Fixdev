require("dotenv").config();
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => m.type() === "error" && errors.push(m.text()));
  await p.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForTimeout(3000);
  await p.getByRole("button", { name: /^Masuk$/ }).click();
  await p.locator('input[type="email"]').fill(process.env.TEST_TENANT_EMAIL);
  await p.locator('input[type="password"]').fill(process.env.TEST_TENANT_PASSWORD);
  await p.locator('#login-page button[type="submit"]').click();
  await p.waitForTimeout(8000);
  console.log("LOGIN", await p.locator("#main-app-container").count() === 1 ? "PASS" : "FAIL");
  await p.locator("#settings-trigger-btn").click();
  await p.waitForTimeout(1200);
  const groups = [
    ["White-Label", ["Branding & White-Label", "Multi-Cabang & Lokasi", "Hak Akses & Staff"]],
    ["Parameter", ["Parameter & Modul", "Printer & Ketentuan Nota", "Workflow Automation", "Kontrak Maintenance Berkala", "Operasional (Servis, POS, Stok, Akuntansi, HRM)"]],
    ["SaaS", ["SaaS Subscription Billing", "Voucher & Poin Loyalitas", "Impor / Ekspor Data Massal", "Aplikasi & Tampilan (Umum, Portal, Email, Tema)"]],
    ["WhatsApp", ["WhatsApp Connector", "Bot Telegram Alert", "Integrasi & Notifikasi", "Developer REST API & Tokens"]],
    ["Keamanan", ["Keamanan & Login", "Backup & Audit"]],
  ];
  const results = [];
  for (const [group, labels] of groups) {
    const groupButton = p.locator("button").filter({ hasText: group }).first();
    const groupFound = await groupButton.count() > 0;
    if (!groupFound) { results.push({ group, status: "GROUP_NOT_FOUND" }); continue; }
    await groupButton.click(); await p.waitForTimeout(500);
    for (const label of labels) {
      const tab = p.locator("button").filter({ hasText: label }).first();
      if (!await tab.count()) { results.push({ group, label, status: "TAB_NOT_FOUND" }); continue; }
      await tab.click(); await p.waitForTimeout(800);
      const text = await p.locator("body").innerText();
      results.push({ group, label, status: text.includes(label) ? "PASS" : "NOT_RENDERED" });
    }
  }
  console.log("RESULTS", JSON.stringify(results));
  console.log("ERRORS", JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
