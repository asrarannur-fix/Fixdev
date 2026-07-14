/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createClient } from "@supabase/supabase-js";
import { safeLocalStorage } from "./safeStorage";
import { toSnakeCase } from "./saasUtils";

const localStorage = safeLocalStorage;
const isValidSupabaseUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

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

export const isSupabaseConfigured = (): boolean => {
  try {
    const envUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
    const envAnon = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";
    if (envUrl.trim() && envAnon.trim()) {
      return true;
    }
    const saved = localStorage.getItem("saas_supabase_config");
    if (saved) {
      const config = JSON.parse(saved);
      return !!(isValidSupabaseUrl(config.url) && typeof config.anonKey === "string" && config.anonKey.trim());
    }
  } catch (_) {}
  return false;
};

let cachedSupabaseClient: any = null;
let cachedUrl: string = "";
let cachedKey: string = "";

function getSupabaseConfig(): { url: string; key: string } | null {
  try {
    const envUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
    const envAnon = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";
    if (envUrl.trim() && envAnon.trim()) {
      return { url: envUrl.trim(), key: envAnon.trim() };
    }
    const saved = localStorage.getItem("saas_supabase_config");
    if (saved) {
      const config = JSON.parse(saved);
      if (isValidSupabaseUrl(config.url) && typeof config.anonKey === "string" && config.anonKey.trim()) {
        return { url: config.url.trim(), key: config.anonKey.trim() };
      }
    }
  } catch (_) {}
  return null;
}

export const getSupabase = () => {
  try {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    // Invalidate cache when config changes at runtime
    if (cfg.url !== cachedUrl || cfg.key !== cachedKey) {
      cachedSupabaseClient = null;
    }

    if (cachedSupabaseClient) {
      return cachedSupabaseClient;
    }

    cachedSupabaseClient = createClient(cfg.url, cfg.key);
    cachedUrl = cfg.url;
    cachedKey = cfg.key;
    return cachedSupabaseClient;
  } catch (_) {}
  return null;
};
