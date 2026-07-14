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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("supabase.auth.token");
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed?.currentSession?.access_token) {
        config.headers.Authorization = `Bearer ${parsed.currentSession.access_token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login or refresh token
      console.error("Unauthorized request");
    }
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error("Forbidden: Insufficient permissions");
    }
    return Promise.reject(error);
  }
);

export default api;