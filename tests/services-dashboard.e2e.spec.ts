import { test, expect, type Page } from "@playwright/test";

const TEST_TENANT_EMAIL = process.env.TEST_TENANT_EMAIL || "";
const TEST_USER_PASSWORD = process.env.TEST_TENANT_PASSWORD || "";
const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";
const serviceTickets = [
  { id: "st-1", tenantId: TID, ticketNo: "TKT/001", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "MacBook Pro", deviceBrandModel: "Apple", customerComplaints: "Tidak bisa nyala", estimatedCost: 1500000, status: "DITERIMA", createdAt: new Date().toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-2", tenantId: TID, ticketNo: "TKT/002", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "ThinkPad X1", deviceBrandModel: "Lenovo", customerComplaints: "Keyboard error", estimatedCost: 800000, status: "DIAGNOSA", createdAt: new Date().toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-3", tenantId: TID, ticketNo: "TKT/003", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "iPhone 15", deviceBrandModel: "Apple", customerComplaints: "Baterai boros", estimatedCost: 500000, status: "MENUGGU_APPROVAL", createdAt: new Date().toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-4", tenantId: TID, ticketNo: "TKT/004", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "ROG Phone", deviceBrandModel: "ASUS", customerComplaints: "Overheating", estimatedCost: 1200000, status: "SEDANG_DIKERJAKAN", createdAt: new Date().toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-5", tenantId: TID, ticketNo: "TKT/005", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "Galaxy S24", deviceBrandModel: "Samsung", customerComplaints: "LCD retak", estimatedCost: 2000000, status: "QC", createdAt: new Date().toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-6", tenantId: TID, ticketNo: "TKT/006", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "ProBook 450", deviceBrandModel: "HP", customerComplaints: "Layar berkedip", estimatedCost: 0, status: "SIAP_DIAMBIL", createdAt: new Date(Date.now() - 86400000).toISOString(), estimatedCompletionDate: new Date(Date.now() - 3600000).toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-7", tenantId: TID, ticketNo: "TKT/007", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "XPS 13", deviceBrandModel: "Dell", customerComplaints: "Battery not charging", estimatedCost: 750000, status: "SELESAI", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
  { id: "st-8", tenantId: TID, ticketNo: "TKT/008", customerId: "b9ab665d-ed13-44c9-8912-95aec217c36f", deviceName: "iPad Air", deviceBrandModel: "Apple", customerComplaints: "Touch ID not working", estimatedCost: 600000, status: "DIBATALKAN", createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), timeline: [], partsUsed: [], warrantyMonths: 3, isOutsourced: false, initialChecklist: [], initialPhotos: [] },
];
const customers = [{ id: "b9ab665d-ed13-44c9-8912-95aec217c36f", name: "Customer Demo", phone: "081234567890", email: "", address: "", segment: "PERSONAL" }];

async function setupMocks(page: Page) {
  const session = {
    access_token: "mock-at",
    refresh_token: "mock-rt",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "u1", email: TEST_TENANT_EMAIL },
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
        email: TEST_TENANT_EMAIL,
        name: "Asrar Annur",
        role: "OWNER",
        permissions: ["overview", "services", "services-list", "services-new-ticket"],
        branch_ids: [],
        mfa_enabled: false,
      }),
    }),
  );
  const bootstrapResp = {
    tenants: [{ id: TID, name: "Demo Toko", tier: "ENTERPRISE", features: ["RENTAL","SERVICE","POS"], rbacMatrix: {}, settings: {} }],
    branches: [{ id: "branch-1", tenantId: TID, name: "Cabang Utama" }],
    customers,
    products: [],
    employees: [{ id: "emp-1", tenantId: TID, name: "Budi Teknisi", role: "TECHNICIAN" }],
    services: serviceTickets,
    fields: { branch: [{ id: "branch-1", tenantId: TID, name: "Cabang Utama" }] },
    workflows: [],
    inventory: [],
    serviceReceipt: [],
    cashTransactions: [],
    posShifts: [],
    posTransactions: [],
    journalEntries: [],
    journalLines: [],
    coaAccounts: [],
    accountingPeriods: [],
    whatsappLogs: [],
  };
  await page.route("**/api/bootstrap**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrapResp) }),
  );
  await page.route("**/api/data/sync**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }),
  );
}

async function login(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#root");
  const portal = page.getByRole("button", { name: /^Masuk$/i }).first();
  if (await portal.isVisible().catch(() => false)) await portal.click();
  await page.locator('input[type="email"]').first().fill(TEST_TENANT_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: /^Masuk$/i }).last().click();
  await expect(page.locator("#main-app-container")).toBeVisible({ timeout: 20_000 });
}

test("KPI dashboard dan inbox servis menampilkan data dengan benar", async ({ page }) => {
  await setupMocks(page);
  await login(page);

  // Buka tab servis, lalu klik "Daftar Servis" sub-menu
  const servicesTab = page.getByRole("button", { name: /Servis|Services/i }).first();
  await expect(servicesTab).toBeVisible();
  await servicesTab.click();
  await page.waitForTimeout(1000);

  // Klik "Daftar Servis" untuk membuka inbox tiket
  const daftarServis = page.getByRole("button", { name: "Daftar Servis" }).first();
  await daftarServis.click();
  await page.waitForTimeout(2000);

  // Cek KPI - Aktif harus muncul di bagian atas daftar
  const aktiveKpi = page.locator("text=Aktif").first();
  await expect(aktiveKpi).toBeVisible({ timeout: 10000 });

  // Semua KPI operasional inti harus tampil
  await expect(page.getByText("Baru Hari Ini", { exact: true })).toBeVisible();
  await expect(page.getByText("Menunggu Diagnosa", { exact: true })).toBeVisible();
  await expect(page.getByText("Menunggu Approval", { exact: true })).toBeVisible();
  await expect(page.getByText("Dikerjakan", { exact: true })).toBeVisible();
  await expect(page.getByText("Siap Diambil", { exact: true })).toBeVisible();
  await expect(page.getByText("Estimasi (Bln Ini)", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/services-dashboard-live.png", fullPage: true });

  // Cek tombol export CSV
  const exportCsv = page.getByRole("button", { name: /Export CSV/i });
  await expect(exportCsv).toBeVisible({ timeout: 5000 });

  // Cek tombol Terima Unit Baru
  const terimaBaru = page.getByRole("button", { name: /Terima Unit Baru/i });
  await expect(terimaBaru).toBeVisible({ timeout: 5000 });

  // Cek filter status cards
  const semuaUnit = page.getByRole("button", { name: /Semua Unit/i });
  await expect(semuaUnit).toBeVisible({ timeout: 5000 });

  // Cek bahwa tiket dalam list muncul - gunakan getByText
  const tiket1 = page.getByText("#TKT/001", { exact: true }).first();
  if (await tiket1.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tiket1.click();
    await page.waitForTimeout(1500);
  }

  // Screenshot untuk verifikasi visual
  await page.screenshot({ path: "test-results/services-dashboard-final.png", fullPage: true });
});
