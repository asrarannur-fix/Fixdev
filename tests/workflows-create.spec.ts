import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "https://fixdev.web.id";
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "asrarannur@gmail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

const pageErrors: string[] = [];

async function loginOwner(page: Page, request: APIRequestContext) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const body = await res.json();
  if (!res.ok() || !body.token) throw new Error(`Owner login failed: ${body.error || res.status()}`);
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ t, u }) => { localStorage.setItem("fixdev_token", t); if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u)); }, { t: body.token, u: body.user });
  await page.reload();
  await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const m = document.getElementById("premium-upgrade-modal"); if (m) m.remove(); });
  return body;
}

async function dismiss(page: Page) {
  const m = page.locator("#premium-upgrade-modal");
  if (await m.count()) {
    await m.getByText("Nanti Saja").click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function openModule(page: Page, moduleLabel: string, subLabel?: string) {
  await dismiss(page);
  await page.locator("aside").getByText(moduleLabel, { exact: false }).first().click({ force: true });
  await page.waitForTimeout(400);
  await dismiss(page);
  if (subLabel) {
    await page.getByText(subLabel, { exact: false }).first().click({ force: true });
    await page.waitForTimeout(500);
    await dismiss(page);
  }
}

test.describe("Real workflow creation per module", () => {
  test.setTimeout(300000);
  test.use({ ignoreHTTPSErrors: true });
  test.beforeEach(async ({ page }) => { page.on("pageerror", (e) => pageErrors.push(e.message)); });

  test("Services: create a service ticket via Penerimaan form", async ({ page, request }) => {
    const user = await loginOwner(page, request);
    await openModule(page, "Servis", "Penerimaan");

    const uniq = "AUTO-" + Date.now().toString().slice(-6);
    await page.fill('input[placeholder="Nama lengkap"]', `Test Cust ${uniq}`);
    await page.fill('input[placeholder="081234567890"]', "081234567890");
    await page.fill('input[placeholder="pelanggan@email.com"]', `cust${uniq}@x.com`);
    await page.fill('input[placeholder="Alamat pelanggan"]', "Jl Test 123");
    await page.fill('input[placeholder="Asus ROG GL503"]', "Asus ROG GL503");
    await page.fill('input[placeholder="ASUS ROG GA401"]', "ASUS");
    await page.fill('textarea[placeholder*="Layar bergaris"]', `Layar mati ${uniq}`);
    await dismiss(page);

    await page.getByRole("button", { name: /Daftarkan Unit & Buat SPK/i }).click();
    await page.waitForTimeout(3000);
    await dismiss(page);

    expect(pageErrors, "no runtime errors during service creation").toEqual([]);

    // navigate to Daftar Servis and confirm the new ticket is listed
    await openModule(page, "Servis", "Daftar Servis");
    await page.getByText("Asus ROG GL503", { exact: false }).first().waitFor({ timeout: 8000 });
    expect(await page.getByText("Asus ROG GL503", { exact: false }).count()).toBeGreaterThan(0);
  });

  test("Inventory: create a product via Tambah Barang form", async ({ page, request }) => {
    const user = await loginOwner(page, request);
    await openModule(page, "Inventory", "Stok");
    await page.getByRole("button", { name: /Tambah Barang/i }).click();
    await page.waitForTimeout(600);
    await dismiss(page);

    const uniq = "BRG-" + Date.now().toString().slice(-6);
    await page.fill('input[placeholder="Contoh: LCD Replacement Asus Rog GL503"]', `Test Barang ${uniq}`);
    await page.fill('input[placeholder="Contoh: SKU-LCD-ASUS"]', uniq);
    const rp = page.locator('input[placeholder="Rp"]');
    if (await rp.count()) { await rp.first().fill("40000"); if (await rp.count() > 1) await rp.nth(1).fill("50000"); }
    await page.fill('input[placeholder="Jumlah"]', "5");
    await dismiss(page);

    await page.getByRole("button", { name: /Simpan Produk/i }).click();
    await page.waitForTimeout(2500);
    await dismiss(page);

    expect(pageErrors, "no runtime errors during product creation").toEqual([]);

    // confirm product listed in Stok
    await openModule(page, "Inventory", "Stok");
    await page.getByText(`Test Barang ${uniq}`, { exact: false }).first().waitFor({ timeout: 8000 });
    expect(await page.getByText(`Test Barang ${uniq}`, { exact: false }).count()).toBeGreaterThan(0);
  });
});
