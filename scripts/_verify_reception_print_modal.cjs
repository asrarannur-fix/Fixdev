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

  await page.getByText("Servis", { exact: false }).first().click();
  await page.waitForTimeout(800);
  await page.getByText("Daftar Servis", { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText(/TKT\/2607\/000045|TKT-2026/i).first().click();
  await page.waitForTimeout(800);
  await page.getByText("Cetak SPK", { exact: true }).click();
  await page.waitForTimeout(800);

  const modal = page.locator('[id^="reception-print-"]');
  const modalCount = await modal.count();
  const titleCount = await modal.getByText(/SURAT PERINTAH KERJA|TANDA TERIMA UNIT/i).count();
  const qrCount = await modal.locator('img[alt^="QR tracking"]').count();
  const termsCount = await modal.getByText(/SYARAT & KETENTUAN SERVICE/i).count();
  const printButton = modal.locator('button.bg-indigo-500');
  const printButtonCount = await printButton.count();

  // Do not invoke the operating-system dialog. Verify that click creates the print iframe.
  await page.evaluate(() => { window.print = () => undefined; });
  if (printButtonCount) await printButton.first().click({ force: true });
  await page.waitForTimeout(200);
  const iframeCount = await page.locator('iframe').count();

  console.log(`RECEPTION_MODAL=${modalCount}`);
  console.log(`SPK_TITLE=${titleCount}`);
  console.log(`PRINT_BUTTON=${printButtonCount}`);
  console.log(`QR_SHOWN=${qrCount}`);
  console.log(`TERMS_SHOWN=${termsCount}`);
  console.log(`PRINT_IFRAME_CREATED=${iframeCount > 0}`);
  console.log(`RUNTIME_ERRORS=${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));

  await browser.close();
  if (!modalCount || !titleCount || !printButtonCount || errors.length) process.exit(1);
})();
