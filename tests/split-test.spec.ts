import { test } from '@playwright/test';
import { loginTenant, TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD } from "./tenant-login-helper";

test('screenshot split layout', async ({ page }) => {
  const ok = await loginTenant(page);
  if (!ok) {
    await page.screenshot({ path: '/tmp/services-split-view-failed.png', fullPage: false });
    test.skip(true, 'Owner dashboard did not load');
    return;
  }

  const servicesBtn = page.getByRole("button", { name: /Servis, buka menu|Servis, terbuka/i }).first();
  await servicesBtn.click();
  await page.waitForTimeout(2000);

  const listTab = page.locator('text="Daftar Servis"').first();
  if (await listTab.isVisible({ timeout: 3000 }).catch(() => false)) await listTab.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/services-split-view.png', fullPage: false });
  console.log('Screenshot saved at /tmp/services-split-view.png');
});
