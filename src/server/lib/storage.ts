import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageAdapter {
  write(objectPath: string, data: Buffer): Promise<void>;
  read(objectPath: string): Promise<Buffer>;
  delete(objectPath: string): Promise<void>;
  measureTenant(tenantId: string): Promise<number>;
  deleteTenant(tenantId: string): Promise<void>;
}

export function storageRoot() {
  return path.resolve(process.env.FILE_UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/data/uploads' : 'uploads'));
}

function resolveStoragePath(root: string, objectPath: string) {
  const resolved = path.resolve(root, objectPath);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid storage path.');
  return resolved;
}

export function safeStoragePath(objectPath: string) {
  return resolveStoragePath(storageRoot(), objectPath);
}

async function directorySize(directory: string) {
  let total = 0;
  try {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in storage.');
      if (entry.isDirectory()) total += await directorySize(entryPath);
      else if (entry.isFile()) total += (await fs.stat(entryPath)).size;
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  return total;
}

export function createLocalStorage(root = storageRoot()): StorageAdapter {
  const normalizedRoot = path.resolve(root);
  const resolve = (objectPath: string) => resolveStoragePath(normalizedRoot, objectPath);
  return {
    async write(objectPath, data) {
      const target = resolve(objectPath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data, { flag: 'wx' });
    },
    read(objectPath) {
      return fs.readFile(resolve(objectPath));
    },
    delete(objectPath) {
      return fs.unlink(resolve(objectPath));
    },
    async measureTenant(tenantId) {
      return (await directorySize(resolve(`tenant/${tenantId}`))) + (await directorySize(resolve(`tenant-${tenantId}`)));
    },
    async deleteTenant(tenantId) {
      await Promise.all([
        fs.rm(resolve(`tenant/${tenantId}`), { recursive: true, force: true }),
        fs.rm(resolve(`tenant-${tenantId}`), { recursive: true, force: true }),
      ]);
    },
  };
}

export function validateStorage() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider !== 'local') throw new Error(`Unsupported storage provider: ${provider}. Only local storage is available.`);
  const root = storageRoot();
  fsSync.mkdirSync(root, { recursive: true });
  const stat = fsSync.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Storage root must be a real directory: ${root}`);
  fsSync.accessSync(root, fsSync.constants.R_OK | fsSync.constants.W_OK);
}

export function getStorage(): StorageAdapter {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 'local') return createLocalStorage();
  throw new Error(`Unsupported storage provider: ${provider}. Only local storage is available.`);
}
