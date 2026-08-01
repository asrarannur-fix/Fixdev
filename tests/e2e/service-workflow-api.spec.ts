import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL;
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
const tenantId = '00000000-0000-4000-8000-000000000101';
const branchId = '00000000-0000-4000-8000-000000000102';
const mutationHeaders = () => ({ Origin: baseURL! });

const run = Boolean(baseURL && email && password && databaseUrl);
test.skip(!run, 'TEST_BASE_URL, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD, and DATABASE_URL required.');
test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow mutation runs once in Chromium.');
test.describe.configure({ mode: 'serial' });

type TicketState = 'APPROVAL_DITOLAK' | 'MENUGGU_PEMBAYARAN' | 'SELESAI';

async function createTicket(state: TicketState, estimatedCost = 100_000) {
  const id = randomUUID();
  const ticketNo = `E2E-WORKFLOW-${randomUUID().slice(0, 8).toUpperCase()}`;
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO service_tickets
        (id,tenant_id,branch_id,ticket_no,device_name,status,estimated_cost,customer_approval_status,qc_status,created_at)
       VALUES ($1,$2,$3,$4,'E2E Workflow Device',$5,$6,$7,$8,NOW())`,
      [
        id,
        tenantId,
        branchId,
        ticketNo,
        state,
        estimatedCost,
        state === 'APPROVAL_DITOLAK' ? 'REJECTED' : 'PENDING',
        state === 'SELESAI' || state === 'MENUGGU_PEMBAYARAN' ? 'PASSED' : null,
      ]
    );
  } finally {
    await client.end();
  }
  return { id, ticketNo };
}

test.describe('Service workflow API mutations', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ Origin: baseURL! });
    const login = await page.request.post(`${baseURL}/api/auth/login`, {
      data: { email, password },
      headers: mutationHeaders(),
    });
    expect(login.ok()).toBeTruthy();
  });

  test('revises rejected estimate into ESTIMATE_PENDING', async ({ page }) => {
    const ticket = await createTicket('APPROVAL_DITOLAK');
    const response = await page.request.post(`${baseURL}/api/services/${ticket.id}/estimate`, {
      data: { estimatedCost: 225_000 },
      headers: mutationHeaders(),
    });
    const responseBody = await response.text();
    expect(response.status(), responseBody).toBe(200);
    const payload = JSON.parse(responseBody);
    expect(payload.data).toMatchObject({
      id: ticket.id,
      status: 'ESTIMATE_PENDING',
      estimatedCost: 225_000,
      customerApprovalStatus: 'PENDING',
    });
    expect(payload.data.timeline.at(-1)).toMatchObject({
      status: 'ESTIMATE_PENDING',
      note: 'Estimasi biaya dibuat: Rp 225.000.',
    });
  });

  test('hands over MENUGGU_PEMBAYARAN ticket through payment workflow', async ({ page }) => {
    const ticket = await createTicket('MENUGGU_PEMBAYARAN');
    const response = await page.request.post(`${baseURL}/api/services/${ticket.id}/handover`, {
      data: {
        paymentMethod: 'CASH',
        checklist: {
          accessoriesReturned: true,
          customerChecked: true,
          invoiceReady: true,
          warrantyReady: true,
        },
        idempotencyKey: `handover-${ticket.id}`,
      },
      headers: mutationHeaders(),
    });
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload.data.ticket).toMatchObject({ id: ticket.id, status: 'DIAMBIL' });
  });

  test('creates, lists, and settles a TEMPO receivable', async ({ page }) => {
    const ticket = await createTicket('SELESAI', 150_000);
    const handover = await page.request.post(`${baseURL}/api/services/${ticket.id}/handover`, {
      data: {
        paymentMethod: 'TEMPO',
        tempoDays: 30,
        checklist: {
          accessoriesReturned: true,
          customerChecked: true,
          invoiceReady: true,
          warrantyReady: true,
        },
        idempotencyKey: `tempo-${ticket.id}`,
      },
      headers: mutationHeaders(),
    });
    expect(handover.status()).toBe(200);

    const listed = await page.request.get(`${baseURL}/api/services/${ticket.id}/receivables`);
    expect(listed.status()).toBe(200);
    const rows = (await listed.json()).data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'RECEIVABLE', amount: 150_000, paidAmount: 0, remaining: 150_000 });

    const settlement = await page.request.post(
      `${baseURL}/api/services/receivables/${rows[0].id}/settlements`,
      {
        data: {
          amount: 150_000,
          method: 'BANK_TRANSFER',
          referenceNo: `SETTLE-${ticket.id}`,
          idempotencyKey: `settle-${ticket.id}`,
        },
        headers: mutationHeaders(),
      }
    );
    const settlementBody = await settlement.text();
    expect(settlement.status(), settlementBody).toBe(200);
    expect(JSON.parse(settlementBody).data.receivable).toMatchObject({
      id: rows[0].id,
      status: 'PAID',
      paid_amount: '150000',
    });

    const after = await page.request.get(`${baseURL}/api/services/${ticket.id}/receivables`);
    expect(after.status()).toBe(200);
    expect((await after.json()).data[0]).toMatchObject({ status: 'PAID', remaining: 0 });
  });
});
