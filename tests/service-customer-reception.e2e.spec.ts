import { test, expect, type Page } from "@playwright/test";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";

async function setupMocks(page: Page) {
  const session = {
    access_token: "mock-at",
    refresh_token: "mock-rt",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "u1", email: "asrarannur1@gmail.com" },
  };
  await page.route("**/auth/v1/token?grant_type=password**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }),
  );
  await page.route("**/auth/v1/session**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }),
  );
  await page.route("**/auth/v1/user**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) }),
  );
  await page.route("**/api/auth/profile**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "u1",
        tenant_id: TID,
        email: "asrarannur1@gmail.com",
        name: "Asrar Annur",
        role: "OWNER",
        permissions: ["overview", "services", "services-list", "services-new-ticket"],
        branch_ids: [],
        mfa_enabled: false,
      }),
    }),
  );
  const bootstrap = { tenants: [], users: [], branches: [], warehouses: [], customers: [], products: [], productStock: [], serviceTickets: [], posTransactions: [], posShifts: [], coaAccounts: [], journalEntries: [], auditLogs: [], moduleRecords: [] };
  // Bootstrap dari fixture statis
  console.log(`Bootstrap: ${bootstrap.tenants.length} tenants, ${bootstrap.serviceTickets.length} tickets`);
  await page.route("**/api/bootstrap**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrap) }),
  );
  await page.route("**/api/service-receptions", async (route) => {
    const request = route.request().postDataJSON();
    const customerId = "b9ab665d-ed13-44c9-8912-95aec217c36f";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          customer: {
            id: customerId,
            tenantId: TID,
            name: request.customer.name,
            phone: request.customer.phone,
            email: request.customer.email,
            address: request.customer.address,
          },
          ticket: {
            id: "e9c1bf94-1e8f-4520-9d14-4805fe48d881",
            tenantId: TID,
            branchId: request.branchId,
            ticketNo: "TKT/2607/900001",
            customerId,
            deviceName: request.device.name,
            deviceBrandModel: request.device.brandModel,
            customerComplaints: request.reception.complaint,
            downPayment: request.service.downPayment,
            status: "DITERIMA",
            timeline: [],
            createdAt: new Date().toISOString(),
          },
        },
      }),
    });
  });
  await page.route("**/api/data/sync**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }),
  );
}

async function login(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#root");

  const portal = page.getByRole("button", { name: /Akses Portal ERP/i }).first();
  if (await portal.isVisible().catch(() => false)) await portal.click();

  await page.locator('input[type="email"]').first().fill("asrarannur1@gmail.com");
  await page.locator('input[type="password"]').first().fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: /Masuk Sistem/i }).last().click();
  await expect(page.locator("#main-app-container")).toBeVisible({ timeout: 20_000 });
}

test("front office menambah pelanggan baru saat menerima unit servis", async ({ page }) => {
  await setupMocks(page);
  await login(page);

  const services = page.getByRole("button", { name: /Servis, buka menu/i }).first();
  await expect(services).toBeVisible();
  await services.click();

  const receptionMenu = page.getByRole("button", { name: /^Penerimaan$/i }).first();
  if (await receptionMenu.isVisible().catch(() => false)) await receptionMenu.click();
  await expect(page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i)).toBeVisible();

  const unique = Date.now().toString().slice(-8);
  const customerName = `Pelanggan E2E ${unique}`;
  const customerPhone = `0812${unique}`;

  const customerSearch = page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i);
  await customerSearch.fill(customerName);
  await page.getByRole("button", { name: new RegExp(`Tambah pelanggan baru:.*${unique}`) }).click();

  await page.getByPlaceholder("Nama lengkap").fill(customerName);
  await page.getByPlaceholder("081234567890").fill(customerPhone);
  await page.getByPlaceholder("Asus ROG GL503").fill(`Unit E2E ${unique}`);
  await page.getByPlaceholder(/Layar bergaris horizontal/i).fill("Unit tidak dapat menyala untuk pengujian penerimaan nyata");

  await page.getByRole("button", { name: /Daftarkan Unit & Buat SPK/i }).click();

  await expect(page.getByText("Penerimaan Unit Berhasil!", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(customerName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`62${customerPhone.slice(1)}`, { exact: true }).first()).toBeVisible();
});
