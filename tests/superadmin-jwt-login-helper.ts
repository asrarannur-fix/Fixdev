import { type Page, type APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL || "asrar@mail.com";
const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD || "778877";

export interface SuperadminSession {
  token: string;
  user: any;
  camelUser: any;
}

export async function loginSuperadminViaApi(request: APIRequestContext): Promise<SuperadminSession> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  });
  const body = await res.json();
  if (!res.ok() || !body.token) {
    throw new Error(`Superadmin login failed: ${body.error || res.status()}`);
  }
  const camelUser = {
    id: body.user.id,
    tenantId: body.user.tenant_id || null,
    email: body.user.email,
    name: body.user.name,
    role: body.user.role,
    superadminRole: body.user.superadmin_role || null,
    permissions: body.user.permissions || [],
    features: body.user.features || [],
    branches: body.user.branches || [],
  };
  return { token: body.token, user: body.user, camelUser };
}

export async function setupSuperadminSession(page: Page, request: APIRequestContext) {
  const session = await loginSuperadminViaApi(request);

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("fixdev_token", token);
    localStorage.setItem("saas_is_authenticated", "true");
    localStorage.setItem("saas_curr_user", JSON.stringify(user));
    if (user.tenantId) {
      localStorage.setItem("saas_curr_tenant_id", user.tenantId);
    } else {
      localStorage.removeItem("saas_curr_tenant_id");
    }
  }, { token: session.token, user: session.camelUser });

  await page.goto(BASE_URL);
  await page.waitForSelector("#main-app-container", { timeout: 20000 });
}
