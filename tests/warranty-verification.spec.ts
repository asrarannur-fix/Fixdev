import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
test.setTimeout(60000);

const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";

async function setupMocks(page: Page) {
  await page.route("**/auth/v1/token?grant_type=password**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "mock-at", refresh_token: "mock-rt", expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "asrarannur1@gmail.com" } }) }));
  await page.route("**/auth/v1/session**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "mock-at", refresh_token: "mock-rt", expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "asrarannur1@gmail.com" } }) }));
  await page.route("**/auth/v1/user**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u1", email: "asrarannur1@gmail.com" }) }));
  await page.route("**/api/auth/profile**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u1", tenant_id: TID, email: "asrarannur1@gmail.com", name: "Asrar Annur", role: "OWNER", permissions: ["overview","services","services-list","pos","pos-cashier","pos-shifts","inventory","inventory-products","inventory-stock","inventory-transfers","inventory-purchases","accounting","accounting-coa","accounting-journal","hr","hr-payroll","crm","settings"], branch_ids: [], mfa_enabled: false }) }));
  
  const bs: any = { tenants: [], users: [], branches: [], warehouses: [], customers: [], products: [], productStock: [], serviceTickets: [], posTransactions: [], posShifts: [], coaAccounts: [], journalEntries: [], auditLogs: [], moduleRecords: [] };
  // Bootstrap dari fixture statis
  console.log(`Bootstrap: ${bs.tenants.length} tenants, ${bs.serviceTickets.length} tickets`);
  console.log(`[WARRANTY] Injecting test ticket...`);
  bs.serviceTickets.push({
    id: "test-warranty-completed-ticket",
    tenantId: TID,
    ticketNo: "TKT-TEST-9999",
    deviceName: "Laptop Asus ROG G15",
    deviceSerial: "ROG-SN-889977",
    customerId: bs.customers[0]?.id || "cust-1",
    status: "SELESAI",
    warrantyMonths: 6,
    warrantyEndsAt: null,
    estimatedCost: 1500000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [
      {
        status: "DITERIMA",
        note: "Unit diterima untuk servis",
        timestamp: new Date().toISOString(),
        operator: "Admin"
      },
      {
        status: "SELESAI",
        note: "QC passed. Siap diambil.",
        timestamp: new Date().toISOString(),
        operator: "QC Inspector"
      }
    ]
  });
  console.log(`[WARRANTY] After inject: ${bs.serviceTickets.length} tickets`);
  await page.route("**/api/bootstrap**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bs) }));
  await page.route("**/api/data/sync**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }));
}

async function login(page: Page) {
  await page.goto("http://localhost:3000");
  await page.waitForSelector("#root", { timeout: 15000 });
  await page.waitForTimeout(2000);
  if (await page.locator("#main-app-container").isVisible().catch(() => false)) return true;
  
  const btn = page.locator('button:has-text("Akses Portal ERP")').first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1500);
  }
  
  const ei = page.locator('input[type="email"], input[placeholder*="email"]').first();
  const pi = page.locator('input[type="password"]').first();
  if (await ei.isVisible({ timeout: 5000 }).catch(() => false)) {
    await ei.fill("asrarannur1@gmail.com");
    await pi.fill(TEST_USER_PASSWORD);
    await page.locator('button:has-text("Masuk Sistem")').last().click();
    console.log("Login submitted...");
    await page.waitForTimeout(8000);
  }
  
  let v = await page.locator("#main-app-container").isVisible().catch(() => false);
  if (!v) {
    await page.waitForTimeout(5000);
    v = await page.locator("#main-app-container").isVisible().catch(() => false);
  }
  return v;
}

test("Verify completed ticket warranty is active and visible", async ({ page }) => {
  await setupMocks(page);
  const ok = await login(page);
  expect(ok, "Dashboard must load").toBe(true);

  // Open current Services navigation and warranty sub-menu.
  await page.getByRole("button", { name: /Servis, buka menu/i }).first().click();
  await page.waitForTimeout(2000);

  const warrantyBtn = page.getByRole("button", { name: /^Garansi$/i }).first();
  await warrantyBtn.click();
  await page.waitForTimeout(3000);

  // Verify the active warranties section is visible
  const activeWarrantiesTable = page.locator("#tab-warranties-view");
  await expect(activeWarrantiesTable).toBeVisible();

  // Verify that TKT-TEST-9999 shows up in the active warranties grid cards
  const ticketRow = page.locator('div:has-text("TKT-TEST-9999")').first();
  await expect(ticketRow).toBeVisible();
  await expect(ticketRow).toContainText("Laptop Asus ROG G15");

  // Take screenshot
  const screenshotPath = path.join(
    "C:", "Users", "Administrator", ".gemini", "antigravity-ide", "brain",
    "09f47af5-1c05-4f06-9c9a-aa511b59a504", "warranty_page.png"
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n✅ Playwright screenshot captured at: ${screenshotPath}`);
});
