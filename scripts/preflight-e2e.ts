import pg from 'pg';

const REQUIRED_ENV = ['DATABASE_URL', 'TEST_OWNER_EMAIL', 'TEST_OWNER_PASSWORD', 'STORAGE_PROVIDER'] as const;
const TEST_DATABASES = new Set(['fixdev_e2e', 'fixdev_test']);

export function validateE2EEnvironment(env: NodeJS.ProcessEnv) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(env.DATABASE_URL!);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use postgres or postgresql protocol.');
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
  if (!TEST_DATABASES.has(databaseName)) {
    throw new Error('E2E preflight only permits dedicated fixdev_e2e or fixdev_test database.');
  }
  if (env.STORAGE_PROVIDER!.toLowerCase() !== 'local') {
    throw new Error('E2E preflight only permits local storage.');
  }

  return { databaseName, databaseUrl: env.DATABASE_URL! };
}

export async function checkE2EDatabase(databaseUrl: string, expectedDatabase: string) {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
    const result = await client.query<{ current_database: string }>('SELECT current_database()');
    if (result.rows[0]?.current_database !== expectedDatabase) throw new Error('Connected database does not match DATABASE_URL.');
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function runE2EPreflight(env = process.env, args = process.argv.slice(2)) {
  const config = validateE2EEnvironment(env);
  if (args.includes('--check-db')) await checkE2EDatabase(config.databaseUrl, config.databaseName);
  process.stdout.write(`E2E preflight passed for ${config.databaseName} with local storage${args.includes('--check-db') ? ' and database connectivity' : ''}.\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runE2EPreflight().catch((error: unknown) => {
    process.stderr.write(`E2E preflight failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
