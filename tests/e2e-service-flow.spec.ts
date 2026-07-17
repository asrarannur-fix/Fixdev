import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import { TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD } from "./tenant-login-helper";

const TID = "bd7725f3-02cf-4944-bdc9-80ba642a2c55";
const ART = "C:/Users/Administrator/.gemini/antigravity-ide/brain/16c61fbf-05a3-4d42-9390-660edbf1cd18";

async function login(page: Page) {
  await page.goto("http://localhost:3000");
  await page.waitForSelector("#root", { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const mainApp = page.locator("#main-app-container");
  if (await mainApp.isVisible().catch(() => false)) return;

  const portal = page.getByRole("button", { name: /^Masuk$/i }).first();
  if (await portal.isVisible({ timeout: 5000 }).catch(() => false)) {
    await portal.click();
    await page.waitForTimeout(1000);
  }

  const email = page.locator('input[type="email"], input[placeholder*="email"]').first();
  if (await email.isVisible({ timeout: 5000 }).catch(() => false)) {
    await email.fill(TEST_TENANT_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_TENANT_PASSWORD);
    await page.getByRole("button", { name: /Masuk/i }).last().click();
    await page.waitForTimeout(5000);
  }
}

test("Service flow - navigate and capture screenshots", async ({ page }) => {
  await login(page);
  await page.screenshot({ path: path.join(ART, "debug_01_after_login.png"), fullPage: true });

  // Click Reparasi & Servis
  const srvBtn = page.locator('text="Reparasi & Servis"').first();
  if (await srvBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await srvBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(ART, "debug_02_after_services_click.png"), fullPage: true });

  // Click Daftar Servis submenu
  const daftarBtn = page.locator('text="Daftar Servis"').first();
  if (await daftarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await daftarBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(ART, "debug_03_daftar_servis.png"), fullPage: true });

  // Get all visible text to find any ticket
  const bodyText = await page.locator("body").textContent();
  const ticketMatches = bodyText?.match(/TKT[^ ]{5,20}|SRV[^ ]{5,20}/g);
  console.log("Found ticket patterns:", ticketMatches);

  // Try to click first visible ticket row/button in service list
  const firstTicket = page.locator('button:has-text("TKT"), button:has-text("SRV"), a:has-text("TKT"), a:has-text("SRV")').first();
  if (await firstTicket.isVisible({ timeout: 3000 }).catch(() => false)) {
    const ticketText = await firstTicket.textContent();
    console.log("Clicking ticket:", ticketText);
    await firstTicket.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ART, "debug_04_ticket_detail.png"), fullPage: true });
  } else {
    console.log("No ticket button found. Trying card/tile approach...");
    // Maybe ticket is displayed as a card, not a button
    const cards = page.locator('[class*="ticket"], [class*="card"], tr').filter({ hasText: "TKT" });
    const cardCount = await cards.count();
    console.log("Cards with TKT:", cardCount);
    if (cardCount > 0) {
      await cards.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(ART, "debug_04_ticket_card.png"), fullPage: true });
    }
  }

  // Try Setujui Digital if visible
  const approveBtn = page.locator('button:has-text("Setujui Digital")').first();
  if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ART, "debug_05_after_approve.png"), fullPage: true });

    const qcBtn = page.locator('button:has-text("Buka Panel Quality Control")').first();
    if (await qcBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await qcBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ART, "debug_06_qc_panel.png"), fullPage: true });

      const lolosBtn = page.locator('button:has-text("Lolos QC")').first();
      if (await lolosBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lolosBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(ART, "debug_07_after_qc.png"), fullPage: true });
      }
    }
  }

  await page.screenshot({ path: path.join(ART, "debug_99_final.png"), fullPage: true });
  console.log("Debug screenshots saved.");
});
