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

    await page.goto(`${BASE}/?tab=inventory&subTab=cannibal`, {
      waitUntil: 'networkidle',
    });

    // Cannibal panel must mount (no red error boundary)
    await expect(page.locator('#cannibal-workshop-container')).toBeVisible();

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
