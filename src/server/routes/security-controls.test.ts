import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routes = readFileSync(new URL('./billing.routes.ts', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../controllers/auth.controller.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../../../server.ts', import.meta.url), 'utf8');
const migrate = readFileSync(new URL('../../../scripts/migrate.ts', import.meta.url), 'utf8');

describe('P0/P1 security controls', () => {
  it('locks global billing configuration and payment settings to superadmin edit console', () => {
    for (const path of [
      '/invoice-template',
      '/gateway-config',
      '/telegram-manual-payment-config',
      '/manual-payment-config',
      '/manual-payment-config/qris-upload',
    ]) {
      const route = routes.slice(routes.indexOf(`'${path}'`), routes.indexOf(');', routes.indexOf(`'${path}'`)));
      expect(route).toContain("requireSuperAdminPermission('billing:");
      expect(route).toContain('requireSuperAdminConsoleSession');
    }
  });

  it('revokes reset target sessions inside same transaction', () => {
    expect(auth).toContain("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1");
    expect(auth).toContain("await c.query('BEGIN');");
    expect(auth).toContain("await c.query('COMMIT');");
  });

  it('removes dangerous HTTP migration endpoint and hardens CLI profile checks', () => {
    expect(server).not.toContain('/api/database/migrate');
    expect(migrate).toContain('FIXDEV_PROFILE');
    expect(migrate).toContain('FIXDEV_DATABASE_NAME');
    expect(migrate).toContain('DATABASE_URL database must exactly match');
  });
});
