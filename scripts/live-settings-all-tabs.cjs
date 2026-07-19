require("dotenv").config();
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-http2"] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], failed = [];
  p.on("console", m => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", e => errors.push(e.message));
  p.on("requestfailed", r => failed.push(`${r.method()} ${r.url()}`));
  await p.goto(process.env.TEST_BASE_URL || "http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForTimeout(3000);
  await p.getByRole("button", { name: /^Masuk$/ }).click();
  await p.locator('input[type="email"]').fill(process.env.TEST_TENANT_EMAIL);
  await p.locator('input[type="password"]').fill(process.env.TEST_TENANT_PASSWORD);
  await p.locator('#login-page button[type="submit"]').click();
  await p.waitForTimeout(8000);
  console.log("LOGIN", await p.locator("#main-app-container").count() === 1 ? "PASS" : "FAIL");
  await p.locator("#settings-trigger-btn").click(); await p.waitForTimeout(1500);
  const groups = [
    ["White-Label", ["Branding & White-Label", "Multi-Cabang & Lokasi", "Hak Akses & Staff"]],
    ["Parameter", ["Parameter & Modul", "Printer & Ketentuan Nota", "Workflow Automation", "Kontrak Maintenance Berkala", "Operasional (Servis, POS, Stok, Akuntansi, HRM)"]],
    ["SaaS", ["SaaS Subscription Billing", "Voucher & Poin Loyalitas", "Impor / Ekspor Data Massal", "Aplikasi & Tampilan (Umum, Portal, Email, Tema)"]],
    ["WhatsApp", ["WhatsApp Connector", "Bot Telegram Alert", "Integrasi & Notifikasi", "Developer REST API & Tokens"]],
    ["Keamanan", ["Keamanan & Login", "Backup & Audit"]],
  ];
  const results = [];
  for (const [short, labels] of groups) {
    const groupButton = p.locator("button").filter({ hasText: new RegExp(`^${short}$`) }).first();
    if (!(await groupButton.count())) { results.push({ short, status: "GROUP_BUTTON_MISSING" }); continue; }
    await groupButton.click(); await p.waitForTimeout(400);
    for (const label of labels) {
      const tab = p.locator("button").filter({ hasText: label }).first();
      if (!(await tab.count())) { results.push({ short, label, status: "TAB_MISSING" }); continue; }
      await tab.click(); await p.waitForTimeout(1000);
      const text = await p.locator("body").innerText();
      const marker = text.slice(-700).replace(/\n/g, " | ");
      results.push({ short, label, status: /exception|cannot read|undefined is not/i.test(marker) ? "ERROR_TEXT" : "PASS", fields: await p.locator("input,select,textarea").count(), marker });
      await p.screenshot({ path: `screenshots-bukti/settings-all-${results.length}.png`, fullPage: true });
    }
  }
  console.log("RESULTS", JSON.stringify(results, null, 2));
  console.log("CONSOLE_ERRORS", errors); console.log("FAILED_REQUESTS", failed);
  await b.close();
})().catch(e => { console.error("FATAL", e.stack || e.message); process.exit(1); });
