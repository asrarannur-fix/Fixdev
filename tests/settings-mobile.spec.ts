import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "devtes1@mail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

async function loginOwner(page: Page, request: APIRequestContext) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const body = await res.json();
  if (!res.ok() || !body.token) throw new Error(`Login failed: ${body.error || res.status()}`);
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("fixdev_token", t);
    if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u));
  }, { t: body.token, u: body.user });
  await page.reload();
  await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
  await page.waitForTimeout(500);
}

test.describe("Settings mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  test.setTimeout(60000);

  test("Bottom nav Punya tombol Pengaturan & konten tidak kosong", async ({ page, request }) => {
    await loginOwner(page, request);
    // Bottom nav harus ada tombol Pengaturan
    const settingsNav = page.locator("nav#bottom-nav button", { hasText: /Setelan|Pengaturan/i }).first();
    await expect(settingsNav).toBeVisible({ timeout: 10000 });
    await settingsNav.click();
    await page.waitForTimeout(1000);

    const pane = page.locator("#settings-pane");
    await expect(pane).toBeVisible();
    // Tab bar sub-tab harus muncul
    const subTabs = pane.locator("button[id^='settings-tab-']");
    expect(await subTabs.count()).toBeGreaterThan(0);
    // Konten panel ada elemen form
    expect(await pane.locator("input, select, textarea, button").count()).toBeGreaterThan(0);
  });

  test("Dropdown topbar Branding -> panel render (tidak kosong)", async ({ page, request }) => {
    await loginOwner(page, request);
    await page.evaluate(() => { const g = document.querySelector("#settings-trigger-btn") as any; if (g) g.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("[role='menuitem']"));
      const b = items.find((el) => /branding/i.test(el.textContent || "")) as any;
      if (b) b.click();
    });
    await page.waitForTimeout(1000);
    const pane = page.locator("#settings-pane");
    expect(await pane.locator("input, select, textarea, button").count()).toBeGreaterThan(0);
  });
});
