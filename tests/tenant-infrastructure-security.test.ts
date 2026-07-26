import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(file), 'utf8');

test('tenant settings redact secrets and require domain permission on reads', () => {
  const routes = read('src/server/routes/tenant.routes.ts');
  const controller = read('src/server/controllers/settings.controller.ts');
  assert.match(routes, /settings\/:domain[\s\S]*?requireSettingsDomain\(\)[\s\S]*?getSettingsDomain/);
  assert.match(controller, /for \(const field of SECRET_FIELDS\[resolved\] \|\| \[\]\) delete value\[field\]/);
  assert.match(controller, /for \(const field of SECRET_FIELDS\[domain\] \|\| \[\]\) delete value\[field\]/);
});

test('tenant scope validates lifecycle and assigned branch', () => {
  const middleware = read('src/middleware/auth.middleware.ts');
  assert.match(middleware, /TENANT_BILLING_REQUIRED/);
  assert.match(middleware, /Akses cabang tidak diizinkan/);
  assert.match(middleware, /user_branches/);
});

test('rental mutations require feature and privileged roles', () => {
  const routes = read('src/server/routes/rental.routes.ts');
  assert.match(routes, /router\.use\(requireFeature\('RENTAL'\)\)/);
  assert.match(routes, /router\.post\('\/contracts', requireRoles\('OWNER', 'ADMIN', 'MANAGER'\)/);
  assert.match(routes, /router\.post\('\/payments', requireRoles\('OWNER', 'ADMIN', 'MANAGER', 'KASIR'\)/);
});
