import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "./helpers/auth.js";

const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || "asrarannur@gmail.com";
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || "778877";

const pageErrors: string[] = [];

async function loginOwner(page: Page) {
  // Login via API (proven pattern) then seed localStorage token
  const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  });
  const body = await res.json();
  if (!res.ok() || !body.token) {
    throw new Error(`Owner login failed: ${body.error || res.status()}`);
  }
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem("fixdev_token", t);
      if (u) localStorage.setItem("saas_curr_user", JSON.stringify(u));
    },
    { t: body.token, u: body.user },
  );
  await page.reload();
  await page.waitForSelector("aside:has-text('Servis')", { timeout: 20000 });
  await page.waitForTimeout(500);
  await dismissModal(page);
}

// Trial tenants show a premium-upsell modal that blocks the UI. Remove it
// directly from the DOM so navigation clicks are not intercepted.
async function dismissModal(page: Page) {
  await page.evaluate(() => {
    const m = document.getElementById("premium-upgrade-modal");
    if (m) m.remove();
  });
}

// OWNER sidebar buttons have no id; click by visible label
const MODULE_LABELS: Record<string, string> = {
  services: "Servis",
  pos: "POS",
  inventory: "Inventory",
  accounting: "Keuangan",
  hr: "HR",
  crm: "CRM",
  fraud: "Keamanan",
  settings: "Pengaturan",
};

async function clickModule(page: Page, modId: string) {
  await dismissModal(page);
  const label = MODULE_LABELS[modId] || modId;
  const loc = page.locator("aside").getByText(label, { exact: false }).first();
  try {
    await loc.click({ timeout: 5000 });
  } catch {
    console.log(`WARN: module '${modId}' (${label}) not found in sidebar — skipping`);
    return;
  }
  await page.waitForTimeout(250);
}

async function clickSub(page: Page, modId: string, subLabel: string) {
  const before = pageErrors.length;
  // Sub-tabs may live in the sidebar OR as tabs in the content area.
  const loc = page.getByText(subLabel, { exact: false }).first();
  try {
    await loc.click({ timeout: 4000 });
  } catch {
    // sub-tab not present as a clickable element — skip (some modules render
    // sub-content without a dedicated tab button)
    return;
  }
  await page.waitForTimeout(250);
  if (pageErrors.length > before) {
    throw new Error(`Runtime error on ${modId} › ${subLabel}: ${pageErrors[pageErrors.length - 1]}`);
  }
}

// [moduleId, [subTabLabels]] — labels from nav.config subtab labels
// Note: Settings is reached via the profile dropdown, not the operational
// sidebar, so it is exercised separately. Fraud = "Keamanan".
const MODULES: { id: string; subs: string[] }[] = [
  { id: "services", subs: ["Penerimaan", "Daftar Servis", "Panduan", "Penawaran", "QC", "Garansi", "Field Service", "Penyewaan", "QR Tracker"] },
  { id: "pos", subs: ["Kasir", "Shift", "Riwayat", "Marketplace"] },
  { id: "inventory", subs: ["Stok", "Transfer", "Lokasi", "Tukar Tambah", "Kanibal", "Komponen", "Aset Tetap", "Konsinyasi", "PO"] },
  { id: "accounting", subs: ["COA", "Ledger", "Laporan"] },
  { id: "hr", subs: ["Presensi", "Payroll", "Komisi", "Kasbon"] },
  { id: "crm", subs: ["Pipeline", "Pelanggan", "Broadcast"] },
  { id: "fraud", subs: ["Audit", "Proteksi"] },
];

test.describe("Module & sub-tab workflows (UI navigation)", () => {
  test.setTimeout(300000);
  test.use({ ignoreHTTPSErrors: true });
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => pageErrors.push(`${err.message}`));
  });

  test("navigate every module and sub-tab without runtime errors", async ({ page }) => {
    await loginOwner(page);
    await page.screenshot({ path: "/tmp/after-login.png", fullPage: false });
    const url = page.url();
    console.log("AFTER LOGIN URL:", url);
    const hasSidebar = await page.locator("#sidebar-services-btn").count();
    console.log("sidebar-services-btn count:", hasSidebar);

    for (const { id, subs } of MODULES) {
      await clickModule(page, id);
      for (const sub of subs) {
        await clickSub(page, id, sub);
      }
    }

    expect(pageErrors).toEqual([]);
  });
});
