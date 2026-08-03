import { expect, test } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL;
const EMAIL = process.env.TEST_OWNER_EMAIL;
const PASSWORD = process.env.TEST_OWNER_PASSWORD;
const TENANT = process.env.TEST_TENANT || 'devtes';

test.skip(!BASE || !EMAIL || !PASSWORD, 'TEST_BASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD required.');
test.skip(({ isMobile }) => isMobile, 'Desktop smoke only.');

test('service subtabs and safe controls work against dev data', async ({ page }) => {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  const mutations: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Alamat email').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
  mutations.length = 0;
  consoleErrors.length = 0;
  badResponses.length = 0;
  await page.goto(`${BASE}/tenant/${TENANT}/services`, { waitUntil: 'networkidle' });

  const serviceMenu = page.getByRole('button', { name: /Servis, buka menu/ });
  if (await serviceMenu.count()) await serviceMenu.click();

  const visibleTabs = ['Daftar Servis', 'Penerimaan', 'Cost Calculator', 'Field Service', 'Warranty'];
  for (const label of visibleTabs) {
    const tab = page.getByRole('button', { name: label, exact: true });
    if (!(await tab.isVisible().catch(() => false))) continue;
    await tab.click();
    await page.waitForLoadState('networkidle');
    await expect(tab).toBeVisible();
  }

  const rental = page.getByRole('button', { name: 'Rental', exact: true });
  if (await rental.isVisible().catch(() => false)) {
    await rental.click();
    await page.waitForLoadState('networkidle');
  }

  const list = page.getByRole('button', { name: 'Daftar Servis', exact: true });
  if (await list.isVisible().catch(() => false)) await list.click();
  const row = page.locator('tr:visible').filter({ has: page.locator('td:visible') }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();

  const detail = page.getByRole('dialog', { name: 'Tiket Servis' });
  const spk = detail.getByRole('button', { name: 'SPK', exact: true });
  if (await spk.isVisible().catch(() => false)) {
    await spk.click();
    await expect(page.getByRole('dialog', { name: 'Cetak Surat Perintah Kerja' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Cetak Surat Perintah Kerja' }).locator('button').first().click();
  }

  const componentSearch = page.getByRole('button', { name: /komponen mikro/i });
  if (await componentSearch.isVisible().catch(() => false)) {
    await componentSearch.click();
    await expect(page.getByRole('dialog', { name: 'Cari komponen mikro' })).toBeVisible();
    await page.getByRole('button', { name: 'Tutup pencarian komponen' }).click();
  }

  await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup detail tiket servis' }).click();
  expect(mutations, `Unexpected mutating requests: ${mutations.join(', ')}`).toEqual([]);
  expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  expect(badResponses, `HTTP errors: ${badResponses.join('\n')}`).toEqual([]);
});
