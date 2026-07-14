import { test } from '@playwright/test';

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
test('screenshot split layout', async ({ page }) => {
  // Navigate to services page
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  // Check if login form visible
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('asrarannur1@gmail.com');
    await page.locator('input[type="password"]').first().fill(TEST_USER_PASSWORD);
    await page.locator('button:has-text("Masuk Sistem")').last().click();
    await page.waitForTimeout(8000);
  }

  // Navigate to services
  const servicesBtn = page.getByRole("button", { name: /Servis, buka menu/i }).first();
  await servicesBtn.click();
  await page.waitForTimeout(2000);

  // Click Daftar Servis
  const listTab = page.locator('text="Daftar Servis"').first();
  await listTab.click();
  await page.waitForTimeout(2000);

  // Take screenshot of initial state (should show inbox + first detail inline)
  await page.screenshot({ path: '/tmp/services-split-view.png', fullPage: false });

  // Check: is there a fixed overlay (portal)?
  const overlays = await page.locator('.fixed.inset-0').count();
  console.log('Fixed overlays:', overlays);

  // Check: is detail heading visible without portal?
  const detailHeading = page.getByRole("heading", { name: "Manajemen Perbaikan & Servis" });
  const isDetailVisible = await detailHeading.isVisible().catch(() => false);
  console.log('Detail heading visible:', isDetailVisible);

  console.log('Screenshot saved at /tmp/services-split-view.png');
});
