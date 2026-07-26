import { describe, expect, it } from 'vitest';
import { OPERATIONAL_MODULES } from './nav.config';

const moduleById = (id: string) => OPERATIONAL_MODULES.find((module) => module.id === id);

describe('tenant navigation', () => {
  it('uses business-facing module names', () => {
    expect(moduleById('overview')?.label).toBe('Beranda');
    expect(moduleById('inventory')?.label).toBe('Persediaan');
    expect(moduleById('crm')?.label).toBe('Pelanggan');
    expect(moduleById('hr')?.label).toBe('Tim');
  });

  it('keeps service actions separate from supporting tools', () => {
    const services = moduleById('services');
    expect(services?.subtabs.slice(0, 2).map(({ id }) => id)).toEqual(['list', 'new-ticket']);
    expect(services?.subtabs.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['rental', 'warranty-claims', 'field-service'])
    );
  });
});
