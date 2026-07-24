import { test, expect } from "@playwright/test";
import { loginAsSuperadmin, BASE_URL } from "./helpers/auth";

test.describe("Superadmin", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const session = await loginAsSuperadmin(request);
    token = session.token;
  });

  test("list tenants requires authentication", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/superadmin/tenants`);
    expect(res.status()).toBe(401);
  });

  test("list tenants with valid token", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/superadmin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items ?? body)).toBeTruthy();
  });

  test("overview returns platform metrics", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/superadmin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("tenant registration mutation without edit-session is blocked", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `probe-${Date.now()}`,
        subdomain: `probe-${Date.now()}`,
        adminEmail: "probe@example.com",
        adminPassword: "Password123!",
      },
    });
    expect([401, 423]).toContain(res.status());
  });

  test("tenant operational summary requires authentication", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/superadmin/tenants/00000000-0000-0000-0000-000000000000/operational-summary`);
    expect(res.status()).toBe(401);
  });

  test("tenant operational summary returns health and modules with valid token", async ({ request }) => {
    const listRes = await request.get(`${BASE_URL}/api/superadmin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const tenantId = listBody.items?.[0]?.id || listBody[0]?.id;
    if (!tenantId) {
      test.skip(true, "No tenant available for operational summary test");
      return;
    }
    const res = await request.get(`${BASE_URL}/api/superadmin/tenants/${tenantId}/operational-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("health");
    expect(body).toHaveProperty("modules");
    expect(body).toHaveProperty("alerts");
    expect(body.alerts).toEqual(expect.any(Array));
  });
});
