#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = ['src', 'app', 'server', 'pages', 'components'].filter(r => fs.existsSync(path.join(process.cwd(), r)));
if (!roots.length) {
  console.error('FAILED: Tidak menemukan folder source umum seperti src/app/server/pages/components.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item.name)) continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|json|md)$/.test(item.name)) out.push(p);
  }
  return out;
}

const files = roots.flatMap(r => walk(path.join(process.cwd(), r)));
const haystack = files.map(f => fs.readFileSync(f, 'utf8')).join('\n').toLowerCase();

const requiredGroups = [
  ['service/servis/tiket', ['servis', 'service', 'tiket']],
  ['pos/kasir', ['pos', 'kasir', 'checkout']],
  ['inventory/stok', ['inventory', 'stok', 'stock']],
  ['customer/pelanggan', ['customer', 'pelanggan']],
  ['supplier/pemasok', ['supplier', 'pemasok']],
  ['finance/keuangan', ['finance', 'keuangan', 'kas']],
  ['accounting/akuntansi', ['accounting', 'akuntansi', 'jurnal', 'coa']],
  ['report/laporan', ['report', 'laporan']],
  ['settings/pengaturan', ['settings', 'pengaturan']],
  ['whatsapp/wa', ['whatsapp', 'wa template', 'wa']],
  ['telegram', ['telegram']],
  ['voucher', ['voucher', 'kupon']],
  ['poin/loyalty/royalty', ['poin', 'point', 'loyalty', 'royalty']],
  ['trade-in/tukar tambah', ['trade-in', 'tradein', 'tukar tambah']],
  ['branch/cabang', ['branch', 'cabang']],
  ['tenant', ['tenant']],
  ['billing/subscription', ['billing', 'subscription', 'langganan']],
  ['audit log', ['audit']],
];

const missing = [];
for (const [label, terms] of requiredGroups) {
  if (!terms.some(t => haystack.includes(t.toLowerCase()))) missing.push(label);
}

if (missing.length) {
  console.error('FAILED: Modul/keyword penting tidak terdeteksi di source. Cek apakah benar hilang atau istilahnya berbeda:');
  for (const m of missing) console.error(`- ${m}`);
  process.exit(1);
}

console.log('PASS: keyword modul utama terdeteksi. Tetap cek manual MODULE_REGISTRY.md untuk kelengkapan bisnis.');
