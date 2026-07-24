import { test, expect } from "@playwright/test";
import { loginAsTenantOwner, BASE_URL } from "./helpers/auth";

test.describe("POS", () => {
  test("unauthenticated POS sales listing is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pos/sales`);
    expect(res.status()).toBe(401);
  });

  test("tenant owner can open a shift", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const res = await request.post(
      `${BASE_URL}/api/pos/shifts/open`,
      {
        headers: { Authorization: `Bearer ${tenant!.token}` },
        data: { openingCash: 100000 },
      },
    );
    expect([200, 201, 409, 422]).toContain(res.status());
  });

  test("tenant owner can list shifts", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const res = await request.get(`${BASE_URL}/api/pos/shifts`, {
      headers: { Authorization: `Bearer ${tenant!.token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});
