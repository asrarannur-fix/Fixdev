import { test, expect } from "@playwright/test";

test("login production as owner", async ({ page }) => {
  const email = process.env.TEST_TENANT_EMAIL || "";
  const password = process.env.TEST_TENANT_PASSWORD || "";
  test.skip(!email || !password, "TEST_TENANT_EMAIL and TEST_TENANT_PASSWORD are required");

  console.log("Navigating to production site https://fixdev.web.id ...");
  await page.goto("https://fixdev.web.id", { waitUntil: "networkidle", timeout: 45000 });

  console.log("Looking for Login button...");
  // Di LandingPage, tombol masuk mengaktifkan modal login
  const loginTrigger = page.locator('button:has-text("Masuk Sebagai Owner / Staff"), button:has-text("Masuk")').first();
  await loginTrigger.click();

  console.log("Waiting for login form...");
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  console.log("Filling login credentials...");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  
  // Ambil tombol submit dalam form login
  const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk")').first();
  await submitBtn.click();

  console.log("Waiting for dashboard app container...");
  await page.waitForSelector("#main-app-container", { timeout: 45000 });

  console.log("Login successful! Saving screenshot evidence...");
  await page.screenshot({ path: "test-results/prod-login-success.png", fullPage: true });
  console.log("Evidence saved to test-results/prod-login-success.png");
});