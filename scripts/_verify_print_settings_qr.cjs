const { chromium } = require("playwright");
require("dotenv").config();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Masuk$/i }).first().click();
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', process.env.TEST_TENANT_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_TENANT_PASSWORD);
  await page.locator('form button:has-text("Masuk")').last().click();
  await page.waitForTimeout(3500);

  await page.goto("http://localhost:3000/?tab=settings&sub=printer-terms", { waitUntil: "networkidle" });
  // Wait until the printer settings form is actually rendered.
  await page.getByText(/Ukuran Kertas|Paper Size|Jenis Kertas|Lebar Kertas/i, { timeout: 15000 }).first().waitFor();
  await page.waitForTimeout(1000);

  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  console.log(`SETTINGS_CHECKBOXES=${count}`);

  // Enable QR + terms if currently off, then trigger save (auto-save likely).
  for (let i = 0; i < count; i++) {
    const box = checkboxes.nth(i);
    const on = await box.isChecked().catch(() => false);
    if (!on) await box.check().catch(() => {});
  }
  await page.waitForTimeout(1500);

  // Now open a service ticket and print preview to verify QR + terms appear.
  await page.goto("http://localhost:3000/?tab=service&sub=list", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByText("Servis", { exact: false }).first().click();
  await page.waitForTimeout(800);
  await page.getByText("Daftar Servis", { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText(/TKT\/2607\/000045|TKT-2026/i).first().click();
  await page.waitForTimeout(800);
  await page.getByText("Cetak SPK", { exact: true }).click();
  await page.waitForTimeout(800);

  const modal = page.locator('[id^="reception-print-"]');
  const qr = await modal.locator('img[alt^="QR tracking"]').count();
  const terms = await modal.getByText(/SYARAT & KETENTUAN SERVICE/i).count();
  console.log(`QR_AFTER_ENABLE=${qr}`);
  console.log(`TERMS_AFTER_ENABLE=${terms}`);
  console.log(`RUNTIME_ERRORS=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));

  await browser.close();
  if (errors.length) process.exit(1);
})();
