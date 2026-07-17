const { chromium } = require("playwright");

// ponytail: creds from runtime env, never commit. Replace with your test login.
const EMAIL = process.env.TEST_EMAIL || "asrarannur1@gmail.com";
const PASS = process.env.TEST_PASS || ""; // Required at runtime; never store passwords in source.

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERR: " + e.message));

  await page.goto("https://fixdev.web.id", { waitUntil: "networkidle" });

  // Login modal
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Masuk")');
  await page.waitForTimeout(2500);

  // Navigate to Servis tab — try sidebar link text
  const servisLink = page.locator('a, button').filter({ hasText: /Servis/i }).first();
  await servisLink.click();
  await page.waitForTimeout(1500);

  // Click Kalkulator subtab
  const calcTab = page.locator('button, a').filter({ hasText: /Kalkulator/i }).first();
  await calcTab.click();
  await page.waitForTimeout(1200);

  // Fill parameters and create quote
  await page.selectOption("select", { label: "iPhone 14 Pro (Premium Mobile)" }).catch(() => {});
  await page.locator('button:has-text("Buat Dokumen Penawaran Resmi")').click();
  await page.waitForTimeout(1500);

  const hasQuote = await page.locator("text=Penawaran No:").count();
  const hasGrandTotal = await page.locator("text=Grand Total:").count();

  await page.screenshot({ path: "/home/ubuntu/barufix/e2e-calc.png", fullPage: true });

  console.log(JSON.stringify({
    errors,
    hasQuote: hasQuote > 0,
    hasGrandTotal: hasGrandTotal > 0,
  }, null, 2));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
