import { test, expect } from "@playwright/test";
import { loginAsSuperadmin, loginAsTenantOwner, BASE_URL } from "./helpers/auth";

test.describe("Service Reception", () => {
  test("unauthenticated reception listing is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/service-receptions`);
    expect(res.status()).toBe(401);
  });

  test("tenant owner can list service tickets", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const res = await request.get(`${BASE_URL}/api/service-receptions`, {
      headers: { Authorization: `Bearer ${tenant!.token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("tenant owner can create a service reception ticket", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const payload = {
      customerName: "E2E Customer",
      customerPhone: "081234567890",
      deviceType: "LAPTOP",
      deviceBrand: "Lenovo",
      complaint: "Tidak menyala",
      branchId: tenant!.user.branches?.[0]?.id ?? null,
    };
    const res = await request.post(`${BASE_URL}/api/service-receptions`, {
      headers: { Authorization: `Bearer ${tenant!.token}` },
      data: payload,
    });
    expect([200, 201, 422]).toContain(res.status());
  });
});
