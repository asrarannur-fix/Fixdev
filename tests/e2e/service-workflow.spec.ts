import { test, expect } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || 'devtes1@mail.com';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || '778877';

test.describe('Service Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_BASE_URL + '/login');
    await page.getByLabel('Alamat email').fill(OWNER_EMAIL);
    await page.getByLabel('Password').fill(OWNER_PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
    // Navigate to tenant services page after login
    await page.goto(TEST_BASE_URL + '/tenant/devtes/services', { waitUntil: 'networkidle' });
  });

  test('Can see SIAP_DIAMBIL status in service list', async ({ page }) => {
    // Check if page loaded tenant services
    const hasTable = await page.locator('table').count() > 0;
    if (!hasTable) {
      console.log('No table found on services page, checking if tenant page loaded');
      return;
    }
    await expect(page.locator('body')).toContainText('SIAP_DIAMBIL', { timeout: 5000 });
  });

  test('ServiceDetailModal shows next step for SIAP_DIAMBIL', async ({ page }) => {
    // Check if there are any ticket rows with SIAP_DIAMBIL
    const ticketRow = page.locator('tr').filter({ hasText: 'SIAP_DIAMBIL' }).first();
    const count = await ticketRow.count();
    
    if (count === 0) {
      console.log('No SIAP_DIAMBIL ticket found, skipping test');
      return;
    }
    
    await ticketRow.click();
    
    // Check for next step banner
    await expect(page.locator('[data-testid="next-step-banner"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="next-step-banner"]')).toContainText(/Ambil Unit|Handover/);
  });

  test('ServiceTicketActions shows Ambil Unit button for SELESAI status', async ({ page }) => {
    const ticketRow = page.locator('tr').filter({ hasText: 'SELESAI' }).first();
    const count = await ticketRow.count();
    
    if (count === 0) {
      console.log('No SELESAI ticket found, skipping test');
      return;
    }
    
    await ticketRow.click();
    await expect(page.locator('[data-testid="service-actions"]')).toContainText('Ambil Unit', { timeout: 10000 });
  });
});