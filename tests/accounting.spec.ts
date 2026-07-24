import { test, expect } from "@playwright/test";
import { createTestTenant, BASE_URL } from "./helpers/auth";

test.describe("Accounting", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const tenant = await createTestTenant(request);
    token = tenant.token;
  });

  test("unauthenticated accounting access is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/accounting/accounts`);
    expect(res.status()).toBe(401);
  });

  test("tenant can list accounts (pagination)", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/accounting/accounts?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("tenant can list journal entries (pagination)", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/accounting/journal?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
