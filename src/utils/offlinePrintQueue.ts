const DB_NAME = 'fixdev_print_queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending_jobs';

interface OfflinePrintJob {
  id: string;
  title: string;
  html: string;
  printConfig?: Record<string, unknown>;
  qrPayload?: string;
  documentType?: string;
  documentId?: string;
  branchId?: string;
  tenantId?: string;
  userId?: string;
  createdAt: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });

export const enqueuePrintJob = async (
  job: Omit<OfflinePrintJob, 'id' | 'createdAt' | 'retries' | 'status'>
): Promise<string> => {
  const db = await openDB();
  const id = crypto.randomUUID();
  const record: OfflinePrintJob = {
    ...job,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingPrintJobs = async (): Promise<OfflinePrintJob[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('status');
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const markJobProcessing = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const job = getReq.result;
      if (job) {
        job.status = 'processing';
        store.put(job);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const markJobDone = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const markJobFailed = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const job = getReq.result;
      if (job) {
        job.retries += 1;
        job.status = job.retries >= 3 ? 'failed' : 'pending';
        store.put(job);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearFailedJobs = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.objectStore(STORE_NAME).index('status');
    const req = index.openCursor('failed');
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingCount = async (): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('status');
    const req = index.count('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const getAllJobs = async (): Promise<OfflinePrintJob[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const getJobCountByStatus = async (): Promise<{
  pending: number;
  processing: number;
  failed: number;
}> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('status');
    let pending = 0,
      processing = 0,
      failed = 0;
    let done = 0;
    const finish = () => {
      if (++done === 3) resolve({ pending, processing, failed });
    };
    const countP = idx.count('pending');
    countP.onsuccess = () => {
      pending = countP.result;
      finish();
    };
    countP.onerror = () => finish();
    const countPr = idx.count('processing');
    countPr.onsuccess = () => {
      processing = countPr.result;
      finish();
    };
    countPr.onerror = () => finish();
    const countF = idx.count('failed');
    countF.onsuccess = () => {
      failed = countF.result;
      finish();
    };
    countF.onerror = () => finish();
  });
};
