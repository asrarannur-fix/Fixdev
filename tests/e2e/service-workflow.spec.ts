import { test, expect } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL;
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD;

if (!TEST_BASE_URL || !OWNER_EMAIL || !OWNER_PASSWORD) {
  throw new Error('TEST_BASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD are required for E2E tests.');
}

test.describe('Service workflow workspace', () => {
  test.beforeEach(async ({ page, context }) => {
    const login = await page.request.post(`${TEST_BASE_URL}/api/auth/login`, {
      data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    await context.addCookies(await page.request.storageState().then((state) => state.cookies));
    await page.goto(`${TEST_BASE_URL}/tenant/devtes/services`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Servis, buka menu/ }).click();
    await page.getByText('Daftar Servis', { exact: true }).click();
    await expect(page.getByPlaceholder('Cari tiket, nama, perangkat...')).toBeVisible();
  });

  test('opens ready pickup detail with next step and stable URL', async ({ page }) => {
    const ticket = page.locator('tr').filter({ hasText: 'Siap Diambil' }).first();
    await expect(ticket).toHaveCount(1);
    await ticket.click();
    await expect(page.getByTestId('next-step-banner')).toBeVisible();
    await expect(page.getByTestId('next-step-banner')).toContainText('Unit Siap Diambil');
    await expect(page).toHaveURL(/serviceId=/);
  });

  test('opens ticket and closes detail through accessible controls', async ({ page }) => {
    const ticket = page.getByRole('row', { name: /Pilih tiket E2E-DEVTES-READY/ });
    await expect(ticket).toBeVisible();
    await ticket.press('Enter');
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
    await page.getByRole('button', { name: 'Tutup detail tiket servis' }).click();
    await expect(page).not.toHaveURL(/serviceId=/);
  });

  test('detail survives refresh and browser back closes workspace', async ({ page }) => {
    const ticket = page.locator('tr').filter({ hasText: 'Siap Diambil' }).first();
    await expect(ticket).toHaveCount(1);
    await ticket.click();
    await expect(page.getByTestId('service-actions')).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('service-actions')).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(/serviceId=/);
  });

  test('shows handover action for technically completed ticket', async ({ page }) => {
    const ticket = page.locator('tr').filter({ hasText: 'Selesai Teknis' }).first();
    await expect(ticket).toHaveCount(1);
    await ticket.click();
    await expect(page.getByTestId('service-actions')).toContainText('Ambil Unit');
  });

  test('persists search and status filters in URL', async ({ page }) => {
    await page.getByPlaceholder('Cari tiket, nama, perangkat...').fill('E2E-DEVTES-READY');
    await expect(page).toHaveURL(/q=E2E-DEVTES-READY/);
    await page.getByLabel('Filter semua status').selectOption('SIAP_DIAMBIL');
    await expect(page).toHaveURL(/status=SIAP_DIAMBIL/);
    await expect(page.locator('tr').filter({ hasText: 'E2E-DEVTES-READY' })).toHaveCount(1);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByPlaceholder('Cari tiket, nama, perangkat...')).toHaveValue('E2E-DEVTES-READY');
  });

  test('opens a service detail from direct URL', async ({ page }) => {
    await page.goto(`${TEST_BASE_URL}/tenant/devtes/services?serviceId=00000000-0000-4000-8000-000000000105`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('next-step-banner')).toContainText('Unit Siap Diambil');
    await expect(page.getByTestId('service-actions')).toBeVisible();
  });
});
