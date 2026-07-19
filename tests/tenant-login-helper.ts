import { type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

export const TEST_TENANT_EMAIL = process.env.TEST_TENANT_EMAIL || "";
export const TEST_TENANT_PASSWORD = process.env.TEST_TENANT_PASSWORD || "";

export async function loginTenant(page: Page, opts: { timeout?: number } = {}): Promise<boolean> {
  const timeout = opts.timeout ?? 30000;

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_TENANT_EMAIL,
    password: TEST_TENANT_PASSWORD,
  });
  if (error || !data.session || !data.user) return false;

  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    token_type: data.session.token_type,
    user: data.user,
  };

  const projectRef = new URL(process.env.VITE_SUPABASE_URL || "").hostname.split(".")[0];

  // Mock ALL network requests to Supabase domain (browser sandbox blocks them)
  await page.route("**/" + projectRef + ".supabase.co/**", (route) => {
    const url = route.request().url();
    const body = route.request().postData();

    // Token endpoint
    if (url.includes("/auth/v1/token")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
    }
    // User endpoint
    if (url.includes("/auth/v1/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data.user) });
    }
    // Session endpoint (getSession)
    if (url.includes("/auth/v1/session")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ session }) });
    }
    // Refresh token
    if (url.includes("/auth/v1/token?grant_type=refresh_token")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
    }
    // Default: respond with empty success for other endpoints
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // Also intercept localhost to serve mock profile
  await page.route("**/api/auth/profile**", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "u1",
        tenant_id: "4e94a9c7-7670-4303-8dc8-e3a2b45accb6",
        email: TEST_TENANT_EMAIL,
        name: "Asrar Annur",
        role: "OWNER",
        permissions: ["overview", "services", "pos", "inventory", "accounting", "hr", "crm", "settings"],
        branch_ids: [],
        mfa_enabled: false,
      }),
    });
  });

  // Inject session into localStorage for faster hydration
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: `sb-${projectRef}-auth-token`, value: JSON.stringify(session) },
  );

  await page.goto("/", { waitUntil: "commit", timeout: 120000 });
  await page.waitForSelector("#root", { timeout: 15000 });
  return page.locator("#main-app-container").isVisible({ timeout }).catch(() => false);
}