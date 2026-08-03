import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL;
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;
const ticketNo = 'E2E-DEVTES-READY';
const scopedHeaders = {
  'X-Tenant-ID': '00000000-0000-4000-8000-000000000101',
  'X-Branch-ID': '00000000-0000-4000-8000-000000000102',
};

const run = Boolean(baseURL && email && password);
test.skip(!run, 'TEST_BASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD required.');

test.describe('Service visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ Origin: baseURL!, ...scopedHeaders });
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Alamat email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme} list and detail remain visually stable`, async ({ page, isMobile }) => {
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('theme', selectedTheme);
        document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
      }, theme);
      await page.goto(`${baseURL}/?tab=services&subTab=list&q=${ticketNo}`, { waitUntil: 'networkidle' });
      const search = page.getByPlaceholder('Cari tiket, pelanggan, atau perangkat');
      await expect(search).toBeVisible();
      await search.fill(ticketNo);
      const ticketRow = isMobile
        ? page.locator('article:visible').filter({ hasText: ticketNo }).first()
        : page.locator('tr:visible, [role="button"]:visible').filter({ hasText: ticketNo }).first();
      await expect(ticketRow).toBeVisible();
      await expect(page.locator('main')).toHaveScreenshot(`service-list-${theme}-${isMobile ? 'mobile' : 'desktop'}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      });

      await ticketRow.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveScreenshot(`service-detail-summary-${theme}-${isMobile ? 'mobile' : 'desktop'}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      });

      await page.getByRole('tab', { name: 'Pekerjaan' }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expect(dialog).toHaveScreenshot(`service-detail-work-${theme}-${isMobile ? 'mobile' : 'desktop'}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
