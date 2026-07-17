#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const { spawn, spawnSync } = require("child_process");
const http = require("http");
require("dotenv").config();
if (!process.env.TEST_TENANT_PASSWORD && process.env.TEST_SUPERADMIN_PASSWORD) {
  process.env.TEST_TENANT_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD;
}
if (!process.env.TEST_USER_PASSWORD && process.env.TEST_TENANT_PASSWORD) {
  process.env.TEST_USER_PASSWORD = process.env.TEST_TENANT_PASSWORD;
}

const BASE_URL = "http://localhost:3000";
const HEALTH_URL = "/api/health";
const MAX_RETRIES = 15;
const RETRY_INTERVAL = 2000; // 2s

const isWindows = process.platform === "win32";
const npmBin = isWindows ? "npm.cmd" : "npm";
const npxBin = isWindows ? "npx.cmd" : "npx";

function killPort3000() {
  console.log("Checking port 3000...");
  try {
    if (!isWindows) {
      spawnSync("fuser", ["-k", "3000/tcp"], { stdio: "ignore" });
      return;
    }
    const netstat = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
    for (const line of (netstat.stdout || "").split("\n")) {
      if (!line.includes(":3000") || !line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") spawnSync("taskkill", ["/PID", pid, "/F"]);
    }
  } catch (e) {
    console.warn("Could not check/kill port 3000:", e.message);
  }
}

function checkHealth() {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${HEALTH_URL}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(res.statusCode === 200 && json.status === "ok");
        } catch (_) {
          resolve(false);
        }
      });
    }).on("error", () => {
      resolve(false);
    });
  });
}

async function waitForServer() {
  console.log("Waiting for dev server to start...");
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await checkHealth()) {
      console.log("Dev server is ready!");
      return true;
    }
    await new Promise(r => setTimeout(r, RETRY_INTERVAL));
  }
  return false;
}

async function main() {
  killPort3000();

  console.log("Starting PRODUCTION server (dist/server.cjs)...");
  const env = { ...process.env, NODE_ENV: "production" };
  const devProcess = spawn(npmBin, ["run", "start"], { stdio: "inherit", shell: true, env });

  devProcess.on("error", (err) => {
    console.error("Failed to start dev server:", err.message);
    process.exit(1);
  });

  const ready = await waitForServer();
  if (!ready) {
    console.error("Dev server failed to start or health check timed out.");
    devProcess.kill();
    process.exit(1);
  }

  let failed = false;
  const runStep = (name, cmd, args) => {
    console.log(`\n========================================`);
    console.log(`RUNNING STEP: ${name}`);
    console.log(`========================================`);
    const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
    if (res.status !== 0) {
      console.error(`❌ STEP FAILED: ${name}`);
      failed = true;
    } else {
      console.log(`✅ STEP PASSED: ${name}`);
    }
  };

  try {
    // 1. Audit Package/Security/Modules
    runStep("Audit All Checks", npmBin, ["run", "audit:all"]);

    // 2. Comprehensive API Test
    runStep("Comprehensive API Tests", "node", ["scripts/comprehensive-api-test.cjs"]);

    // 3. Playwright E2E tests
    runStep("Playwright E2E Tests", npxBin, ["playwright", "test"]);
  } catch (e) {
    console.error("Error during test runner execution:", e.message);
    failed = true;
  } finally {
    console.log("\nStopping dev server...");
    devProcess.kill();
    killPort3000(); // double check to prevent hanging node/tsx process
  }

  if (failed) {
    console.log("\n❌ CI PIPELINE FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 CI PIPELINE PASSED! ALL TESTS GREEN.");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Fatal test runner error:", err.message);
  process.exit(1);
});
