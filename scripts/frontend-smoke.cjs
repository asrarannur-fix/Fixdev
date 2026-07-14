#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const http = require("http");

const BASE_URL = "http://localhost:3000";

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

async function main() {
  console.log("=== FIXDEV Frontend Smoke Test ===");
  try {
    const { status, data } = await get(BASE_URL);
    if (status !== 200) {
      console.error(`FAIL: Root page returned status ${status}`);
      process.exit(1);
    }
    if (!data.includes('id="root"')) {
      console.error("FAIL: HTML does not contain root div");
      process.exit(1);
    }
    if (data.includes("vite-error-overlay") || data.includes("error-overlay")) {
      console.error("FAIL: Vite error overlay detected in html");
      process.exit(1);
    }
    console.log("PASS: Frontend basic HTML renders correctly.");
  } catch (err) {
    console.error("FAIL: Could not fetch root page:", err.message);
    process.exit(1);
  }
}

main();
