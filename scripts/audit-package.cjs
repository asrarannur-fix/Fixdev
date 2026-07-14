#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('FAILED: package.json tidak ditemukan.');
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  console.error('FAILED: package.json tidak valid JSON.');
  process.exit(1);
}

const required = ['lint', 'build'];
let failed = 0;
for (const s of required) {
  if (!pkg.scripts || !pkg.scripts[s]) {
    console.error(`FAILED: script wajib "${s}" belum ada.`);
    failed++;
  }
}

// Validate script targets directly from the object
const validTargets = {};
const scripts = pkg.scripts || {};

// Known npm commands that don't need a file reference
const npmBuiltins = ['npm', 'tsc', 'vite', 'prettier', 'tsx', 'esbuild'];

const refRegex = /^node\s+(scripts\/[^\s"']+)/;
for (const [name, cmd] of Object.entries(scripts)) {
  const cmdStr = String(cmd);
  // Only check 'node scripts/...' patterns
  const m = cmdStr.match(refRegex);
  if (m) {
    const rel = m[1].replace(/"/g, '');
    if (!fs.existsSync(path.join(process.cwd(), rel))) {
      console.error(`FAILED: script '${name}' refers to missing: ${rel}`);
      failed++;
    }
  }
}

if (failed > 0) process.exit(1);
console.log('PASS: package.json baseline terlihat valid.');
