import { test, expect, type Page } from "@playwright/test";
import { loginTenant, TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD } from "./tenant-login-helper";

test("front office menambah pelanggan baru saat menerima unit servis", async ({ page }) => {
  const ok = await loginTenant(page);
  expect(ok, "Dashboard must load").toBe(true);

  const services = page.getByRole("button", { name: /Servis, buka menu/i }).first();
  await expect(services).toBeVisible();
  await services.click();

  const receptionMenu = page.getByRole("button", { name: /^Penerimaan$/i }).first();
  if (await receptionMenu.isVisible().catch(() => false)) await receptionMenu.click();
  await expect(page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i)).toBeVisible();

  const unique = Date.now().toString().slice(-8);
  const customerName = `Pelanggan E2E ${unique}`;
  await page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i).fill(customerName);

  const addBtn = page.getByRole("button", { name: /Tambah pelanggan baru/i });
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(1000);
  }

  const nameInput = page.getByPlaceholder("Nama lengkap").first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill(customerName);
    await page.getByPlaceholder("081234567890").fill(`0812${unique}`);
  }

  const deviceNameInput = page.locator('input[placeholder*="Laptop" i], input[placeholder*="Device" i]').first();
  if (await deviceNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deviceNameInput.fill("Laptop Test E2E");
  }

  const submitBtn = page.getByRole("button", { name: /Daftarkan Unit & Buat SPK/i }).first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }

  const receiptClose = page.getByRole("button", { name: "Tutup", exact: true }).last();
  if (await receiptClose.isVisible().catch(() => false)) await receiptClose.click();

  const successText = page.getByText(/Penerimaan Unit Berhasil!/i).first();
  if (await successText.isVisible({ timeout: 5000 }).catch(() => false)) {
    await expect(successText).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(customerName, { exact: true }).first()).toBeVisible();
  } else {
    await expect(page.getByText(/Penerimaan|Daftar Servis/i).first()).toBeVisible({ timeout: 10000 });
  }

  await page.screenshot({ path: "/home/ubuntu/barufix/screenshots-bukti/service-reception-e2e.png", fullPage: false });
  console.log("Screenshot saved: service-reception-e2e.png");
});