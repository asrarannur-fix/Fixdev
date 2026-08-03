import { test, expect } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL;
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD;
const TENANT = 'devtes';
const scopedHeaders = {
  'X-Tenant-ID': '00000000-0000-4000-8000-000000000101',
  'X-Branch-ID': '00000000-0000-4000-8000-000000000102',
};

test.skip(!TEST_BASE_URL || !OWNER_EMAIL || !OWNER_PASSWORD, 'TEST_BASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD required.');

test.describe('Service workflow workspace', () => {
  let ticket: { id: string; ticketNo: string; publicTrackingToken?: string };

  const ticketControl = (page: import('@playwright/test').Page) =>
    page.locator('tr:visible, [role="button"]:visible').filter({ hasText: ticket.ticketNo }).first();

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      Origin: TEST_BASE_URL!,
      ...scopedHeaders,
    });
    await page.goto(`${TEST_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Alamat email').fill(OWNER_EMAIL!);
    await page.getByLabel('Password').fill(OWNER_PASSWORD!);
    await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });

    const tickets = await page.request.get(`${TEST_BASE_URL}/api/services?limit=1&offset=0&q=E2E-DEVTES-READY`, { headers: scopedHeaders });
    const ticketBody = await tickets.text();
    expect(tickets.ok(), `status=${tickets.status()} body=${ticketBody}`).toBeTruthy();
    const payload = JSON.parse(ticketBody);
    ticket = payload.data?.find((item: typeof ticket) => item.publicTrackingToken) || payload.data?.[0];
    expect(ticket?.id).toBeTruthy();
    expect(ticket?.ticketNo).toBeTruthy();

    await page.goto(`${TEST_BASE_URL}/?tab=services&subTab=list`, { waitUntil: 'networkidle' });
    const search = page.getByPlaceholder('Cari tiket, pelanggan, atau perangkat');
    await expect(search).toBeVisible();
    await search.fill(ticket.ticketNo);
    await expect(ticketControl(page)).toBeVisible();
  });

  test('opens real ticket detail and stable URL', async ({ page }) => {
    const row = ticketControl(page);
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`serviceId=${ticket.id}`));
  });

  test('opens and closes detail through accessible controls', async ({ page }) => {
    await ticketControl(page).press('Enter');
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
    await page.getByRole('button', { name: 'Tutup detail tiket servis' }).click();
    await expect(page).not.toHaveURL(/serviceId=/);
  });

  test('detail survives refresh and browser back closes workspace', async ({ page }) => {
    await ticketControl(page).click();
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(/serviceId=/);
  });

  test('persists search in URL and after refresh', async ({ page }) => {
    const search = page.getByPlaceholder('Cari tiket, pelanggan, atau perangkat');
    await search.fill(ticket.ticketNo);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(ticket.ticketNo)}`));
    await expect(ticketControl(page)).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    expect(page.url()).toContain(`q=${encodeURIComponent(ticket.ticketNo)}`);
    await expect(search).toHaveValue(ticket.ticketNo);
  });

  test('opens service detail from direct URL', async ({ page }) => {
    await page.goto(`${TEST_BASE_URL}/tenant/${TENANT}/services?serviceId=${ticket.id}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Tutup detail tiket servis' })).toBeVisible();
  });

  test('keeps list filters and sort aligned with request URL', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/services?')) requests.push(request.url());
    });
    await page.getByRole('combobox', { name: 'Filter status' }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: 'Urutkan tiket servis' }).selectOption('oldest');
    await page.getByPlaceholder('Cari tiket, pelanggan, atau perangkat').fill(ticket.ticketNo);
    await expect.poll(() => new URL(requests.at(-1) || TEST_BASE_URL).searchParams.get('q')).toBe(ticket.ticketNo);
    const requestUrl = new URL(requests.at(-1)!);
    expect(requestUrl.searchParams.get('sort')).toBe('oldest');
    expect(requestUrl.searchParams.get('status')).toBeTruthy();
    const pageUrl = new URL(page.url());
    expect(pageUrl.searchParams.get('q')).toBe(ticket.ticketNo);
    expect(pageUrl.searchParams.get('status')).toBe(requestUrl.searchParams.get('status'));
    expect(pageUrl.searchParams.get('sort')).toBe('oldest');
  });

  test('CSV export sends current read-only filters without downloading unbounded data', async ({ page }) => {
    await page.getByPlaceholder('Cari tiket, pelanggan, atau perangkat').fill(ticket.ticketNo);
    const exportRequest = page.waitForRequest((request) => request.url().includes('/api/services/export.csv'));
    await page.getByRole('button', { name: /CSV/ }).click();
    const request = await exportRequest;
    const url = new URL(request.url());
    expect(url.searchParams.get('q')).toBe(ticket.ticketNo);
    expect(url.searchParams.get('limit')).toBeNull();
    expect(request.method()).toBe('GET');
  });

  test('does not overflow viewport on desktop and mobile', async ({ page }) => {
    const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(width).toBeLessThanOrEqual(1);
  });

  test('public tracking rejects malformed token without mutation', async ({ page }) => {
    const response = await page.request.get(`${TEST_BASE_URL}/api/service-tracking/token/not-a-token`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'Service ticket not found' });
  });

  test('public portal exposes accessible manual lookup controls', async ({ page }) => {
    await page.goto(`${TEST_BASE_URL}/?ticket=not-a-real-ticket`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('textbox', { name: 'Nomor tiket' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '4 digit terakhir nomor HP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lacak Unit' })).toBeVisible();
    await page.getByRole('button', { name: 'Lacak Unit' }).click();
    await expect(page.getByText(/tidak ditemukan/i).first()).toBeVisible();
  });

  test('public tracking token reads ticket without mutation', async ({ page }) => {
    test.skip(!ticket.publicTrackingToken, 'Selected ticket has no public tracking token.');
    const before = await page.request.get(`${TEST_BASE_URL}/api/services/${ticket.id}`, { headers: scopedHeaders });
    expect(before.ok()).toBeTruthy();
    const tracking = await page.request.get(`${TEST_BASE_URL}/api/service-tracking/token/${ticket.publicTrackingToken}`, {
      headers: { Host: 'devtes.fixdev.web.id' },
    });
    expect(tracking.ok()).toBeTruthy();
    expect(await tracking.json()).toMatchObject({ ticketNo: ticket.ticketNo });
    const after = await page.request.get(`${TEST_BASE_URL}/api/services/${ticket.id}`, { headers: scopedHeaders });
    expect(await after.json()).toEqual(await before.json());
  });
});
