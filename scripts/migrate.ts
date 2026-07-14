import "dotenv/config";
import { runPendingMigrations } from "../src/server/controllers/supabase.controller.js";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required.");

const logs = await runPendingMigrations(connectionString);
for (const line of logs) console.log(line);
