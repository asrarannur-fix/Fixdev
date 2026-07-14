/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IndexedDB-backed persistence for the offline action queue.
 *
 * Replaces the previous localStorage-based queue (saas_offline_queue_*) which was
 * limited to ~5MB, not encrypted, and lost on browser data clears. IndexedDB
 * provides a larger, structured store that survives cache clearing and supports
 * integrity validation on read.
 */

const DB_NAME = "fixdev_offline_db";
const STORE_NAME = "offline_queue";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load all queued offline actions for a tenant, validating each record.
 * Falls back to [] on any error so the app never crashes offline.
 */
export async function loadOfflineQueue(tenantId: string): Promise<any[]> {
  try {
    const db = await openDb();
    return await new Promise<any[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const rows = (getAllReq.result || [])
          .filter((r: any) => r && r.tenantId === tenantId)
          .filter(isValidOfflineAction);
        resolve(rows);
      };
      getAllReq.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

/**
 * Persist the full offline queue for a tenant (replace semantics):
 * clears this tenant's records, then re-inserts the current set.
 * Non-fatal — queue simply won't persist this cycle on failure.
 */
export async function saveOfflineQueue(tenantId: string, actions: any[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const clearReq = store.getAll();
      clearReq.onsuccess = () => {
        const existing = (clearReq.result || []).filter(
          (r: any) => r && r.tenantId === tenantId,
        );
        existing.forEach((r: any) => store.delete(r.id));
        actions.forEach((a) => store.put({ ...a, tenantId }));
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Non-fatal
  }
}

/** Validate a record shape (basic integrity check). */
export function isValidOfflineAction(record: any): boolean {
  return (
    !!record &&
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    record.payload !== undefined
  );
}