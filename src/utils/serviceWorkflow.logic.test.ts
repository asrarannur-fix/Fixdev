import { describe, expect, it } from 'vitest';
import { validateServiceReceptionFields } from './serviceReceptionUtils';
import { getTenantPublicUrl } from './tenantUrl';
import { deterministicUUID } from './saasUtils';

describe('Service workflow utility pure logic', () => {
  it('validates minimum service reception payload without rejecting non-outsourced units', () => {
    const invalid = validateServiceReceptionFields({
      deviceName: '',
      complaint: ''
    });
    expect(invalid.customerName).toBeDefined();
    expect(invalid.deviceName).toBeDefined();
    expect(invalid.complaint).toBeDefined();
    expect(invalid.outsourcedVendor).toBeUndefined();

    const validNewCustomer = validateServiceReceptionFields({
      customerName: 'Budi',
      customerPhone: '081234567890',
      deviceName: 'Laptop',
      complaint: 'Mati total'
    });
    expect(Object.keys(validNewCustomer)).toHaveLength(0);

    const validExistingCustomer = validateServiceReceptionFields({
      customerId: 'cust-123',
      deviceName: 'Laptop',
      complaint: 'Mati total'
    });
    expect(Object.keys(validExistingCustomer)).toHaveLength(0);
  });

  it('requires vendor name and cost for outsourced units', () => {
    const invalidOutsource = validateServiceReceptionFields({
      customerId: 'cust-123',
      deviceName: 'Laptop',
      complaint: 'Mati total',
      isOutsourced: true,
      outsourcedVendor: '',
      outsourcingCost: '0'
    });
    expect(invalidOutsource.outsourcedVendor).toBeDefined();
    expect(invalidOutsource.outsourcingCost).toBeDefined();
  });

  it('rejects invalid indonesian phone numbers', () => {
    const invalidPhone = validateServiceReceptionFields({
      customerName: 'Budi',
      customerPhone: '123',
      deviceName: 'Laptop',
      complaint: 'Mati total'
    });
    expect(invalidPhone.customerPhone).toBeDefined();
  });

  it('builds public tracking url and preserves parameters', () => {
    expect(getTenantPublicUrl('https://app.fixdev.id', '/', { tracking: 'tok-123' })).toBe('https://app.fixdev.id/?tracking=tok-123');
  });

  it('hashes tracking URL predictably with deterministic UUID', () => {
    const uuid1 = deterministicUUID('ticket-1');
    const uuid2 = deterministicUUID('ticket-1');
    const uuid3 = deterministicUUID('ticket-2');

    expect(uuid1).toBe(uuid2);
    expect(uuid1).not.toBe(uuid3);
  });
});
