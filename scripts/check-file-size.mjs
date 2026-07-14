// Guard refactor: cegah file god-component makin parah.
// `npm run lint` di repo ini = tsc --noEmit (bukan ESLint), jadi guard ini
// dijalankan lewat `npm run check:size` dan bisa dipasang di pre-commit/CI.
//
// Aturan:
//  - File .ts/.tsx di src/ yang LEBIH dari MAX_LINES akan gagal,
//    KECUALI masuk allowlist (file raksasa yang masih dalam proses pemecahan).
//  - Tujuannya mencegah regresi: file BARU tidak boleh melebihi batas.
//
// Jalankan: node scripts/check-file-size.mjs [maxLines]

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, normalize } from "node:path";

// normalisasi: allowlist pakai "/" (POSIX) tapi di Windows walk menghasilkan "\".
const norm = (p) => normalize(p).replace(/\\/g, "/");

const MAX_LINES = Number(process.argv[2] || 600);

// File yang sudah raksasa dan sedang/sudah dalam tahap pemecahan.
// Hapus satu per satu dari sini SETELAH berhasil dipecah + lint+build hijau.
const ALLOW_LIST = new Set([
  "src/components/tenant/ServicesTab.tsx",
  "src/context/SaaSContext.tsx",
  "src/components/tenant/SettingsTab.tsx",
  "src/components/CustomerPortal.tsx",
  "src/components/WhatsAppConnector.tsx",
  "src/components/tenant/HRTab.tsx",
  "src/components/tenant/InventoryTab.tsx",
  "src/components/SaaSSubscription.tsx",
  "src/components/AssetManager.tsx",
  "src/components/MarketplaceHub.tsx",
  "src/components/TechnicianOverview.tsx",
  "src/mocks/seedData.ts",
  "src/components/DeveloperApiManager.tsx",
  "src/components/OfflineSyncModal.tsx",
  "src/components/WarrantyClaims.tsx",
  "src/components/tenant/inventory/TransferPanel.tsx",
  "src/components/SmallPartsSearch.tsx",
  "src/types/index.ts",
  "src/components/tenant/services/DocumentPrintouts.tsx",
  "src/components/tenant/AccountingTab.tsx",
  "src/server/controllers/pos.controller.ts",
  "src/server/controllers/apiV1.controller.ts",
  "src/server/controllers/serviceWorkflow.controller.ts",
  "src/server/controllers/superadmin.controller.ts",
  "src/components/layout/CommandPalette.tsx",
  "src/components/tenant/POSTab.tsx",
  "src/components/ServiceTrackerQr.tsx",
  "src/components/DeviceRentalDashboard.tsx",
  "src/server/routes/apiV1.routes.ts",
  "src/components/tenant/services/TicketEditorDock.tsx",
  "src/components/tenant/inventory/StockListPanel.tsx",
  "src/components/tenant/hr/attendance/EmployeeAuditPanel.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/RBACManager.tsx",
  "src/components/superadmin/TenantsManager.tsx",
  "src/components/B2BPipeline.tsx",
  "src/components/CustomerActivityFeed.tsx",
  "src/components/CannibalWorkshop.tsx",
  "src/server/controllers/billing.controller.ts",
  "src/components/FieldServiceGps.tsx",
]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if ([".ts", ".tsx"].includes(extname(full))) acc.push(full);
  }
  return acc;
}

const files = walk("src");
const violations = [];
for (const f of files) {
  const nf = norm(f);
  if (ALLOW_LIST.has(nf)) continue;
  const lines = readFileSync(f, "utf8").split("\n").length;
  if (lines > MAX_LINES) violations.push({ f, lines });
}

if (violations.length) {
  console.error(`\n[check-file-size] GAGAL: ${violations.length} file melebihi ${MAX_LINES} baris:\n`);
  for (const v of violations.sort((a, b) => b.lines - a.lines)) {
    console.error(`  ${v.lines.toString().padStart(5)}  ${v.f}`);
  }
  console.error(
    `\nTambahkan ke ALLOW_LIST hanya jika memang sedang dipecah, atau pecah file tersebut.`,
  );
  process.exit(1);
}

console.log(
  `[check-file-size] OK: tidak ada file baru (>${MAX_LINES} baris) di luar allowlist.`,
);
