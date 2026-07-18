// API Client Configuration
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";

// Create axios instance
export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor to add auth token from Supabase session
api.interceptors.request.use(
  (config) => {
    // Supabase v2 stores session under sb-<ref>-auth-token; try multiple keys
    const token = (() => {
      // 1. Try Directus-style key (legacy)
      const legacy = localStorage.getItem("supabase.auth.token");
      if (legacy) try { return JSON.parse(legacy)?.currentSession?.access_token; } catch {}

      // 2. Try all sb-* keys to find an active session
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key)!);
            if (parsed?.access_token) return parsed.access_token;
          } catch {}
        }
      }

      return null;
    })();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling with race-condition guard
let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      console.error("Unauthorized request — session expired. Redirecting to login.");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem("supabase.auth.token");
      window.location.href = "/login";
    }
    if (error.response?.status === 403) {
      console.error("Forbidden: Insufficient permissions");
    }
    return Promise.reject(error);
  }
);

export default api;