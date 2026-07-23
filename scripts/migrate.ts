import dotenv from "dotenv";

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || ".env",
  override: true,
});

import { runPendingMigrations } from "../src/server/controllers/database.controller.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const expectedProfile = process.env.FIXDEV_PROFILE;
const expectedDatabase = process.env.FIXDEV_DATABASE_NAME;
if (expectedProfile && !["development", "production"].includes(expectedProfile)) {
  throw new Error(`Invalid FIXDEV_PROFILE: ${expectedProfile}`);
}
if (expectedDatabase) {
  const actualDatabase = new URL(connectionString).pathname.replace(/^\//, "");
  if (actualDatabase !== expectedDatabase) {
    throw new Error(`FIXDEV_DATABASE_NAME=${expectedDatabase} does not match DATABASE_URL database.`);
  }
}

const logs = await runPendingMigrations(connectionString);
for (const line of logs) console.log(line);