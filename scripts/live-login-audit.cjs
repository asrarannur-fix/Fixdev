const { chromium } = require("playwright");

const EMAIL = process.env.TEST_USER_EMAIL || "asrarannur1@gmail.com";
const PASS = process.env.TEST_USER_PASSWORD || "";
const BASE = "https://fixdev.web.id";
const OUT = "/home/ubuntu/barufix/screenshots-bukti";

const fs = require("fs");
fs.mkdirSync(OUT, { recursive: true });

if (!PASS) {
  console.error("NO_PASSWORD: set TEST_USER_PASSWORD env");
  process.exit(2);
}

async function shot(page, name) {
  const p = `${OUT}/${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  console.log("SHOT", p);
}

async function login(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  // open portal modal
  const portal = page.getByRole("button", { name: /Akses Portal ERP/i }).first();
  if (await portal.isVisible().catch(() => false)) await portal.click();
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.getByRole("button", { name: /Masuk Sistem/i }).last().click();
  // wait for app container OR error
  try {
    await page.waitForSelector("#main-app-container", { timeout: 25000 });
    console.log("LOGIN_OK");
  } catch (e) {
    const url = page.url();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    console.log("LOGIN_FAIL url=" + url);
    console.log("BODY_PREVIEW: " + bodyText.slice(0, 400));
    await shot(page, "login-failed");
    throw e;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  try {
    await login(page);
    await page.waitForTimeout(2500);
    await shot(page, "01-dashboard");

    // navigate modules via sidebar text
    const modules = ["Servis", "POS", "Stok", "Accounting", "HR", "CRM"];
    for (const m of modules) {
      const btn = page.getByRole("button", { name: new RegExp(m, "i") }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1500);
        await shot(page, "mod-" + m);
      }
    }

    console.log("CONSOLE_ERRORS", JSON.stringify(errors.slice(0, 20)));
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error("FATAL", e.message);
    console.log("CONSOLE_ERRORS", JSON.stringify(errors.slice(0, 20)));
    await browser.close();
    process.exit(1);
  }
})();
