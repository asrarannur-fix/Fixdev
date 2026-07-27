import { test, expect } from '@playwright/test';

const SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL || 'devtes@mail.com';
const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD || '778877';

test.describe('Service Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3001');
    await page.getByLabel('Email').fill(SUPERADMIN_EMAIL);
    await page.getByLabel('Password').fill(SUPERADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/tenant\//);
  });

  test('Can see SIAP_DIAMBIL status in service list', async ({ page }) => {
    await page.goto('/tenant/services');
    await expect(page.locator('body')).toContainText('SIAP_DIAMBIL', { timeout: 5000 });
  });

  test('ServiceDetailModal shows next step for SIAP_DIAMBIL', async ({ page }) => {
    await page.goto('/tenant/services');
    const ticketRow = page.locator('[data-testid="service-ticket"]').first();
    await ticketRow.click();
    
    // Check for next step banner
    await expect(page.locator('[data-testid="next-step-banner"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="next-step-banner"]')).toContainText(/Ambil Unit|Handover/);
  });

  test('ServiceTicketActions shows Ambil Unit button for SELESAI status', async ({ page }) => {
    await page.goto('/tenant/services');
    const ticketRow = page.locator('[data-testid="service-ticket"]').filter({ hasText: 'SELESAI' }).first();
    if (await ticketRow.count() > 0) {
      await ticketRow.click();
      await expect(page.locator('[data-testid="service-actions"]')).toContainText('Ambil Unit', { timeout: 5000 });
    }
  });
});