import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;

if (!databaseUrl || !email || !password) {
  throw new Error(
    "DATABASE_URL, TEST_OWNER_EMAIL, and TEST_OWNER_PASSWORD are required for E2E setup.",
  );
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
if (!["fixdev_e2e", "fixdev_test"].includes(databaseName)) {
  throw new Error(
    "E2E setup only permits dedicated fixdev_e2e or fixdev_test database.",
  );
}

for (const script of ["scripts/migrate.ts", "scripts/seed-e2e-services.ts"]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      ALLOW_DB_MIGRATIONS: "1",
      E2E_SEED_CONFIRM: "devtes",
    },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
