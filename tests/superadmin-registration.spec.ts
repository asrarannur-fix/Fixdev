import { test, expect } from "@playwright/test";
import { setupSuperadminSession } from "./superadmin-jwt-login-helper";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

test.describe("Super Admin - Tenant Registration Flow", () => {
  test.describe("UI Tests", () => {
    async function navigateToTenantManager(page: any) {
      const kelolaTab = page.getByText("Kelola Tenant");
      if (await kelolaTab.isVisible()) {
        await kelolaTab.click();
        await page.waitForTimeout(500);
      }
    }

    test.beforeEach(async ({ page, request }) => {
      await setupSuperadminSession(page, request);
      await navigateToTenantManager(page);
    });

    test("should display the simplified registration form", async ({ page }) => {
      await expect(page.getByText("Registrasi Tenant Baru")).toBeVisible({ timeout: 10000 });

      const form = page.locator('form:has(button:has-text("Daftarkan Tenant"))');
      await expect(form).toBeVisible();
      await expect(form.locator('input[placeholder*="Toko Servis"]')).toBeVisible();
      await expect(form.locator('input[placeholder*="Budi Santoso"]')).toBeVisible();
      await expect(form.locator('input[type="email"]')).toBeVisible();
      await expect(form.locator("select")).toBeVisible();

      await expect(page.locator('text="Langkah 1/6"')).toHaveCount(0);
      await expect(page.locator('input[placeholder*="mac-repair"]')).toHaveCount(0);
      await expect(page.locator('button:has-text("Periksa ketersediaan")')).toHaveCount(0);
    });

    test("should validate required fields on registration", async ({ page }) => {
      await expect(page.getByText("Registrasi Tenant Baru")).toBeVisible({ timeout: 10000 });

      const nameInput = page.locator('input[placeholder*="Toko Servis"]');
      const ownerInput = page.locator('input[placeholder*="Budi Santoso"]');
      const emailInput = page.locator('input[type="email"]');
      const submitBtn = page.locator('button:has-text("Daftarkan Tenant")');

      await nameInput.fill("");
      await submitBtn.dispatchEvent("click");
      await expect(page.getByText(/harap isi/i)).toBeVisible({ timeout: 5000 });
    });

    test("should register a tenant and show success toast", async ({ page }) => {
      const testEmail = `playwright-${Date.now()}@test.com`;
      const testName = `PW Test ${Date.now()}`;

      await expect(page.getByText("Registrasi Tenant Baru")).toBeVisible({ timeout: 10000 });

      await page.locator('input[placeholder*="Toko Servis"]').fill(testName);
      await page.locator('input[placeholder*="Budi Santoso"]').fill("PW Owner");
      await page.locator('input[type="email"]').fill(testEmail);

      const submitBtn = page.locator('button:has-text("Daftarkan Tenant")');
      await expect(submitBtn).toBeEnabled();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes("/api/superadmin/tenants") && resp.request().method() === "POST",
        { timeout: 15000 }
      );
      await submitBtn.click();
      const response = await responsePromise;
      const status = response.status();
      console.log("Registration API status:", status);

      expect(status).toBe(201);

      const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: "asrar@mail.com", password: "778877" },
      });
      const loginBody = await res.json();
      const tenantsRes = await page.request.get(`${BASE_URL}/api/superadmin/tenants?page=1&pageSize=100&sort=createdAt&direction=desc`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      const tenantsData = await tenantsRes.json();
      const created = (tenantsData.items || []).find((t: any) => t.name === testName);
      expect(created).toBeDefined();
      expect(created.subdomain).toMatch(/^pw-test-/);

      if (created) {
        await page.request.delete(`${BASE_URL}/api/superadmin/tenants/${created.id}/permanent`, {
          headers: { Authorization: `Bearer ${loginBody.token}`, "X-SuperAdmin-Mode": "edit" },
        });
      }
    });
  });

  test.describe("API Tests", () => {
    test("should create tenant with auto-generated subdomain via API", async ({ request }) => {
      const uniqueEmail = `api-test-${Date.now()}@pw.test`;
      const res = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: "asrar@mail.com", password: "778877" },
      });
      const loginBody = await res.json();
      expect(res.ok()).toBeTruthy();
      expect(loginBody.token).toBeDefined();

      const createRes = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: {
          name: `API Auto-Subdomain ${Date.now()}`,
          ownerName: "API Owner",
          ownerEmail: uniqueEmail,
          tier: "PRO",
        },
      });
      const createBody = await createRes.json();
      expect(createRes.ok()).toBeTruthy();
      expect(createBody.success).toBe(true);
      expect(createBody.tenant).toBeDefined();
      expect(createBody.tenant.name).toContain("API Auto-Subdomain");
      expect(createBody.tenant.subdomain).toBeDefined();
      expect(createBody.tenant.subdomain).toMatch(/^api-auto-subdomain-/);
      expect(createBody.tenant.status).toBe("TRIAL");
      expect(createBody.tenant.tier).toBe("PRO");

      await request.delete(`${BASE_URL}/api/superadmin/tenants/${createBody.tenant.id}/permanent`, {
        headers: { Authorization: `Bearer ${loginBody.token}`, "X-SuperAdmin-Mode": "edit" },
      });
    });

    test("should reject registration with missing required fields", async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: "asrar@mail.com", password: "778877" },
      });
      const loginBody = await res.json();

      const noName = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: { ownerName: "Owner", ownerEmail: "owner@test.com", tier: "BASIC" },
      });
      expect(noName.status()).toBe(422);

      const noOwner = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: { name: "No Owner", ownerEmail: "owner@test.com", tier: "BASIC" },
      });
      expect(noOwner.status()).toBe(422);

      const noEmail = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: { name: "No Email", ownerName: "Owner", tier: "BASIC" },
      });
      expect(noEmail.status()).toBe(422);

      const invalidTier = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: { name: "Bad Tier", ownerName: "Owner", ownerEmail: "bad@test.com", tier: "ULTRA" },
      });
      expect(invalidTier.status()).toBe(422);
    });

    test("should fail registration without auth token", async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: { "X-SuperAdmin-Mode": "edit" },
        data: { name: "No Auth", ownerName: "No Auth", ownerEmail: "noauth@test.com", tier: "BASIC" },
      });
      expect(res.status()).toBe(401);
    });

    test("should appear in tenant list after creation", async ({ request }) => {
      const uniqueEmail = `list-test-${Date.now()}@pw.test`;
      const tenantName = `List Check ${Date.now()}`;
      const res = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: "asrar@mail.com", password: "778877" },
      });
      const loginBody = await res.json();

      const createRes = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
        headers: {
          Authorization: `Bearer ${loginBody.token}`,
          "X-SuperAdmin-Mode": "edit",
        },
        data: { name: tenantName, ownerName: "List Owner", ownerEmail: uniqueEmail, tier: "PRO" },
      });
      expect(createRes.ok()).toBeTruthy();
      const createdTenant = await createRes.json();

      const listRes = await request.get(`${BASE_URL}/api/superadmin/tenants?page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      const listBody = await listRes.json();
      const names = (listBody.items || []).map((t: any) => t.name);
      expect(names).toContain(tenantName);

      await request.delete(`${BASE_URL}/api/superadmin/tenants/${createdTenant.tenant.id}/permanent`, {
        headers: { Authorization: `Bearer ${loginBody.token}`, "X-SuperAdmin-Mode": "edit" },
      });
    });
  });
});
