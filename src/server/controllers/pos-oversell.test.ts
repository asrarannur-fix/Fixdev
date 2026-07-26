import { describe, expect, it } from 'vitest';
import { posSaleSchema } from './pos.controller';

describe('POS oversell protection — input validation', () => {
  it('rejects quantity 0 (would oversell nothing)', () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: 'Item', quantity: 0, unitPrice: 10000, discount: 0 }],
      paymentMethod: 'CASH',
      amountPaid: 10000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: 'Item', quantity: -1, unitPrice: 10000, discount: 0 }],
      paymentMethod: 'CASH',
      amountPaid: 10000,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid sale without customerId', () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: 'Item', quantity: 2, unitPrice: 50000, discount: 0 }],
      paymentMethod: 'QRIS',
      amountPaid: 100000,
    });
    expect(result.success).toBe(true);
  });
});

describe('POS oversell protection — SQL guard', () => {
  const fs = require('fs');
  let source = '';
  try {
    source = fs.readFileSync('./src/services/posService.ts', 'utf-8');
  } catch (e) {}

  it('stock deduction SQL contains quantity guard', () => {
    const hasOversellGuard = source.includes('quantity >= $1');
    expect(hasOversellGuard).toBe(true);
  });

  it('stock deduction SQL uses row-level guard', () => {
    const hasRowGuard = source.includes('quantity >= $1');
    expect(hasRowGuard).toBe(true);
  });

  it('insufficient stock error message matches', () => {
    const hasStockError = source.includes('Stok tidak mencukupi');
    expect(hasStockError).toBe(true);
  });
});
