import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalStorage, getStorage, storageRoot } from './storage';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function adapter() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fixdev-storage-'));
  roots.push(root);
  return { root, storage: createLocalStorage(root) };
}

describe('StorageAdapter contract', () => {
  it('writes once, reads bytes, and deletes objects', async () => {
    const { storage } = await adapter();
    await storage.write('tenant/a/file.bin', Buffer.from('data'));
    await expect(storage.read('tenant/a/file.bin')).resolves.toEqual(Buffer.from('data'));
    await expect(storage.write('tenant/a/file.bin', Buffer.from('replace'))).rejects.toMatchObject({ code: 'EEXIST' });
    await storage.delete('tenant/a/file.bin');
    await expect(storage.read('tenant/a/file.bin')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('measures and deletes both supported tenant layouts', async () => {
    const { storage } = await adapter();
    await storage.write('tenant/a/one', Buffer.alloc(2));
    await storage.write('tenant-a/two', Buffer.alloc(3));
    await expect(storage.measureTenant('a')).resolves.toBe(5);
    await storage.deleteTenant('a');
    await expect(storage.measureTenant('a')).resolves.toBe(0);
  });

  it('rejects paths outside root', async () => {
    const { storage } = await adapter();
    await expect(storage.write('../escape', Buffer.alloc(0))).rejects.toThrow('Invalid storage path.');
    expect(() => storage.read('/absolute')).toThrow('Invalid storage path.');
  });
});

describe('storage configuration', () => {
  it('uses /data volume only in production', () => {
    const previous = { nodeEnv: process.env.NODE_ENV, uploadDir: process.env.FILE_UPLOAD_DIR };
    delete process.env.FILE_UPLOAD_DIR;
    process.env.NODE_ENV = 'production';
    expect(storageRoot()).toBe('/data/uploads');
    process.env.NODE_ENV = 'development';
    expect(storageRoot()).toBe(path.resolve('uploads'));
    process.env.NODE_ENV = previous.nodeEnv;
    if (previous.uploadDir === undefined) delete process.env.FILE_UPLOAD_DIR;
    else process.env.FILE_UPLOAD_DIR = previous.uploadDir;
  });

  it('rejects unavailable providers', () => {
    const previous = process.env.STORAGE_PROVIDER;
    process.env.STORAGE_PROVIDER = 's3';
    expect(() => getStorage()).toThrow('Unsupported storage provider: s3. Only local storage is available.');
    if (previous === undefined) delete process.env.STORAGE_PROVIDER;
    else process.env.STORAGE_PROVIDER = previous;
  });
});
