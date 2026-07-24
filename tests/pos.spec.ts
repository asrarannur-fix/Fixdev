import { test, expect } from "@playwright/test";
import { createTestTenant, BASE_URL } from "./helpers/auth";

test.describe("POS", () => {
  let token: string;
  let branchId: string | null;

  test.beforeAll(async ({ request }) => {
    const tenant = await createTestTenant(request);
    token = tenant.token;
    branchId = tenant.branchId;
  });

  test("unauthenticated POS sales listing is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pos/sales`);
    expect(res.status()).toBe(401);
  });

  test("tenant can open a shift", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/pos/shifts/open`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(branchId ? { "x-branch-id": branchId } : {}),
      },
      data: { startingCash: 100000 },
    });
    expect([200, 201, 409]).toContain(res.status());
  });

  test("tenant can list shifts", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/pos/shifts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(branchId ? { "x-branch-id": branchId } : {}),
      },
    });
    expect(res.ok()).toBeTruthy();
  });
});
