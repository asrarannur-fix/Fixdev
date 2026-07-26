import { test, expect } from "@playwright/test";

test("Data Manager loads", async ({ page, request }) => {
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
  const res = await request.post(`${base}/api/auth/login`, { data: { email: process.env.TEST_OWNER_EMAIL || "devtes1@mail.com", password: process.env.TEST_OWNER_PASSWORD || "778877" } });
  const body = await res.json();
  expect(res.ok()).toBeTruthy();
  await page.goto(`${base}/`);
  await page.evaluate((token) => localStorage.setItem("fixdev_token", token), body.token);
  await page.reload();
  await page.getByRole("button", { name: /Data Manager/ }).click();
  await expect(page.getByText("Pilih jenis data master untuk dikelola.")).toBeVisible();
  await expect(page.getByText("Pelanggan", { exact: true }).first()).toBeVisible();
  await page.locator("#tenant-view-wrapper").getByRole("button", { name: "Supplier" }).click();
  await page.locator("#tenant-view-wrapper").getByRole("button", { name: "Tambah" }).click();
  const name = `Supplier E2E ${Date.now()}`;
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").first().fill(name);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/crud/suppliers") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Tambah" }).click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page.getByText(name)).toBeVisible();
});
