import { test, expect } from "@playwright/test";
import { loginAsSuperadmin, BASE_URL } from "./helpers/auth";

test.describe("Auth", () => {
  test("superadmin can login and receive a token", async ({ request }) => {
    const session = await loginAsSuperadmin(request);
    expect(session.token).toBeTruthy();
    expect(session.user.role).toBe("SUPER_ADMIN");
  });

  test("login rejects wrong password", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "asrar@mail.com", password: "wrong-password" },
    });
    expect(res.status()).toBe(401);
  });

  test("health endpoint responds ok", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
