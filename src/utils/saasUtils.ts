/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { safeLocalStorage } from "./safeStorage";

const localStorage = safeLocalStorage;

export function toCamelCase<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v)) as any;
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      let value = obj[key];
      if (typeof value === "object" && value !== null) {
        value = toCamelCase(value);
      }
      result[camelKey] = value;
      return result;
    }, {} as any);
  }
  return obj;
}

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key
        .replace(/([a-z])([A-Z])|([A-Z])([A-Z][a-z])/g, "$1$3_$2$4")
        .toLowerCase();
      let value = obj[key];
      if (typeof value === "object" && value !== null) {
        value = toSnakeCase(value);
      }
      result[snakeKey] = value;
      return result;
    }, {} as any);
  }
  return obj;
}

export const safeArray = <T,>(value: unknown): T[] => {
  return Array.isArray(value) ? value : [];
};

export const parseArray = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : fallback;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUUID(str: string): boolean {
  if (typeof str !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function deterministicUUID(str: string): string {
  if (isUUID(str)) return str;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0x7FFFFFFF;
  }

  let hex = Math.abs(hash).toString(16).padEnd(32, "0");
  if (hex.length < 32) {
    let extraHash = 0;
    for (let i = str.length - 1; i >= 0; i--) {
      const char = str.charCodeAt(i);
      extraHash = (extraHash << 7) - extraHash + char;
      extraHash = extraHash & 0x7FFFFFFF;
    }
    hex += Math.abs(extraHash).toString(16).padEnd(32, "a");
  }
  hex = hex.substring(0, 32);

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    "4" + hex.substring(13, 16),
    "8" + hex.substring(17, 20),
    hex.substring(20, 32),
  ].join("-");
}

export function ensureUUID(id: string): string {
  if (!id) return generateUUID();
  if (isUUID(id)) return id;
  return deterministicUUID(id);
}

const UUID_KEYS = new Set([
  "id",
  "tenantId",
  "tenant_id",
  "branchId",
  "branch_id",
  "warehouseId",
  "warehouse_id",
  "customerId",
  "customer_id",
  "userId",
  "user_id",
  "shiftId",
  "shift_id",
  "cashierId",
  "cashier_id",
  "assignedTechId",
  "assigned_tech_id",
  "productId",
  "product_id",
  "originWarehouseId",
  "origin_warehouse_id",
  "destinationWarehouseId",
  "destination_warehouse_id",
  "accountId",
  "account_id",
]);

export function deepUUIDify(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => deepUUIDify(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      let value = obj[key];
      if (UUID_KEYS.has(key) && typeof value === "string") {
        value = ensureUUID(value);
      } else if (typeof value === "object" && value !== null) {
        value = deepUUIDify(value);
      }
      result[key] = value;
      return result;
    }, {} as any);
  }
  return obj;
}
