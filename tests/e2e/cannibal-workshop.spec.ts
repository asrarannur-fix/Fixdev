import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL;
const EMAIL = process.env.TEST_OWNER_EMAIL;
const PASSWORD = process.env.TEST_OWNER_PASSWORD;
const TENANT = process.env.TEST_TENANT || 'devtes';

test.describe('Cannibal Workshop (inventory cannibalization)', () => {
  test.skip(!BASE || !EMAIL || !PASSWORD, 'TEST_BASE_URL, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD required.');

  test('loads without crashes and shows warehouse list', async ({ page }) => {
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', (resp) => {
      if (resp.status() >= 400) badResponses.push(`${resp.status()} ${resp.url()}`);
    });

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Alamat email').fill(EMAIL!);
    await page.getByLabel('Password').fill(PASSWORD!);
    await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });

    // Navigasi ke deep-link kanibal. Lazy chunk bisa di-abort saat navigasi cepat
    // (terutama mobile) -> retry dengan reload agar modul sempat load penuh.
    const container = page.locator('#cannibal-workshop-container');
    let mounted = false;
    for (let attempt = 0; attempt < 3 && !mounted; attempt++) {
      await page.goto(`${BASE}/?tab=inventory&subTab=cannibal`, {
        waitUntil: 'domcontentloaded',
      });
      try {
        await container.waitFor({ state: 'visible', timeout: 8000 });
        mounted = true;
      } catch {
        // reload sekali lagi untuk memberi waktu lazy import selesai
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
    }
    expect(mounted, 'Cannibal panel gagal mount setelah retry').toBe(true);

    // Warehouse picker dropdown should be populated (at least 1 real warehouse)
    const warehouseOptions = page.locator('select[name="warehouse"] option');
    const count = await warehouseOptions.count();
    if (count > 1) {
      // select[name="warehouse"] picker present
      expect(count).toBeGreaterThan(1);
    } else {
      // Fallback: verify warehouse name rendered in context (Gudang Utama)
      await expect(page.getByText(/Gudang/)).toBeVisible();
    }

    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    expect(badResponses, `HTTP errors: ${badResponses.join('\n')}`).toEqual([]);
  });
});
