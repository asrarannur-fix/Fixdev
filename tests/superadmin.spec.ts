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
    // router.use now applies requireSuperAdminConsoleSession; POST /tenants (a mutation)
    // must be rejected with 423 (read-only) or 401 when no console session header is sent.
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
});
