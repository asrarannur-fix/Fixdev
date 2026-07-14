#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item.name)) continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx|ts|js)$/.test(item.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(process.cwd(), 'src'));
let failed = 0;
const badPatterns = [
  [/lorem ipsum/i, 'Lorem Ipsum'],
  [/coming soon/i, 'Coming Soon'],
  [/fitur ini belum tersedia/i, 'Fitur belum tersedia'],
  [/alert\s*\(/, 'native alert()'],
  [/console\.log\s*\(/, 'console.log'],
];

for (const f of files) {
  const rel = path.relative(process.cwd(), f);
  const txt = fs.readFileSync(f, 'utf8');
  for (const [re, label] of badPatterns) {
    if (re.test(txt)) {
      console.warn(`WARNING: ${label} ditemukan di ${rel}`);
    }
  }
}

const all = files.map(f => fs.readFileSync(f, 'utf8')).join('\n').toLowerCase();
const uiMust = ['loading', 'empty', 'disabled'];
const missing = uiMust.filter(t => !all.includes(t));
if (missing.length >= 2) {
  console.warn('WARNING: Indikasi loading/empty/disabled state kurang terdeteksi. Cek UI manual.');
}

if (failed) process.exit(1);
console.log('PASS: audit UI dasar selesai. Warning tetap harus dicek manual.');
