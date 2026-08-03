import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect, test, type Page } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL;
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
const tenantId = '00000000-0000-4000-8000-000000000101';
const branchId = '00000000-0000-4000-8000-000000000102';
const warehouseId = '00000000-0000-4000-8000-000000000103';
const run = Boolean(baseURL && email && password && databaseUrl);
const headers = () => ({ Origin: baseURL!, 'X-Tenant-ID': tenantId, 'X-Branch-ID': branchId });

test.skip(!run, 'TEST_BASE_URL, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD, and DATABASE_URL required.');
test.skip(({ browserName }) => browserName !== 'chromium', 'POS mutations run once in Chromium.');
test.describe.configure({ mode: 'serial' });

async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}

async function openShift(page: Page) {
  const response = await page.request.post(`${baseURL}/api/pos/shifts/open`, {
    data: { startingCash: 100_000 },
    headers: headers(),
  });
  const body = await response.text();
  expect(response.status(), body).toBe(201);
  return JSON.parse(body).data.id as string;
}

test.describe('POS API DB workflow', () => {
  let productId: string;
  let shiftId: string;

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      Origin: baseURL!,
      'X-Tenant-ID': tenantId,
      'X-Branch-ID': branchId,
    });
    const login = await page.request.post(`${baseURL}/api/auth/login`, {
      data: { email, password },
      headers: { Origin: baseURL! },
    });
    expect(login.ok()).toBeTruthy();
    await query(`UPDATE pos_shifts SET status='CLOSED', closed_at=NOW() WHERE tenant_id=$1 AND branch_id=$2 AND status='OPEN'`, [tenantId, branchId]);
    productId = randomUUID();
    await query(
      `INSERT INTO products (id, tenant_id, name, sku, category, sell_price, purchase_cost)
       VALUES ($1,$2,'POS E2E Product',$3,'SPAREPART',10000,4000)`,
      [productId, tenantId, `POS-E2E-${productId.slice(0, 8)}`]
    );
    await query(`INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES ($1,$2,2)`, [productId, warehouseId]);
    shiftId = await openShift(page);
  });

  test.afterEach(async () => {
    await query(`DELETE FROM products WHERE id=$1`, [productId]);
  });

  test('holds, recalls, sells, records split payment, refunds, and restores stock', async ({ page }) => {
    const item = { productId, name: 'Ignored client price', quantity: 1, unitPrice: 1, discount: 0 };
    const hold = await page.request.post(`${baseURL}/api/pos/sales/${shiftId}/hold`, {
      data: { customerId: null, items: [item], paymentMethod: 'CASH', amountPaid: 0, depositUsed: 0, discountAmount: 0, notes: 'POS E2E hold' },
      headers: headers(),
    });
    expect(hold.status(), await hold.text()).toBe(201);
    const holdId = (await hold.json()).data.holdId;

    const listed = await page.request.get(`${baseURL}/api/pos/sales/holds`, { headers: headers() });
    expect(listed.status()).toBe(200);
    expect((await listed.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: holdId, tenantId, items: [expect.objectContaining({ productId })] })]));

    const recalled = await page.request.post(`${baseURL}/api/pos/sales/${holdId}/recall`, { data: {}, headers: headers() });
    expect(recalled.status(), await recalled.text()).toBe(200);
    expect((await recalled.json()).data).toMatchObject({ id: holdId, items: [expect.objectContaining({ productId })] });
    const afterRecall = await page.request.get(`${baseURL}/api/pos/sales/holds`, { headers: headers() });
    expect((await afterRecall.json()).data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: holdId })]));

    const sale = await page.request.post(`${baseURL}/api/pos/sales`, {
      data: {
        customerId: null, items: [item], paymentMethod: 'CASH', amountPaid: 5000, depositUsed: 0, discountAmount: 0,
        splitPayments: [{ method: 'CASH', amount: 5000 }, { method: 'QRIS', amount: 6100 }],
        clientRequestId: randomUUID(),
      },
      headers: headers(),
    });
    expect(sale.status(), await sale.text()).toBe(201);
    const transaction = (await sale.json()).data;
    expect(transaction.grandTotal).toBe(11_100);

    const receipt = await page.request.get(`${baseURL}/api/pos/sales/${transaction.id}/receipt`, { headers: headers() });
    expect(receipt.status()).toBe(200);
    expect((await receipt.json()).data).toMatchObject({ grandTotal: 11_100, postedToLedger: true, paymentMethod: 'CASH' });
    const journal = await query<{ debit: string; code: string }>(
      `SELECT jl.debit, ca.code FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id JOIN coa_accounts ca ON ca.id=jl.account_id WHERE je.reference_no=$1 AND jl.debit > 0 ORDER BY ca.code`,
      [transaction.invoiceNo]
    );
    expect(journal.rows).toEqual(expect.arrayContaining([expect.objectContaining({ code: '10100', debit: '5000' }), expect.objectContaining({ code: '10200', debit: '6100' })]));

    const refund = await page.request.post(`${baseURL}/api/pos/sales/${transaction.id}/partial-refund`, { data: { items: [{ itemIndex: 0, quantity: 1, reason: 'POS E2E refund' }] }, headers: headers() });
    expect(refund.status(), await refund.text()).toBe(200);
    expect((await refund.json()).data).toMatchObject({ id: transaction.id, status: 'FULL_REFUND', refundAmount: 11_100 });
    const stock = await query<{ quantity: string }>(`SELECT quantity FROM product_stock WHERE product_id=$1 AND warehouse_id=$2`, [productId, warehouseId]);
    expect(stock.rows[0].quantity).toBe('2');
  });
});
