import { type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

export async function loginSuperAdmin(page: Page, timeout = 30_000): Promise<boolean> {
  const email = process.env.TEST_SUPERADMIN_EMAIL || "";
  const password = process.env.TEST_SUPERADMIN_PASSWORD || "";
  const url = process.env.VITE_SUPABASE_URL || "";
  const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY || "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return false;

  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    token_type: data.session.token_type,
    user: data.user,
  };
  const projectRef = new URL(url).hostname.split(".")[0];

  await page.route(`**/${projectRef}.supabase.co/**`, (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.includes("/auth/v1/token")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
    }
    if (requestUrl.includes("/auth/v1/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data.user) });
    }
    if (requestUrl.includes("/auth/v1/session")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ session }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: `sb-${projectRef}-auth-token`, value: JSON.stringify(session) },
  );
  await page.goto("/");
  return page.locator("#main-app-container").isVisible({ timeout }).catch(() => false);
}
