#!/usr/bin/env node
/*
  FIXDEV Production Control Pack Installer
  - Copies control pack files into the project root
  - Safely merges npm scripts into package.json without deleting existing scripts
  - Creates backups before overwriting important files
*/
const fs = require('fs');
const path = require('path');

const installerRoot = path.resolve(__dirname, '..');
const packDir = path.join(installerRoot, 'control-pack-files');
const argTarget = process.argv[2];
const targetRoot = path.resolve(argTarget || process.cwd());

const requiredProjectFiles = ['package.json'];
const missingProjectFiles = requiredProjectFiles.filter((file) => !fs.existsSync(path.join(targetRoot, file)));

function log(message) { console.log(`[FIXDEV INSTALL] ${message}`); }
function warn(message) { console.warn(`[FIXDEV WARNING] ${message}`); }
function fail(message) { console.error(`[FIXDEV ERROR] ${message}`); process.exit(1); }

function copyFileWithBackup(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    const incoming = fs.readFileSync(src, 'utf8');
    if (existing === incoming) {
      return 'same';
    }
    const backup = `${dest}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(dest, backup);
  }
  fs.copyFileSync(src, dest);
  return 'copied';
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

if (!fs.existsSync(packDir)) fail(`Folder control-pack-files tidak ditemukan: ${packDir}`);

if (missingProjectFiles.length) {
  fail(`Target bukan root proyek FIXDEV karena tidak ditemukan: ${missingProjectFiles.join(', ')}. Jalankan installer dari folder yang berisi package.json, atau pakai: node tools/install-control-pack.cjs "C:\\path\\ke\\fixdev"`);
}

log(`Target root proyek: ${targetRoot}`);

const filesToCopy = walk(packDir).filter((file) => {
  const rel = path.relative(packDir, file).replace(/\\/g, '/');
  // Snippet tetap disalin sebagai referensi, tapi package.json dipatch otomatis.
  return !rel.includes('__MACOSX');
});

let copied = 0;
let same = 0;
for (const src of filesToCopy) {
  const rel = path.relative(packDir, src);
  const dest = path.join(targetRoot, rel);
  const status = copyFileWithBackup(src, dest);
  if (status === 'copied') copied += 1;
  else same += 1;
}
log(`File control pack dipasang. Copied/updated: ${copied}, unchanged: ${same}`);

const packageJsonPath = path.join(targetRoot, 'package.json');
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (err) {
  fail(`package.json tidak valid JSON: ${err.message}`);
}

const scriptPatch = {
  "validate": "npm run lint && npm run build",
  "audit:all": "node scripts/audit-all.js",
  "audit:package": "node scripts/audit-package.js",
  "audit:modules": "node scripts/audit-modules.js",
  "audit:navigation": "node scripts/audit-navigation.js",
  "audit:routes": "node scripts/audit-routes.js",
  "audit:ui": "node scripts/audit-ui.js",
  "audit:security": "node scripts/audit-security.js",
  "audit:production": "node scripts/audit-production-readiness.js",
  "preflight:production": "npm run validate && npm run audit:all && npm run audit:production"
};

pkg.scripts = pkg.scripts || {};
const changedScripts = [];
const keptScripts = [];
for (const [name, command] of Object.entries(scriptPatch)) {
  if (pkg.scripts[name] === command) {
    keptScripts.push(name);
    continue;
  }
  // Jangan timpa lint/build/test yang sudah ada selain validate/audit scripts.
  pkg.scripts[name] = command;
  changedScripts.push(name);
}

const packageBackup = `${packageJsonPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(packageJsonPath, packageBackup);
fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
log(`package.json berhasil dipatch. Backup: ${path.basename(packageBackup)}`);
log(`Scripts updated: ${changedScripts.length ? changedScripts.join(', ') : '-'}; unchanged: ${keptScripts.length ? keptScripts.join(', ') : '-'}`);

const requiredScripts = [
  'scripts/audit-all.js',
  'scripts/audit-package.js',
  'scripts/audit-modules.js',
  'scripts/audit-navigation.js',
  'scripts/audit-routes.js',
  'scripts/audit-ui.js',
  'scripts/audit-security.js',
  'scripts/audit-production-readiness.js'
];
const missingScripts = requiredScripts.filter((file) => !fs.existsSync(path.join(targetRoot, file)));
if (missingScripts.length) {
  fail(`Installer selesai sebagian, tapi file audit ini belum ada: ${missingScripts.join(', ')}`);
}

log('INSTALL SELESAI. Jalankan: npm run preflight:production');
log('Catatan: kalau preflight gagal, proyek BELUM boleh disebut production ready. Perbaiki P0/P1 dulu.');
