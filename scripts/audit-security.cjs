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

// Security audit targets frontend code under src/ (excluding backend server.ts and docs)
const files = walk(path.join(process.cwd(), 'src'));
const forbiddenFrontend = [
  [/SUPABASE_SERVICE_ROLE_KEY/i, 'SUPABASE_SERVICE_ROLE_KEY di-reference di frontend'],
  [/sk_live_[a-z0-9]/i, 'Payment secret live key hardcoded di frontend'],
  [/eyJ[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{30,}/, 'JWT/token private hardcoded di frontend'],
];

let failed = 0;
for (const f of files) {
  const rel = path.relative(process.cwd(), f);
  // Allow auth.middleware.ts and server-side files as they run on backend Node.js
  if (rel.includes('auth.middleware.ts') || rel.split(path.sep).includes('server')) continue;
  const txt = fs.readFileSync(f, 'utf8');
  for (const [re, label] of forbiddenFrontend) {
    if (re.test(txt)) {
      console.error(`FAILED: ${label} ditemukan di ${rel}`);
      failed++;
    }
  }
}

if (!fs.existsSync(path.join(process.cwd(), '.env.example'))) {
  console.warn('WARNING: .env.example tidak ditemukan.');
}

if (failed) process.exit(1);
console.log('PASS: tidak ada secret fatal bocor ke kode frontend src/.');

