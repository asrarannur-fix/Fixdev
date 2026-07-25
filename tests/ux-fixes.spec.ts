import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const SA_EMAIL = process.env.TEST_SUPERADMIN_EMAIL || "devtes@mail.com";
const SA_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD || "778877";
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "devtes1@mail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

async function loginAs(page: Page, request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password } });
  const body = await res.json();
  if (!res.ok() || !body.token) throw new Error(`Login failed: ${body.error || res.status()}`);
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("fixdev_token", t);
    if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u));
  }, { t: body.token, u: body.user });
  await page.reload();
  return body;
}

test.describe("Perbaikan UX: URL & Impersonate mode", () => {
  test.setTimeout(120000);
  test.use({ ignoreHTTPSErrors: true });

  test("Setelah login owner, URL bukan /login (reset ke /)", async ({ page, request }) => {
    await loginAs(page, request, OWNER_EMAIL, OWNER_PASSWORD);
    await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toContain("/login");
    expect(url.endsWith("/") || url.endsWith("3001/") || url.includes("127.0.0.1:3001")).toBeTruthy();
  });

  test("Superadmin impersonate tenant -> mode akses penuh (bisa edit)", async ({ page, request }) => {
    await loginAs(page, request, SA_EMAIL, SA_PASSWORD);
    await page.waitForTimeout(800);
    // Masuk ke tab Tenants via sidebar
    await page.getByText("Kelola Tenant", { exact: false }).first().click();
    await page.waitForTimeout(800);
    // Klik tenant Dev Tester (row) -> buka detail
    await page.waitForTimeout(1500);
    const tenantRow = page.locator("div, tr, button").filter({ hasText: "Dev Tester" }).first();
    await tenantRow.scrollIntoViewIfNeeded();
    await tenantRow.click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    // Tombol impersonate di detail tenant
    const impBtn = page.getByRole("button", { name: /Impersonate/i }).first();
    await expect(impBtn).toBeVisible({ timeout: 10000 });
    await impBtn.click();
    await page.waitForTimeout(800);
    // Isi alasan di modal, lalu Mulai sesi
    const reasonInput = page.locator("input[required]").first();
    await reasonInput.fill("test impersonate full mode");
    await page.getByRole("button", { name: /Mulai sesi/i }).click();
    await page.waitForTimeout(1500);
    // Banner impersonate muncul dan TIDAK read-only
    const banner = page.locator("#impersonation-banner-top");
    await expect(banner).toBeVisible({ timeout: 10000 });
    const bannerText = await banner.innerText();
    expect(bannerText).not.toContain("hanya-baca");
    expect(bannerText).not.toContain("READ_ONLY");
  });
});
