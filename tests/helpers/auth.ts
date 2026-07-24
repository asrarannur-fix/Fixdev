import { type APIRequestContext, type Page } from "@playwright/test";

export const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
export const SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL || "asrar@mail.com";
export const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD || "778877";

export interface AuthSession {
  token: string;
  user: any;
}

/**
 * Login via /api/auth/login and return token + raw user payload.
 * Shared by every E2E spec so credentials live in one place.
 */
export async function loginAsSuperadmin(request: APIRequestContext): Promise<AuthSession> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  });
  const body = await res.json();
  if (!res.ok() || !body.token) {
    throw new Error(`Superadmin login failed: ${body.error || res.status()}`);
  }
  return { token: body.token, user: body.user };
}

/**
 * Seed a tenant-scoped session (owner/admin) for tenant-level E2E.
 * Falls back gracefully if tenant credentials are not provided via env.
 */
export async function loginAsTenantOwner(
  request: APIRequestContext,
  email = process.env.TEST_TENANT_EMAIL,
  password = process.env.TEST_TENANT_PASSWORD,
): Promise<AuthSession | null> {
  if (!email || !password) return null;
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  if (!res.ok() || !body.token) return null;
  return { token: body.token, user: body.user };
}

/**
 * Inject a valid superadmin session into a browser page so UI specs
 * can navigate authenticated routes without re-login.
 */
export async function bootstrapSuperadminPage(page: Page, request: APIRequestContext) {
  const { token, user } = await loginAsSuperadmin(request);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("fixdev_token", token);
      localStorage.setItem("saas_is_authenticated", "true");
      localStorage.setItem("saas_user", JSON.stringify(user));
    },
    { token, user },
  );
  return { token, user };
}
