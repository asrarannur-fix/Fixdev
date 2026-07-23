import { test, expect } from "@playwright/test";
import { setupSuperadminSession } from "./superadmin-jwt-login-helper";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";

test.describe("Super Admin - Tenant Deletion Flow", () => {
  test.beforeEach(async ({ page, request }) => {
    await setupSuperadminSession(page, request);
  });

  test("should delete a tenant permanently via UI", async ({ page, request }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    const testEmail = `delete-${Date.now()}@playwright.test`;
    const testName = `Delete Test ${Date.now()}`;

    // 1. Create a tenant via API for deletion test
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "asrar@mail.com", password: "778877" },
    });
    const loginBody = await loginRes.json();
    console.log("Login Response Status:", loginRes.status());
    console.log("Login Response Body:", loginBody);
    expect(loginRes.ok()).toBeTruthy();
    const createRes = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
      headers: {
        Authorization: `Bearer ${loginBody.token}`,
        "X-SuperAdmin-Mode": "edit",
      },
      data: { name: testName, ownerName: "Delete Owner", ownerEmail: testEmail, tier: "BASIC" },
    });
    const createBody = await createRes.json();
    expect(createRes.ok()).toBeTruthy();
    const tenantIdToDelete = createBody.tenant.id;

    // 2. Navigate to tenant manager
    console.log("Navigating to BASE_URL:", BASE_URL);
    await page.goto(BASE_URL);
    const kelolaTab = page.getByText("Kelola Tenant");
    console.log("Clicking Kelola Tenant tab...");
    await kelolaTab.click();
    await page.waitForTimeout(2000);

    // Wait for the tenant list to load
    console.log("Waiting for loading to finish...");
    await expect(page.getByText("Memuat tenant…")).not.toBeVisible({ timeout: 15000 });
    
    const tableVisible = await page.locator("table").isVisible();
    console.log("Table visible:", tableVisible);
    if (!tableVisible) {
      console.log("Table not visible. Page content:", await page.content());
    }
    await expect(page.locator("table")).toBeVisible();

    // Find the delete button for the newly created tenant
    console.log("Searching for tenant row with name:", testName);
    const tenantRow = page.locator(`tr:has-text("${testName}")`);
    const deleteBtn = tenantRow.locator('button:has-text("Hapus Permanen")');
    await deleteBtn.scrollIntoViewIfNeeded();
    console.log("Clicking Hapus Permanen button...");
    await deleteBtn.click();

    // Confirm dialog should appear
    console.log("Waiting for confirm dialog...");
    await page.waitForTimeout(1000);
    const dialogVisible = await page.getByRole('alertdialog').isVisible();
    console.log("Dialog visible (by role):", dialogVisible);
    if (!dialogVisible) {
      console.log("Dialog NOT visible. Page content slice near end:", (await page.content()).slice(-2000));
    }
    await expect(page.getByText("Hapus Permanen Tenant")).toBeVisible({ timeout: 10000 });
    
    // Click confirm
    const confirmBtn = page.locator('button:has-text("Ya, Hapus Permanen")');
    await confirmBtn.click();
    console.log("Deletion requested. Waiting for list refresh...");

    // Verify tenant is no longer in the list (wait for refresh)
    await expect(async () => {
      const listRes = await request.get(`${BASE_URL}/api/superadmin/tenants?page=1&pageSize=100&sort=createdAt&direction=desc`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      const listBody = await listRes.json();
      const foundTenant = (listBody.items || []).find((t: any) => t.id === tenantIdToDelete);
      expect(foundTenant).toBeUndefined();
    }).toPass({ timeout: 20000 });

    // Verify Audit Trail
    const auditRes = await request.get(`${BASE_URL}/api/superadmin/audit?action=TENANT_PERMANENT_DELETE&pageSize=10`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    const auditBody = await auditRes.json();
    const deleteAudit = (auditBody.items || []).find((a: any) => a.resource_id === tenantIdToDelete);
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit.outcome).toBe("SUCCESS");
  });
});
