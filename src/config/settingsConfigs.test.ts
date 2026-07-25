import { describe, expect, it } from 'vitest';
import { getSettingsTabs } from './settingsConfigs';

describe('getSettingsTabs', () => {
  it('uses server-issued role and permissions without exposing platform storage', () => {
    expect(getSettingsTabs('OWNER').some(({ id }) => id === 'storage')).toBe(false);
    // SUPER_ADMIN mendapat akses penuh settings tenant (dibutuhkan saat impersonate,
    // karena permissions actor superadmin tidak dimuat di sesi tenant).
    expect(getSettingsTabs('SUPER_ADMIN', ['admin_access']).length).toBeGreaterThan(0);
    expect(
      getSettingsTabs('SUPER_ADMIN', ['admin_access']).some(({ id }) => id === 'storage')
    ).toBe(false);
    expect(getSettingsTabs('MANAGER', ['settings:notification']).map(({ id }) => id)).toEqual([
      'telegram',
      'notifications',
    ]);
  });
});
