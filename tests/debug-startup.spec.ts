import { test, expect } from "@playwright/test";
import { loginTenant } from "./tenant-login-helper";

test("debug login with fixed localstorage injection", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.log(`[UNCAUGHT ERROR] ${err.message}\n${err.stack}`);
  });

  console.log("Starting loginTenant...");
  const ok = await loginTenant(page);
  console.log("LoginTenant result:", ok);

  if (!ok) {
    await page.screenshot({ path: "test-results/startup-debug.png", fullPage: true });
    console.log("Screenshot saved to test-results/startup-debug.png");
  }

  expect(ok).toBe(true);
});