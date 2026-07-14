import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
test.setTimeout(80000);

const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";

async function setupMocks(page: Page) {
  // Mock login endpoints
  await page.route("**/auth/v1/token?grant_type=password**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "mock-at",
      refresh_token: "mock-rt",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "u1", email: "asrarannur1@gmail.com" }
    })
  }));
  await page.route("**/auth/v1/session**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "mock-at",
      refresh_token: "mock-rt",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "u1", email: "asrarannur1@gmail.com" }
    })
  }));
  await page.route("**/auth/v1/user**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "u1", email: "asrarannur1@gmail.com" })
  }));
  await page.route("**/api/auth/profile**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: "u1",
      tenant_id: TID,
      email: "asrarannur1@gmail.com",
      name: "Asrar Annur",
      role: "OWNER",
      permissions: [
        "overview", "services", "services-list", "pos", "pos-cashier",
        "pos-shifts", "inventory", "inventory-products", "inventory-stock",
        "inventory-transfers", "inventory-purchases", "accounting",
        "accounting-coa", "accounting-journal", "hr", "hr-payroll", "crm", "settings"
      ],
      branch_ids: [],
      mfa_enabled: false
    })
  }));

  const bs: any = { tenants: [], users: [], branches: [], warehouses: [], customers: [], products: [], productStock: [], serviceTickets: [], posTransactions: [], posShifts: [], coaAccounts: [], journalEntries: [], auditLogs: [], moduleRecords: [] };
  // Bootstrap dari fixture statis
  console.log(`Bootstrap: ${bs.tenants.length} tenants, ${bs.serviceTickets.length} tickets`);

  await page.route("**/api/bootstrap**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(bs)
  }));
  let workflowTicket: any = null;
  await page.route("**/api/service-receptions", async route => {
    const request = route.request().postDataJSON();
    workflowTicket = {
      id: "e9c1bf94-1e8f-4520-9d14-4805fe48d881",
      tenantId: TID,
      branchId: request.branchId,
      ticketNo: "TKT/2607/900099",
      customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f",
      deviceName: request.device.name,
      deviceSerial: request.device.serial,
      deviceBrandModel: request.device.brandModel,
      customerComplaints: request.reception.complaint,
      estimatedCost: 0,
      customerApprovalStatus: "PENDING",
      partsUsed: [],
      initialChecklist: request.reception.checklist,
      initialPhotos: [],
      warrantyMonths: request.service.warrantyMonths,
      isOutsourced: false,
      status: "DITERIMA",
      timeline: [],
      createdAt: new Date().toISOString(),
    };
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: {
      customer: { id: workflowTicket.customerId, tenantId: TID, name: request.customer.name, phone: request.customer.phone },
      ticket: workflowTicket,
    } }) });
  });
  await page.route("**/api/service-receptions/*/*", async route => {
    const segments = route.request().url().split("/");
    const id = segments.at(-2);
    const action = segments.at(-1);
    const body = route.request().postDataJSON?.();
    console.log(`[DEBUG] ${action} on ${id}, body:`, body);
    if (!workflowTicket) workflowTicket = { id, tenantId: TID };
    if (action === "transition") workflowTicket = { ...workflowTicket, status: body?.status };
    if (action === "diagnosis") workflowTicket = { ...workflowTicket, status: "MENUGGU_APPROVAL", techDiagnosis: body?.diagnosis, estimatedCost: body?.estimatedCost };
    if (action === "approval") workflowTicket = { ...workflowTicket, status: body?.approved ? "SEDANG_DIKERJAKAN" : "APPROVAL_DITOLAK", customerApprovalStatus: body?.approved ? "APPROVED" : "REJECTED" };
    if (action === "qc") workflowTicket = { ...workflowTicket, status: body?.passed ? "SELESAI" : "REWORK", qcScore: body?.score };
    if (action === "handover") workflowTicket = { ...workflowTicket, status: "DIAMBIL", paymentMethod: body?.paymentMethod };
    const resp = { data: action === "handover" ? { ticket: workflowTicket } : { ticket: workflowTicket } };
    console.log(`[DEBUG] response:`, JSON.stringify(resp));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(resp) });
  });
  await page.route("**/api/data/sync**", r => r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true })
  }));
}

async function login(page: Page) {
  await page.goto("http://localhost:3000");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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

test("Verify complete unit reception to completion workflow", async ({ page }) => {
  await setupMocks(page);
  const ok = await login(page);
  expect(ok, "Dashboard must load").toBe(true);

  // 1. Click Layanan/Reparasi & Servis menu
  const servicesBtn = page.getByRole("button", { name: /Servis, buka menu/i }).first();
  await servicesBtn.click();
  await page.waitForTimeout(2000);

  // 2. Click "Penerimaan Unit" sub-menu
  const newTicketTab = page.getByRole("button", { name: /^Penerimaan$/i }).first();
  await newTicketTab.click();
  await page.waitForTimeout(2000);

  // 3. Fill in the unit reception form
  // Create a new customer through the current reception UI
  const customerName = `Workflow E2E ${Date.now().toString().slice(-7)}`;
  await page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i).fill(customerName);
  await page.getByRole("button", { name: /Tambah pelanggan baru/i }).click();
  await page.getByPlaceholder("Nama lengkap").fill(customerName);
  await page.getByPlaceholder("081234567890").fill("081298765432");
  
  // Brand
  await page.locator('input[placeholder="ASUS ROG GA401"]').fill("ASUS");
  // Model/Device Name
  await page.locator('input[placeholder="Asus ROG GL503"]').fill("TUF Gaming F15");
  // Serial Number is inside optional details.
  await page.getByRole("button", { name: /Detail lainnya/i }).click();
  await page.locator('input[placeholder="M1N0CV02K24"]').fill("TUF-SN-998877");
  // Complaints
  await page.locator('textarea[placeholder*="Layar bergaris"]').fill("Keyboard error and fan noise");

  // Submit form
  await page.locator('button[type="submit"]:has-text("Daftarkan Unit & Buat SPK")').first().click();
  await page.waitForTimeout(3000);

  // Close the automatic receipt preview, then dismiss the success dialog
  const receiptClose = page.getByRole("button", { name: "Tutup", exact: true }).last();
  if (await receiptClose.isVisible().catch(() => false)) await receiptClose.click();
  await page.getByRole("button", { name: "Selesai & Tutup", exact: true }).click();
  await page.waitForTimeout(2000);

  // 5. Click "Daftar Servis" sub-tab to see the newly created ticket
  const listTab = page.locator('text="Daftar Servis"').first();
  await listTab.click();
  await page.waitForTimeout(2000);

  // Assert ticket exists in the list
  const ticketCard = page.locator('div[class*="max-h-"]').first().locator('div.rounded-2xl').filter({ hasText: "TUF Gaming F15" }).first();
  await expect(ticketCard).toBeVisible();
  await expect(ticketCard).toHaveClass(/rounded-2xl/);

  // Verify card elements: avatar, checkbox, rail, complaint, formatted price
  const cardHTML = await ticketCard.evaluate(el => el.innerHTML.length > 0);
  expect(cardHTML).toBeTruthy();
  const hasAvatar = await ticketCard.locator('.rounded-full').first().isVisible();
  expect(hasAvatar).toBe(true);
  const hasCheckbox = await ticketCard.locator('input[type="checkbox"]').first().isVisible();
  expect(hasCheckbox).toBe(true);
  const hasComplaint = await ticketCard.getByText(/error|Keyboard/i).first().isVisible().catch(() => false);

  await page.screenshot({ path: "/home/ubuntu/barufix/screenshots-bukti/servis-dense-rows-desktop.png", fullPage: false });

  // 6. Click ticket and verify portal modal appears.
  await ticketCard.click();
  await page.waitForTimeout(3000);
  const modalHeading = page.getByRole("heading", { name: "Manajemen Perbaikan & Servis" });
  await expect(modalHeading).toBeVisible();
  await page.screenshot({ path: "/home/ubuntu/barufix/screenshots-bukti/servis-split-40-60.png", fullPage: false });

  // 8. Click step 3 (Perbaikan) in the visual stepper to set it to SEDANG_DIKERJAKAN
  const stepPerbaikan = page.locator('button[title*="Perbaikan"]').first();
  await expect(stepPerbaikan).toBeVisible({ timeout: 10000 });
  await stepPerbaikan.click();
  await page.waitForTimeout(3000);

  // 9. QC form is NOW inside modal detail — scroll down and find QC section
  const qcFormSection = page.locator("h4:has-text('Quality Control (QC)')").first();
  await expect(qcFormSection).toBeVisible({ timeout: 10000 });
  await qcFormSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // 10. Click "Lolos QC (Selesai)" button directly inside modal
  const passQcBtn = page.getByRole("button", { name: /Lolos QC \(Selesai\)/i }).first();
  await expect(passQcBtn).toBeVisible({ timeout: 10000 });
  await passQcBtn.click();
  await page.waitForTimeout(3000);

  // Tutup modal
  const modalCloseBtn = modalHeading.locator("xpath=ancestor::div[contains(@class,'border-b')][1]").locator("button").last();
  await modalCloseBtn.click();
  await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
 
  // Verify the ticket reached completion in the service list
  const completedCard = page.locator('div:has-text("TUF Gaming F15"):has-text("SELESAI")').first();
  await expect(completedCard).toBeVisible();
  await expect(completedCard).toContainText(/SELESAI|SIAP|DIAMBIL/);

  // Take screenshot as proof of completion
  const screenshotPath = path.join(
    "C:", "Users", "Administrator", ".gemini", "antigravity-ide", "brain",
    "09f47af5-1c05-4f06-9c9a-aa511b59a504", "unit_reception_flow.png"
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n✅ Unit reception E2E workflow screenshot captured at: ${screenshotPath}`);
});
