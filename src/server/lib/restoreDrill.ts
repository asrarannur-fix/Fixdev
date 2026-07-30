import { createHash } from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import { basename, join } from 'path';
import { z } from 'zod';

const sha256 = z.string().regex(/^[a-f0-9]{64}$/i);

const backupArtifactSchema = z.object({
  format: z.literal('fixdev-backup-v1'),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  migrations: z.array(z.object({ version: z.string().regex(/^\d+.*\.sql$/), checksumSha256: sha256 }).strict()),
  tables: z.record(z.string(), z.number().int().nonnegative()),
}).passthrough();

export type RestoreDrillResult = {
  valid: boolean;
  artifactSha256: string;
  sizeBytes: number;
  schemaVersion?: number;
  errors: string[];
};

export async function verifyBackupArtifact(artifactPath: string, migrationDir: string): Promise<RestoreDrillResult> {
  const info = await stat(artifactPath);
  if (!info.isFile()) throw new Error('Backup artifact must be a regular file.');
  const bytes = await readFile(artifactPath);
  const artifactSha256 = createHash('sha256').update(bytes).digest('hex');
  let input: unknown;
  try {
    input = JSON.parse(bytes.toString('utf8'));
  } catch {
    return { valid: false, artifactSha256, sizeBytes: info.size, errors: ['Backup artifact is not valid JSON.'] };
  }
  const parsed = backupArtifactSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, artifactSha256, sizeBytes: info.size, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }
  const migrationFiles = (await readdir(migrationDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  const expected = new Map(await Promise.all(migrationFiles.map(async (name) => [name, createHash('sha256').update(await readFile(join(migrationDir, name))).digest('hex')] as const)));
  const supplied = new Map(parsed.data.migrations.map((migration) => [migration.version, migration.checksumSha256.toLowerCase()]));
  const errors: string[] = [];
  if (supplied.size !== parsed.data.migrations.length) errors.push('Duplicate migration versions found.');
  for (const [version, checksum] of expected) {
    if (!supplied.has(version)) errors.push(`Missing migration: ${version}`);
    else if (supplied.get(version) !== checksum) errors.push(`Migration checksum mismatch: ${version}`);
  }
  for (const version of supplied.keys()) if (!expected.has(version)) errors.push(`Unknown migration: ${version}`);
  return { valid: errors.length === 0, artifactSha256, sizeBytes: info.size, schemaVersion: parsed.data.schemaVersion, errors };
}

export function artifactDisplayName(artifactPath: string) {
  return basename(artifactPath);
}
