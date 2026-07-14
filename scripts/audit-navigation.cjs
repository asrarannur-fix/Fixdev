#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const candidates = [
  'src/config/nav.config.ts',
  'src/config/navigation.ts',
  'src/navigation.ts',
  'src/components/layout/Sidebar.tsx',
  'src/components/Sidebar.tsx',
  'src/App.tsx'
];

const existing = candidates.filter(p => fs.existsSync(path.join(process.cwd(), p)));
if (!existing.length) {
  console.error('FAILED: File navigasi/sidebar umum tidak ditemukan. Tambahkan audit manual untuk navigasi.');
  process.exit(1);
}

let text = '';
for (const f of existing) text += '\n// FILE: ' + f + '\n' + fs.readFileSync(path.join(process.cwd(), f), 'utf8');

const lower = text.toLowerCase();
const roles = ['owner', 'admin', 'kasir', 'teknisi', 'customer', 'superadmin', 'super admin', 'manager'];
const missingRoles = roles.filter(r => !lower.includes(r));

const requiredMenus = ['dashboard', 'servis', 'pos', 'stok', 'inventory', 'laporan'];
const missingMenus = requiredMenus.filter(m => !lower.includes(m));
if (!lower.includes('pengaturan') && !lower.includes('settings')) {
  missingMenus.push('pengaturan/settings');
}

let failed = 0;
if (missingRoles.length > 3) {
  console.error('FAILED: Banyak role tidak terdeteksi di konfigurasi navigasi:', missingRoles.join(', '));
  failed++;
}
if (missingMenus.length) {
  console.error('FAILED: Menu dasar tidak terdeteksi:', missingMenus.join(', '));
  failed++;
}

const labelMatches = [...text.matchAll(/(?:label|title|name)\s*:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1].trim().toLowerCase());
const counts = {};
for (const l of labelMatches) counts[l] = (counts[l] || 0) + 1;
const duplicates = Object.entries(counts).filter(([k, v]) => v > 5 && k.length > 2);
if (duplicates.length) {
  console.warn('WARNING: Beberapa label muncul sangat sering. Cek kemungkinan menu double:');
  for (const [k, v] of duplicates) console.warn(`- ${k}: ${v}x`);
}

if (failed) process.exit(1);
console.log('PASS: navigasi dasar terdeteksi. Cek manual ROLE_MENU_MATRIX.md untuk akses per role.');
