import { test, expect } from "@playwright/test";
import { loginAsTenantOwner, BASE_URL } from "./helpers/auth";

test.describe("Accounting", () => {
  test("unauthenticated accounting access is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/accounting/accounts`);
    expect(res.status()).toBe(401);
  });

  test("tenant owner can list accounts (pagination)", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const res = await request.get(`${BASE_URL}/api/accounting/accounts?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${tenant!.token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("accounts");
    expect(body).toHaveProperty("total");
  });

  test("tenant owner can list journal entries (pagination)", async ({ request }) => {
    const tenant = await loginAsTenantOwner(request);
    test.skip(!tenant, "No TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD provided");

    const res = await request.get(`${BASE_URL}/api/accounting/journal?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${tenant!.token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("entries");
    expect(body).toHaveProperty("total");
  });
});
