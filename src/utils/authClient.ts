/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local auth client for Express API endpoints.
 */
import { safeLocalStorage } from './safeStorage';
import { toSnakeCase } from './saasUtils';
import { readJsonResponse } from './apiResponse';

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
  };
};

export const isBackendConfigured = (): boolean => {
  return true;
};

/**
 * Local auth client that talks to our Express backend.
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.TEST_BASE_URL || 'http://localhost:3001';
}

export const getAuthClient = () => {
  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await readJsonResponse<{ user?: any; error?: string }>(response, 'Auth Login');
          if (!data.user) {
            return { data: null, error: { message: data.error || 'Login failed' } };
          }
          return {
            data: {
              session: {
                access_token: '',
                refresh_token: '',
                expires_in: 86400,
                expires_at: Math.floor(Date.now() / 1000) + 86400,
                token_type: 'cookie',
              },
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
          const response = await fetch(`${getBaseUrl()}/api/onboarding/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerEmail: email,
              ownerPassword: password,
              ownerName: options?.data?.name || email,
              shopName: options?.data?.name || 'My Shop',
            }),
          });
          const data = await readJsonResponse<{ owner?: any; message?: string; error?: string }>(response, 'Signup');
          if (!data.owner)
            return {
              data: null,
              error: { message: data.message || data.error || 'Signup failed' },
            };
          return { data: { user: data.owner }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      signOut: async () => {
        await fetch(`${getBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => undefined);
        return { error: null };
      },

      getSession: async () => {
        try {
          const response = await fetch(`${getBaseUrl()}/api/auth/profile`, {
            credentials: 'include',
          });
          const profile = await readJsonResponse<any>(response, 'Profile');
          return {
            data: {
              session: {
                access_token: '',
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
        try {
          const response = await fetch(`${getBaseUrl()}/api/auth/profile`, { credentials: 'include' });
          const profile = await readJsonResponse<any>(response, 'User Profile');
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