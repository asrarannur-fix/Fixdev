#!/usr/bin/env node
const { spawnSync } = require('child_process');

const checks = [
  ['audit:package', 'node', ['scripts/audit-package.cjs']],
  ['audit:modules', 'node', ['scripts/audit-modules.cjs']],
  ['audit:navigation', 'node', ['scripts/audit-navigation.cjs']],
  ['audit:routes', 'node', ['scripts/audit-routes.cjs']],
  ['audit:ui', 'node', ['scripts/audit-ui.cjs']],
  ['audit:security', 'node', ['scripts/audit-security.cjs']],
  ['audit:production', 'node', ['scripts/audit-production-readiness.cjs']],
];

let failed = 0;
for (const [name, cmd, args] of checks) {
  console.log(`\n=== ${name} ===`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    failed++;
    console.error(`FAILED: ${name}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

if (failed > 0) {
  console.error(`\nAudit selesai dengan ${failed} kegagalan.`);
  process.exit(1);
}
console.log('\nSemua audit PASS.');
