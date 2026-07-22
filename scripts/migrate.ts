import "dotenv/config";
import { runPendingMigrations } from "../src/server/controllers/database.controller.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const logs = await runPendingMigrations(connectionString);
for (const line of logs) console.log(line);
