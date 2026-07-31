import { describe, expect, it } from 'vitest';
import { calculateServiceInvoice, calculateAdditionalCost, partOrderUpdateSchema } from './serviceWorkflow.controller';

describe('Service workflow calculation logic', () => {
  it('calculates tax-exclusive invoice totals securely', () => {
    const inv = calculateServiceInvoice(100000, 20000, 11, false);
    expect(inv).toEqual({
      subtotal: 100000,
      taxAmount: 11000,
      total: 111000,
      downPaymentUsed: 20000,
      amountDue: 91000
    });
  });

  it('calculates tax-inclusive invoice totals securely', () => {
    const inv = calculateServiceInvoice(111000, 20000, 11, true);
    expect(inv).toEqual({
      subtotal: 111000,
      taxAmount: 11000,
      total: 111000,
      downPaymentUsed: 20000,
      amountDue: 91000
    });
  });

  it('protects against negative costs or down payments', () => {
    const inv = calculateServiceInvoice(-50000, -10000, -5, false);
    expect(inv).toEqual({
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      downPaymentUsed: 0,
      amountDue: 0
    });
  });

  it('caps down payment to total amount', () => {
    const inv = calculateServiceInvoice(50000, 100000, 0, false);
    expect(inv.downPaymentUsed).toBe(50000);
    expect(inv.amountDue).toBe(0);
  });

  it('adds approved additional costs securely', () => {
    const cost = calculateAdditionalCost(150000, 50000);
    expect(cost).toEqual({
      previousCost: 150000,
      additionalCost: 50000,
      newCost: 200000
    });
  });

  it('protects additional costs from negative inputs', () => {
    const cost = calculateAdditionalCost(-1000, -50000);
    expect(cost).toEqual({
      previousCost: 0,
      additionalCost: 0,
      newCost: 0
    });
  });
});

describe('Spare part order schema validation', () => {
  it('accepts valid forward transitions and rejects backward', () => {
    expect(partOrderUpdateSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(partOrderUpdateSchema.safeParse({ status: 'ORDERED' }).success).toBe(true);
    expect(partOrderUpdateSchema.safeParse({ status: 'SHIPPED' }).success).toBe(true);
    expect(partOrderUpdateSchema.safeParse({ status: 'ARRIVED' }).success).toBe(true);
    expect(partOrderUpdateSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
    expect(partOrderUpdateSchema.safeParse({ status: 'RESERVED' }).success).toBe(false);
    expect(partOrderUpdateSchema.safeParse({ status: 'REQUESTED' }).success).toBe(false);
  });

  it('allows partial update with only supplier name', () => {
    expect(partOrderUpdateSchema.safeParse({ supplierName: 'Toko ABC' }).success).toBe(true);
  });
});
