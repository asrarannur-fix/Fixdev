import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyBackupArtifact } from './restoreDrill';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))));

async function fixture(migrations: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fixdev-restore-drill-'));
  roots.push(root);
  const migrationDir = path.join(root, 'migrations');
  await fs.mkdir(migrationDir);
  const entries = await Promise.all(Object.entries(migrations).map(async ([name, sql]) => {
    await fs.writeFile(path.join(migrationDir, name), sql);
    return { version: name, checksumSha256: createHash('sha256').update(sql).digest('hex') };
  }));
  const artifact = path.join(root, 'backup.json');
  await fs.writeFile(artifact, JSON.stringify({ format: 'fixdev-backup-v1', schemaVersion: 1, createdAt: new Date().toISOString(), migrations: entries, tables: {} }));
  return { artifact, migrationDir };
}

describe('restore drill verifier', () => {
  it('validates artifact and migration checksums without DB access', async () => {
    const fixturePaths = await fixture({ '001_init.sql': 'CREATE TABLE safe_table (id integer);' });
    await expect(verifyBackupArtifact(fixturePaths.artifact, fixturePaths.migrationDir)).resolves.toMatchObject({ valid: true, schemaVersion: 1 });
  });

  it('rejects changed migration', async () => {
    const fixturePaths = await fixture({ '001_init.sql': 'CREATE TABLE safe_table (id integer);' });
    await fs.writeFile(path.join(fixturePaths.migrationDir, '001_init.sql'), 'DROP TABLE production;');
    await expect(verifyBackupArtifact(fixturePaths.artifact, fixturePaths.migrationDir)).resolves.toMatchObject({ valid: false, errors: ['Migration checksum mismatch: 001_init.sql'] });
  });

  it('rejects malformed artifact', async () => {
    const fixturePaths = await fixture({ '001_init.sql': 'SELECT 1;' });
    await fs.writeFile(fixturePaths.artifact, 'not json');
    await expect(verifyBackupArtifact(fixturePaths.artifact, fixturePaths.migrationDir)).resolves.toMatchObject({ valid: false });
  });
});
