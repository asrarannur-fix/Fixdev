import { describe, expect, it } from 'vitest';
import { validateE2EEnvironment } from '../scripts/preflight-e2e.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:secret@127.0.0.1:5432/fixdev_e2e',
  TEST_OWNER_EMAIL: 'owner@example.test',
  TEST_OWNER_PASSWORD: 'secret',
  STORAGE_PROVIDER: 'local',
};

describe('validateE2EEnvironment', () => {
  it('accepts dedicated test database and local storage', () => {
    expect(validateE2EEnvironment(validEnv)).toMatchObject({ databaseName: 'fixdev_e2e' });
  });

  it.each(['fixdev', 'production', ''])('rejects non-allowlisted database %s', (databaseName) => {
    expect(() => validateE2EEnvironment({
      ...validEnv,
      DATABASE_URL: `postgresql://user:secret@127.0.0.1:5432/${databaseName}`,
    })).toThrow(/only permits dedicated/);
  });

  it('reports missing required environment names without values', () => {
    expect(() => validateE2EEnvironment({ DATABASE_URL: validEnv.DATABASE_URL })).toThrow(
      'Missing required environment variables: TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD, STORAGE_PROVIDER',
    );
  });

  it('rejects non-local storage', () => {
    expect(() => validateE2EEnvironment({ ...validEnv, STORAGE_PROVIDER: 's3' })).toThrow(
      'E2E preflight only permits local storage.',
    );
  });

  it('rejects non-PostgreSQL URLs', () => {
    expect(() => validateE2EEnvironment({ ...validEnv, DATABASE_URL: 'https://example.test/fixdev_e2e' })).toThrow(
      'DATABASE_URL must use postgres or postgresql protocol.',
    );
  });
});
