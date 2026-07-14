import { test, expect, type Page } from "@playwright/test";

const TENANT_ID = "bd7725f3-02cf-4944-bdc9-80ba642a2c55";
const SUPER_ADMIN = {
  id: "user-super-admin",
  name: "Super Admin Test",
  email: "superadmin@example.test",
  role: "SUPER_ADMIN",
  permissions: [],
  branchIds: [],
  loginHistory: [],
  activeSessions: [],
  mfaEnabled: true,
};

async function seedSuperAdmin(page: Page) {
  await page.addInitScript(({ user, tenantId }) => {
    localStorage.setItem("saas_is_authenticated", "true");
    localStorage.setItem("saas_curr_user", JSON.stringify(user));
    localStorage.setItem("saas_curr_tenant_id", tenantId);
    localStorage.setItem("saas_active_tab", "saas-billing");
  }, { user: SUPER_ADMIN, tenantId: TENANT_ID });

  await page.route("**/api/bootstrap**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      tenants: [{ id: TENANT_ID, name: "Tenant Fixture", subdomain: "fixture", status: "ACTIVE", tier: "PRO", trial_ends_at: "2027-01-01", settings: {}, branding: {}, created_at: "2026-01-01" }],
      users: [SUPER_ADMIN], branches: [], warehouses: [], customers: [], products: [], productStock: [], serviceTickets: [], posTransactions: [], posShifts: [], coaAccounts: [], journalEntries: [], auditLogs: [], moduleRecords: [],
    }),
  }));
  await page.route("**/api/billing/plans", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify([{ tier: "PRO", name: "Professional", priceMonthly: 250000, priceYearly: 2400000, features: ["ERP"], limits: { users: 15, branches: 5, storageMb: 2048, features: ["POS"] } }]),
  }));
  await page.route("**/api/billing/subscription**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ tenantId: TENANT_ID, invoices: [{ id: "inv-manual-1", tenantId: TENANT_ID, date: "2026-07-13", dueDate: "2026-07-16", amount: 250000, tier: "PRO", status: "UNPAID", billingCycle: "monthly", autoRenew: true }] }),
  }));
  await page.route("**/api/billing/manual-payments**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ requests: [] }) }));
  await page.route("**/api/billing/gateway-config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ isEnabled: false, isProduction: false }) }));
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`manual payment form renders at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedSuperAdmin(page);
    await page.goto("http://localhost:3000");
    await expect(page.locator("#saas-invoice-history")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Bayar Manual" }).click();
    await expect(page.getByRole("heading", { name: "Pembayaran Manual" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transfer Bank" })).toBeVisible();
    await expect(page.getByRole("button", { name: "QRIS Manual" })).toBeVisible();
    await expect(page.getByText("JPG/PNG/PDF, maks. 5 MB")).toBeVisible();
    await expect(page.getByText("Konfirmasi Pembayaran QRIS Berhasil")).toHaveCount(0);
  });
}
