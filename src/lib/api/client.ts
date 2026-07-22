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

// Request interceptor to add auth token from local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("fixdev_token");
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
      localStorage.removeItem("fixdev_token");
      window.location.href = "/";
    }
    if (error.response?.status === 403) {
      console.error("Forbidden: Insufficient permissions");
    }
    return Promise.reject(error);
  }
);

export default api;