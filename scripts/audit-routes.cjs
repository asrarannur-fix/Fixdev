#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item.name)) continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(process.cwd(), 'src')).concat(walk(path.join(process.cwd(), 'server')));
if (!files.length) {
  console.error('FAILED: Tidak ada file source untuk audit route.');
  process.exit(1);
}
const text = files.map(f => fs.readFileSync(f, 'utf8')).join('\n').toLowerCase();

const routeTerms = ['route', 'path', 'navigate', 'router', 'app.get', 'app.post'];
if (!routeTerms.some(t => text.includes(t))) {
  console.warn('WARNING: Tidak banyak indikasi route/router terdeteksi. Mungkin app memakai tab-state, cek manual.');
}

const important = ['service', 'servis', 'pos', 'inventory', 'stok', 'settings', 'pengaturan', 'report', 'laporan'];
const missing = important.filter(t => !text.includes(t));
if (missing.length > 4) {
  console.error('FAILED: Banyak route/keyword halaman penting tidak terdeteksi:', missing.join(', '));
  process.exit(1);
}

console.log('PASS: audit route dasar selesai. Tetap cek manual route guard dan role access.');
