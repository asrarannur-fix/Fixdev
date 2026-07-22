/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local auth client for Express API endpoints.
 */
import { safeLocalStorage } from "./safeStorage";
import { toSnakeCase } from "./saasUtils";

const localStorage = safeLocalStorage;

export const cleanUserForDb = (user: any) => {
  const snakeUser = toSnakeCase(user);
  return {
    id: snakeUser.id,
    tenant_id: snakeUser.tenant_id || null,
    email: snakeUser.email,
    name: snakeUser.name,
    role: snakeUser.role,
    permissions: snakeUser.permissions || [],
    mfa_enabled: snakeUser.mfa_enabled || false,
  };
};

export const isBackendConfigured = (): boolean => {
  return true;
};

/**
 * Local auth client that talks to our Express backend.
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.TEST_BASE_URL || "http://localhost:3001";
}

export const getAuthClient = () => {
  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok || !data.token) {
            return { data: null, error: { message: data.error || "Login failed" } };
          }
          const token = data.token;
          localStorage.setItem("fixdev_token", token);
          return {
            data: {
              session: { access_token: token, refresh_token: "", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: "bearer" },
              user: data.user,
            },
            error: null,
          };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      signUp: async ({ email, password, options }: any) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/onboarding/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerEmail: email, ownerPassword: password, ownerName: options?.data?.name || email, shopName: options?.data?.name || "My Shop" }),
          });
          const data = await res.json();
          if (!res.ok) return { data: null, error: { message: data.message || data.error || "Signup failed" } };
          if (data.token) localStorage.setItem("fixdev_token", data.token);
          return { data: { user: data.owner }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      signOut: async () => {
        localStorage.removeItem("fixdev_token");
        return { error: null };
      },

      getSession: async () => {
        const token = localStorage.getItem("fixdev_token");
        if (!token) return { data: { session: null }, error: null };
        try {
          const res = await fetch(`${getBaseUrl()}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            localStorage.removeItem("fixdev_token");
            return { data: { session: null }, error: null };
          }
          const profile = await res.json();
          return {
            data: {
              session: {
                access_token: token,
                user: profile,
                expires_at: Math.floor(Date.now() / 1000) + 86400,
              },
            },
            error: null,
          };
        } catch {
          return { data: { session: null }, error: null };
        }
      },

      getUser: async () => {
        const token = localStorage.getItem("fixdev_token");
        if (!token) return { data: { user: null }, error: null };
        try {
          const res = await fetch(`${getBaseUrl()}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            localStorage.removeItem("fixdev_token");
            return { data: { user: null }, error: null };
          }
          const profile = await res.json();
          return { data: { user: profile }, error: null };
        } catch {
          return { data: { user: null }, error: null };
        }
      },

      resetPasswordForEmail: async (email: string) => {
        return { data: {}, error: null };
      },

      setSession: async () => ({ data: { session: null }, error: null }),
    },

    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
    }),
  };
};
