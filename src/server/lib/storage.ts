import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageAdapter {
  write(objectPath: string, data: Buffer): Promise<void>;
  read(objectPath: string): Promise<Buffer>;
  delete(objectPath: string): Promise<void>;
  measureTenant(tenantId: string): Promise<number>;
  deleteTenant(tenantId: string): Promise<void>;
}

const uploadRoot = path.resolve(process.env.FILE_UPLOAD_DIR || 'uploads');

export function safeStoragePath(objectPath: string) {
  const resolved = path.resolve(uploadRoot, objectPath);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) throw new Error('Invalid storage path.');
  return resolved;
}

async function directorySize(directory: string) {
  let total = 0;
  try {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) total += await directorySize(entryPath);
      else if (entry.isFile()) total += (await fs.stat(entryPath)).size;
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  return total;
}

const localStorage: StorageAdapter = {
  async write(objectPath, data) {
    const target = safeStoragePath(objectPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data, { flag: 'wx' });
  },
  read(objectPath) {
    return fs.readFile(safeStoragePath(objectPath));
  },
  delete(objectPath) {
    return fs.unlink(safeStoragePath(objectPath));
  },
  async measureTenant(tenantId) {
    return (await directorySize(safeStoragePath(`tenant/${tenantId}`))) + (await directorySize(safeStoragePath(`tenant-${tenantId}`)));
  },
  async deleteTenant(tenantId) {
    await Promise.all([
      fs.rm(safeStoragePath(`tenant/${tenantId}`), { recursive: true, force: true }),
      fs.rm(safeStoragePath(`tenant-${tenantId}`), { recursive: true, force: true }),
    ]);
  },
};

export function getStorage(): StorageAdapter {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 'local') return localStorage;
  throw new Error(`Unsupported storage provider: ${provider}. Only local storage is available.`);
}
