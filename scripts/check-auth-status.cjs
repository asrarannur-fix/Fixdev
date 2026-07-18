#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.log("FAIL: .env file not found");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf-8");
const vars = ["SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
let missing = [];

for (const v of vars) {
  if (!new RegExp(`^${v}=`, "m").test(env)) {
    missing.push(v);
  }
}

if (missing.length > 0) {
  console.log(`FAIL: Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("PASS: All required auth env vars present.");
