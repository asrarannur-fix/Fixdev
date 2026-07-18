const { chromium } = require("playwright");
require("dotenv").config();

const BASE = "http://localhost:3000";

(async () => {
  const email = process.env.TEST_TENANT_EMAIL;
  const password = process.env.TEST_TENANT_PASSWORD;
  if (!email || !password) throw new Error("Akun audit tidak tersedia.");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Masuk$/i }).first().click();
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('form button:has-text("Masuk")').last().click();
  await page.waitForTimeout(5000);

  const loggedIn = await page.getByText(/Dashboard|Ringkasan|Servis/i).first().isVisible().catch(() => false);
  if (!loggedIn) throw new Error("Login audit gagal.");

  await page.goto(`${BASE}/?tab=service&sub=list`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const printTriggers = await page.getByText(/Cetak SPK|Cetak Nota|Surat Perintah Kerja/i).count();
  console.log(`LOGIN=PASS`);
  console.log(`SERVICE_PRINT_ENTRY_COUNT=${printTriggers}`);
  console.log(`RUNTIME_ERRORS=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));

  await browser.close();
  if (errors.length) process.exit(2);
})().catch((error) => {
  console.error(`VERIFY_FAIL=${error.message}`);
  process.exit(1);
});
