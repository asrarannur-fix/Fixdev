import { type APIRequestContext, type Page } from "@playwright/test";

export const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const TEST_ORIGIN = process.env.TEST_ORIGIN || "http://localhost:3000";
export const SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL || "asrar@mail.com";
export const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD || "778877";

export interface AuthSession {
  token: string;
  user: any;
}

const sessionToken = (body: any, headers: Record<string, string>) => {
  if (body.token) return body.token;
  const match = headers['set-cookie']?.match(/(?:^|,\s*)fixdev_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

/**
 * Login via /api/auth/login and return token + raw user payload.
 * Shared by every E2E spec so credentials live in one place.
 */
export async function loginAsSuperadmin(request: APIRequestContext): Promise<AuthSession> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  });
  const body = await res.json();
  const token = sessionToken(body, res.headers());
  if (!res.ok() || !token) {
    throw new Error(`Superadmin login failed: ${body.error || res.status()}`);
  }
  return { token, user: body.user };
}

/**
 * Open an EDIT console session (required for superadmin mutations under the
 * requireSuperAdminConsoleSession guard). Returns the session id to be sent as
 * the x-superadmin-session-id header.
 */
export async function startSuperadminConsoleSession(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/superadmin/console-session/start`, {
    headers: { Authorization: `Bearer ${token}`, Origin: TEST_ORIGIN },
    data: { mode: "EDIT", durationMinutes: 30 },
  });
  const body = await res.json();
  if (!res.ok() || !body.session?.id) {
    throw new Error(`Console session start failed: ${body.error || res.status()}`);
  }
  return body.session.id;
}

export interface TenantSession extends AuthSession {
  tenantId: string;
  subdomain: string;
  branchId: string | null;
}

/**
 * Create a throwaway tenant via superadmin API (with an active edit console
 * session) and log in as its owner. This removes the need for hardcoded
 * tenant credentials in the environment.
 */
export async function createTestTenant(
  request: APIRequestContext,
): Promise<TenantSession> {
  const sa = await loginAsSuperadmin(request);
  const consoleId = await startSuperadminConsoleSession(request, sa.token);

  const subdomain = `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const adminEmail = `${subdomain}@example.com`;
  const adminPassword = "E2ePassword123!";

  const createRes = await request.post(`${BASE_URL}/api/superadmin/tenants`, {
    headers: {
      Authorization: `Bearer ${sa.token}`,
      "x-superadmin-session-id": consoleId,
      Origin: TEST_ORIGIN,
    },
    data: {
      name: subdomain,
      ownerName: subdomain,
      ownerEmail: adminEmail,
      tier: "BASIC",
    },
  });
  const createBody = await createRes.json();
  if (!createRes.ok() || !createBody.invitationToken) {
    throw new Error(`Tenant creation failed: ${createBody.error || createRes.status()}`);
  }
  const tenantId = createBody.tenant?.id || createBody.id;
  const ownerEmail = createBody.invitation?.email || adminEmail;

  // Accept the owner invitation to provision the tenant owner account.
  const acceptRes = await request.post(`${BASE_URL}/api/invitations/accept`, {
    headers: { Origin: TEST_ORIGIN },
    data: { token: createBody.invitationToken, password: adminPassword },
  });
  const acceptBody = await acceptRes.json();
  if (!acceptRes.ok()) {
    throw new Error(`Invitation accept failed: ${acceptBody.error || acceptRes.status()}`);
  }

  const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
    headers: { Origin: TEST_ORIGIN },
    data: { email: ownerEmail, password: adminPassword },
  });
  const loginBody = await loginRes.json();
  const token = sessionToken(loginBody, loginRes.headers());
  if (!loginRes.ok() || !token) {
    throw new Error(`Tenant owner login failed: ${loginBody.error || loginRes.status()}`);
  }

  // Resolve the tenant's default branch so specs can create branch-scoped records.
  const bootRes = await request.get(`${BASE_URL}/api/bootstrap`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bootBody = await bootRes.json();
  const branchId =
    bootBody?.branches?.[0]?.id ||
    bootBody?.data?.branches?.[0]?.id ||
    bootBody?.branch?.id ||
    null;

  return {
    token,
    user: loginBody.user,
    tenantId,
    subdomain,
    branchId,
  };
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
