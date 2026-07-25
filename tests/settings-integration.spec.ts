import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "devtes1@mail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

async function loginOwner(page: Page, request: APIRequestContext) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const body = await res.json();
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("fixdev_token", t);
    if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u));
  }, { t: body.token, u: body.user });
  await page.reload();
  await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
  await page.waitForTimeout(500);
}

test.describe("Settings Integrasi tidak error saat buka", () => {
  test.use({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  test.setTimeout(60000);

  test("Buka grup Integrasi & Notifikasi -> tidak ada error toast 422", async ({ page, request }) => {
    await loginOwner(page, request);
    // Buka Setelan
    const setelan = page.locator("nav#bottom-nav button", { hasText: /Setelan|Pengaturan/i }).first();
    await setelan.click();
    await page.waitForTimeout(1000);
    // Klik grup Integrasi & Notifikasi
    await page.getByText("Integrasi & Notifikasi", { exact: false }).first().click();
    await page.waitForTimeout(2500);

    // Tidak boleh ada toast error tentang domain/payload
    const errorToasts = page.locator("text=/Domain atau payload pengaturan tidak valid/i");
    expect(await errorToasts.count()).toBe(0);
  });
});
