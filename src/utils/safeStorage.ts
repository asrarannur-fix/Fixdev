/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

function getSafeStorage(): Storage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    console.warn(
      "localStorage is blocked or inaccessible. Falling back to memory storage.",
      e,
    );
  }
  return new MemoryStorage();
}

export const safeLocalStorage = getSafeStorage();
