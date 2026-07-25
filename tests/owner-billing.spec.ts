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

test.describe("Billing penyewa di mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  test.setTimeout(60000);

  test("Owner buka Langganan (billing) -> render bersih, tidak console error fatal", async ({ page, request }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

    await loginOwner(page, request);
    const setelan = page.locator("nav#bottom-nav button", { hasText: /Setelan|Pengaturan/i }).first();
    await setelan.click();
    await page.waitForTimeout(1000);
    await page.getByText("Keuangan & Bisnis", { exact: false }).first().click();
    await page.waitForTimeout(800);
    await page.getByText("SaaS Subscription Billing", { exact: false }).first().click();
    await page.waitForTimeout(2000);

    // Konten billing muncul
    const detail = await page.locator("text=/PRO|AKTIF|Basic|Upgrade|Status|Rp |Invoice|Tagihan/i").count();
    expect(detail).toBeGreaterThan(0);
    // Tombol upgrade ada
    expect(await page.getByRole("button", { name: /Upgrade|Berlangganan|Langganan Sekarang/i }).count()).toBeGreaterThan(0);

    // Embel-embel superadmin TIDAK boleh tampil untuk owner
    expect(await page.locator("#billing-recurring").count()).toBe(0); // Auto-renew/cron admin
    expect(await page.locator("#saas-plan-editor").count()).toBe(0); // Plan editor
    expect(await page.locator("#saas-gateway-setup").count()).toBe(0); // Gateway config
    expect(await page.locator("#billing-config").count()).toBe(0); // Manual payment config
    expect(await page.locator("#billing-review").count()).toBe(0); // Review pembayaran
    expect(await page.locator("#sa-billing-reconciliation").count()).toBe(0); // Settlement
    expect(await page.locator("text=Billing Control Plane").count()).toBe(0);
    // Bagian owner HARUS tampil
    expect(await page.locator("#billing-plans").count()).toBe(1); // Pilihan paket
    expect(await page.locator("#billing-invoices").count()).toBe(1); // Tagihan saya

    // Tidak ada console error fatal (abaikan warning src="" kosmetik)
    const fatal = errors.filter((e) => !/empty string|src\s*src|passed to the %s attribute/i.test(e));
    console.log("FATAL ERRORS:", JSON.stringify(fatal));
    expect(fatal.length).toBe(0);
  });
});
