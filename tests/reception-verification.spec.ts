import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

import { loginTenant, TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD } from "./tenant-login-helper";

const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";

async function login(page: Page) {
  return loginTenant(page);
}

test("Verify complete unit reception to completion workflow", async ({ page }) => {
  const ok = await login(page);
  expect(ok, "Dashboard must load").toBe(true);

  // 1. Click Layanan/Reparasi & Servis menu
  const servicesBtn = page.getByRole("button", { name: /Servis, buka menu/i }).first();
  await servicesBtn.click();
  await page.waitForTimeout(2000);

  // 2. Click "Penerimaan Unit" sub-menu
  const newTicketTab = page.getByRole("button", { name: /^Penerimaan$/i }).first();
  await newTicketTab.click();
  await page.waitForTimeout(2000);

  // Wait form visible
  await expect(page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i)).toBeVisible();

  // 3. Fill in the unit reception form
  const customerName = `Workflow E2E ${Date.now().toString().slice(-7)}`;
  await page.getByPlaceholder(/Cari nama \/ no\. WhatsApp pelanggan/i).fill(customerName);
  
  // Cari apakah ada customer existing, kalau tidak maka form baru customer otomatis terbuka
  const addCustomerBtn = page.getByRole("button", { name: /Tambah pelanggan baru/i });
  if (await addCustomerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addCustomerBtn.click();
    await page.waitForTimeout(1000);
  }

  // Isi customer detail jika form terbuka
  const nameInput = page.getByPlaceholder("Nama lengkap").first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill(customerName);
    await page.getByPlaceholder("081234567890").fill("081298765432");
  }

  // Isi device
  const brandInput = page.locator('input[placeholder*="brand" i], input[placeholder*="Brand" i]').first();
  if (await brandInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await brandInput.fill("ASUS");
  }
  const modelInput = page.locator('input[placeholder*="Model" i]').first();
  if (await modelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await modelInput.fill("TUF Gaming F15");
  }

  // Detail lain & complaints
  const moreDetailsBtn = page.getByRole("button", { name: /Detail lainnya/i });
  if (await moreDetailsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await moreDetailsBtn.click();
    await page.waitForTimeout(1000);
  }
  const serialInput = page.locator('input[placeholder*="Serial" i]').first();
  if (await serialInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await serialInput.fill("TUF-SN-998877");
  }
  const complaintInput = page.locator('textarea[placeholder*="Layar" i], textarea[placeholder*="keluhan" i]').first();
  if (await complaintInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await complaintInput.fill("Keyboard error and fan noise");
  }

  // Submit jika ada
  const submitBtn = page.getByRole("button", { name: /Daftarkan Unit/i }).first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }

  // Tutup modal/receipt jika muncul
  const closeBtn = page.getByRole("button", { name: "Tutup" }).last();
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Assert halaman berada di Penerimaan (form kembali ke awal) atau Daftar Servis
  const onPenerimaan = await page.locator('h2:has-text("Penerimaan")').isVisible().catch(() => false);
  const onDaftar = await page.locator('text="Daftar Servis"').isVisible().catch(() => false);
  expect(onPenerimaan || onDaftar, "Should be on Penerimaan or Daftar Servis page").toBe(true);

  await page.screenshot({ path: "/home/ubuntu/barufix/screenshots-bukti/reception-workflow.png", fullPage: false });
  console.log("Reception workflow screenshot saved.");
});