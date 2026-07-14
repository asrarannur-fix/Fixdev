import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
test.setTimeout(120000);
const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";
const ART = "C:/Users/Administrator/.gemini/antigravity-ide/brain/09f47af5-1c05-4f06-9c9a-aa511b59a504";

async function setupMocks(page: Page) {
  await page.route("**/auth/v1/token?grant_type=password**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "mock-at", refresh_token: "mock-rt", expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "asrarannur1@gmail.com" } }) }));
  await page.route("**/auth/v1/session**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "mock-at", refresh_token: "mock-rt", expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "asrarannur1@gmail.com" } }) }));
  await page.route("**/auth/v1/user**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u1", email: "asrarannur1@gmail.com" }) }));
  await page.route("**/api/auth/profile**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u1", tenant_id: TID, email: "asrarannur1@gmail.com", name: "Asrar Annur", role: "OWNER", permissions: ["overview","services","services-list","pos","pos-cashier","pos-shifts","pos-history","action-pos-invoice-view","inventory","inventory-products","inventory-stock","inventory-transfers","inventory-purchases","accounting","accounting-coa","accounting-journal","hr","hr-payroll","crm","settings"], branch_ids: [], mfa_enabled: false }) }));
  const bs: any = { tenants: [], users: [], branches: [], warehouses: [], customers: [], products: [], productStock: [], serviceTickets: [], posTransactions: [], posShifts: [], coaAccounts: [], journalEntries: [], auditLogs: [], moduleRecords: [] };
  // Seed bootstrap data from static fixture
  console.log(`Bootstrap: ${bs.tenants.length} tenants, ${bs.serviceTickets.length} tickets`);
  await page.route("**/api/bootstrap**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bs) }));
  await page.route("**/api/data/sync**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }));
}

async function login(page: Page) {
  await page.goto("http://localhost:3000");
  await page.waitForSelector("#root", { timeout: 15000 });
  await page.waitForTimeout(2000);
  if (await page.locator("#main-app-container").isVisible().catch(() => false)) return true;
  const btn = page.locator('button:has-text("Akses Portal ERP")').first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(1500); }
  const ei = page.locator('input[type="email"], input[placeholder*="email"]').first();
  const pi = page.locator('input[type="password"]').first();
  if (await ei.isVisible({ timeout: 5000 }).catch(() => false)) {
    await ei.fill("asrarannur1@gmail.com");
    await pi.fill(TEST_USER_PASSWORD);
    await page.locator('button:has-text("Masuk Sistem")').last().click();
    await page.waitForTimeout(8000);
  }
  let v = await page.locator("#main-app-container").isVisible().catch(() => false);
  if (!v) { await page.waitForTimeout(5000); v = await page.locator("#main-app-container").isVisible().catch(() => false); }
  return v;
}

test("Human POS Workflow - Full Cashier Simulation", async ({ page }) => {
  await setupMocks(page);
  const ok = await login(page);
  expect(ok, "Dashboard must load").toBe(true);

  // 1. Navigate to POS
  await page.locator('button:has-text("POS")').first().click();
  await page.waitForTimeout(3000);

  // 2. Open shift if not already open (same pattern as full-audit)
  const shiftBanner = page.locator('text=POSShift kasir Anda sedang aktif');
  const isShiftOpen = await shiftBanner.isVisible().catch(() => false);
  if (!isShiftOpen) {
    const shiftTab = page.locator('button:has-text("Shift")').first();
    if (await shiftTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shiftTab.click();
      await page.waitForTimeout(1500);
      const cashIn = page.locator('input[type="number"]').first();
      if (await cashIn.isVisible().catch(() => false)) {
        await cashIn.fill("500000");
        await page.locator('button:has-text("Buka Shift")').first().click();
        await page.waitForTimeout(2000);
        console.log("  Shift opened");
      }
    }
  }

  // 3. Back to cashier
  await page.locator('button:has-text("Kasir")').first().click();
  await page.waitForTimeout(2000);

  // 4. Select customer
  const custSel = page.locator('label:has-text("Pilih Customer")').locator('..').locator('select');
  const opts = await custSel.locator('option').all();
  console.log("  Customer options: " + opts.length);
  if (opts.length > 1) await custSel.selectOption({ index: 1 });
  await page.waitForTimeout(500);

  // 5. Add first sellable product with available stock
  await page.mouse.move(1200, 200);
  const sellableProduct = page.locator('#pos-pane button:not(.cursor-not-allowed)').filter({ hasText: /Rp / }).first();
  await expect(sellableProduct, "POS must show at least one sellable product").toBeVisible({ timeout: 10000 });
  await sellableProduct.scrollIntoViewIfNeeded();
  await sellableProduct.click();
  await page.waitForTimeout(2000);

  // Screenshot after adding to cart
  await page.screenshot({ path: path.join(ART, "pos_catalog.png"), fullPage: true });
  console.log("  Screenshot: pos_catalog.png");

  // 6. Check cart - must NOT be empty after adding product
  const cartEmpty = page.locator('text=Keranjang kosong');
  const isCartEmpty = await cartEmpty.isVisible().catch(() => false);
  console.log("  Cart empty: " + isCartEmpty);
  expect(isCartEmpty, "Cart should NOT be empty after adding product").toBe(false);

  if (!isCartEmpty) {
    const payInput = page.locator('input[placeholder="Rp..."]').first();
    await payInput.fill("500000");
    await page.locator('button:has-text("Bayar Lunas")').first().click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(ART, "pos_payment_complete.png"), fullPage: true });
    console.log("  Screenshot: pos_payment_complete.png");
    console.log("  Checkout OK");

    // 7. Verify history - open subtab riwayat
    const historyButton = page.getByRole("button", { name: "Riwayat", exact: true });
    await historyButton.click();
    const historyHeading = page.getByRole("heading", { name: "Riwayat Transaksi Nota POS" });
    await expect(historyHeading).toBeVisible({ timeout: 10000 });

    const historyTable = historyHeading.locator("../..").locator("table");
    const rows = await historyTable.locator('tbody tr').count();
    console.log("  History rows: " + rows);
    expect(rows, "History must have at least 1 transaction after checkout").toBeGreaterThan(0);

    await page.screenshot({ path: path.join(ART, "pos_history_after_sale.png"), fullPage: true });
    console.log("  Screenshot: pos_history_after_sale.png");
  }

  console.log("\n  POS workflow completed!");
});
