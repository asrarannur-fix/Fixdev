import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "devtes1@mail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

async function loginOwner(page: Page, request: APIRequestContext) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const body = await res.json();
  if (!res.ok() || !body.token) throw new Error(`Owner login failed: ${body.error || res.status()}`);
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("fixdev_token", t);
    if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u));
  }, { t: body.token, u: body.user });
  await page.reload();
  await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
  await page.waitForTimeout(500);
  return body;
}

async function dismissPremium(page: Page) {
  const m = page.locator("#premium-upgrade-modal");
  if (await m.count()) {
    await m.getByText("Nanti Saja").click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

test.describe("Penyewa -> Pengaturan (alur nyata)", () => {
  test.setTimeout(120000);
  test.use({ ignoreHTTPSErrors: true });

  test("Owner dapat membuka Pengaturan dan menyimpan perubahan branding", async ({ page, request }) => {
    await loginOwner(page, request);
    await dismissPremium(page);

    // Buka menu Pengaturan via tombol gear di topbar
    await page.locator("#settings-trigger-btn").click();
    await page.waitForTimeout(600);

    // Klik item "Branding" di dropdown (label terpotong jadi kata pertama)
    await page.getByRole("menuitem", { name: /Branding/i }).first().click();
    await page.waitForTimeout(800);

    // Ubah primary color via input hex (UI branding sekarang hex text input)
    const colorInput = page.locator("input[value^='#']").first();
    await expect(colorInput).toBeVisible({ timeout: 10000 });
    await colorInput.fill("#0a7d3c");
    await page.waitForTimeout(300);

    // Klik tombol Simpan
    const saveBtn = page.getByRole("button", { name: /Simpan/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Verifikasi di DB via API bootstrap
    const boot = await request.get(`${BASE_URL}/api/bootstrap?tenantId=${JSON.parse(await page.evaluate(() => localStorage.getItem("saas_curr_user") || "{}")).tenantId}`, {
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("fixdev_token"))}` },
    });
    const bootBody = await boot.json();
    const tenant = bootBody.tenants?.[0];
    expect(tenant?.branding?.primaryColor?.toLowerCase()).toBe("#0a7d3c");
  });
});
