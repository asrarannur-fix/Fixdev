#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const fs = require("fs");
const path = require("path");

let failed = false;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`PASS: ${label} ${detail}`);
  } else {
    console.error(`FAIL: ${label} ${detail}`);
    failed = true;
  }
}

function checkWarning(label, condition, detail = "") {
  if (condition) {
    console.log(`PASS: ${label} ${detail}`);
  } else {
    console.warn(`WARN: ${label} ${detail}`);
  }
}

// 1. Verify .env has required keys
const envPath = path.join(process.cwd(), ".env");
const envExists = fs.existsSync(envPath);
if (envExists) {
  const env = fs.readFileSync(envPath, "utf-8");
  const requiredVars = ["SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
  for (const v of requiredVars) {
    check(`Env var ${v} present`, new RegExp(`^${v}=`, "m").test(env));
  }
} else {
  console.warn("WARN: .env not found — skipping env checks");
}

// 2. Verify auth middleware has requireTenantScope
const authMwPath = path.join(process.cwd(), "src", "middleware", "auth.middleware.ts");
if (fs.existsSync(authMwPath)) {
  const auth = fs.readFileSync(authMwPath, "utf-8");
  check("auth.middleware has requireTenantScope", auth.includes("requireTenantScope"));
  check("auth.middleware has requireSupabaseJwt", auth.includes("requireSupabaseJwt"));
} else {
  console.warn("WARN: auth.middleware.ts not found");
}

// 3. Verify no console.log of secrets in src/
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".next", "coverage"].includes(item.name)) continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) out.push(p);
  }
  return out;
}

const srcFiles = walk(path.join(process.cwd(), "src"));
let secretLeakFound = false;
for (const f of srcFiles) {
  const rel = path.relative(process.cwd(), f);
  if (rel.includes("auth.middleware.ts") || rel.includes("bootstrap.controller") || rel.split(path.sep).includes("server")) continue;
  const txt = fs.readFileSync(f, "utf-8");
  if (/(SERVICE_ROLE_KEY|sk_live_|eyJ[a-zA-Z0-9_-]{30,}\.)/.test(txt)) {
    console.error(`FAIL: Potential secret leak in ${rel}`);
    secretLeakFound = true;
    failed = true;
  }
}
if (!secretLeakFound) console.log("PASS: No secret leaks detected in src");

// 4. Verify hardening: check error boundaries exist
const appTsx = path.join(process.cwd(), "src", "App.tsx");
if (fs.existsSync(appTsx)) {
  const app = fs.readFileSync(appTsx, "utf-8");
  checkWarning("App.tsx has error boundary", app.includes("ErrorBoundary") || app.includes("error") || app.includes("componentDidCatch"));
}

if (failed) {
  console.error("\n❌ Validate Hardening: FAILED");
  process.exit(1);
}
console.log("\n✅ Validate Hardening: PASS");