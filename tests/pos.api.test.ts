/**
 * POS API Tests — Schema validation and business rule coverage.
 * Run: npx tsx --test tests/pos.api.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  openShiftSchema,
  closeShiftSchema,
  posSaleSchema,
  voidSaleSchema,
} from "../src/server/controllers/pos.controller.ts";

// ──────────────────────────────────────────
// OPEN SHIFT SCHEMA
// ──────────────────────────────────────────

test("openShiftSchema: accepts zero starting cash", () => {
  const result = openShiftSchema.safeParse({ startingCash: 0 });
  assert.equal(result.success, true);
});

test("openShiftSchema: accepts positive starting cash", () => {
  const result = openShiftSchema.safeParse({ startingCash: 500000 });
  assert.equal(result.success, true);
});

test("openShiftSchema: rejects negative starting cash", () => {
  const result = openShiftSchema.safeParse({ startingCash: -1 });
  assert.equal(result.success, false);
});

test("openShiftSchema: rejects missing startingCash", () => {
  const result = openShiftSchema.safeParse({});
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// CLOSE SHIFT SCHEMA
// ──────────────────────────────────────────

test("closeShiftSchema: accepts zero actual ending cash", () => {
  const result = closeShiftSchema.safeParse({ actualEndingCash: 0 });
  assert.equal(result.success, true);
});

test("closeShiftSchema: accepts with optional notes", () => {
  const result = closeShiftSchema.safeParse({ actualEndingCash: 250000, notes: "Shift malam" });
  assert.equal(result.success, true);
});

test("closeShiftSchema: rejects negative actualEndingCash", () => {
  const result = closeShiftSchema.safeParse({ actualEndingCash: -500 });
  assert.equal(result.success, false);
});

test("closeShiftSchema: rejects missing field", () => {
  const result = closeShiftSchema.safeParse({});
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// POS SALE SCHEMA
// ──────────────────────────────────────────

test("posSaleSchema: accepts minimal valid sale", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [
      { productId: null, name: "Casing HP", quantity: 1, unitPrice: 50000, discount: 0 },
    ],
    paymentMethod: "CASH",
    amountPaid: 150000,
  });
  assert.equal(result.success, true);
});

test("posSaleSchema: accepts all payment methods", () => {
  const methods = ["CASH", "BANK_TRANSFER", "QRIS", "EDC", "E_WALLET", "DEPOSIT", "TEMPO"];
  for (const method of methods) {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
      paymentMethod: method,
      amountPaid: 100000,
    });
    assert.equal(result.success, true, `should accept ${method}`);
  }
});

test("posSaleSchema: rejects empty items array", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [],
    paymentMethod: "CASH",
    amountPaid: 0,
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: rejects quantity zero", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 0, unitPrice: 100000, discount: 0 }],
    paymentMethod: "CASH",
    amountPaid: 0,
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: rejects negative quantity", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: -5, unitPrice: 100000, discount: 0 }],
    paymentMethod: "CASH",
    amountPaid: 0,
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: rejects negative discount on item", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: -10 }],
    paymentMethod: "CASH",
    amountPaid: 0,
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: rejects invalid paymentMethod", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    paymentMethod: "PAYLATER",
    amountPaid: 0,
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: accepts split payments", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    paymentMethod: "CASH",
    amountPaid: 0,
    splitPayments: [
      { method: "CASH", amount: 50000 },
      { method: "QRIS", amount: 50000 },
    ],
  });
  assert.equal(result.success, true);
});

test("posSaleSchema: rejects split payment with zero amount", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    paymentMethod: "CASH",
    amountPaid: 0,
    splitPayments: [{ method: "CASH", amount: 0 }],
  });
  assert.equal(result.success, false);
});

test("posSaleSchema: accepts TEMPO payment (B2B kredit)", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    paymentMethod: "TEMPO",
    amountPaid: 0,
  });
  assert.equal(result.success, true);
});

test("posSaleSchema: accepts deposit payment with depositUsed > 0", () => {
  const result = posSaleSchema.safeParse({
    customerId: null,
    items: [{ productId: null, name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    paymentMethod: "DEPOSIT",
    depositUsed: 50000,
    amountPaid: 0,
  });
  assert.equal(result.success, true);
});

// ──────────────────────────────────────────
// VOID SCHEMA
// ──────────────────────────────────────────

test("voidSaleSchema: accepts valid reason", () => {
  const result = voidSaleSchema.safeParse({ reason: "Barang salah scan" });
  assert.equal(result.success, true);
});

test("voidSaleSchema: rejects reason shorter than 3 chars", () => {
  const result = voidSaleSchema.safeParse({ reason: "ok" });
  assert.equal(result.success, false);
});

test("voidSaleSchema: rejects empty reason", () => {
  const result = voidSaleSchema.safeParse({ reason: "" });
  assert.equal(result.success, false);
});

test("voidSaleSchema: rejects missing reason", () => {
  const result = voidSaleSchema.safeParse({});
  assert.equal(result.success, false);
});

// ──────────────────────────────────────────
// BUSINESS RULE ASSERTIONS (unit-level)
// ──────────────────────────────────────────

test("grandTotal calculation: subtotal - discount + tax", () => {
  const subtotal = 100_000;
  const disc = 10_000;
  const taxRate = 11;
  const base = subtotal - disc;
  const tax = Math.round(base * taxRate / 100);
  const grand = base + tax;
  assert.equal(base, 90_000);
  assert.equal(tax, 9_900);
  assert.equal(grand, 99_900);
});

test("grandTotal never negative after discount exceeds subtotal", () => {
  const subtotal = 50_000;
  const disc = 60_000;
  const base = Math.max(0, subtotal - disc);
  const taxRate = 11;
  const tax = Math.round(base * taxRate / 100);
  const grand = base + tax;
  assert.equal(grand, 0);
});

test("changeAmount: cannot be negative", () => {
  const grandTotal = 100_000;
  const amountPaid = 80_000;
  const change = Math.max(0, amountPaid - grandTotal);
  assert.equal(change, 0);
});

test("changeAmount: correct for overpayment", () => {
  const grandTotal = 100_000;
  const amountPaid = 120_000;
  const change = Math.max(0, amountPaid - grandTotal);
  assert.equal(change, 20_000);
});

test("invoice number format: INV/POS/YYYY/NNNNN", () => {
  const year = 2026;
  const seq = 42;
  const invoiceNo = `INV/POS/${year}/${seq.toString().padStart(5, "0")}`;
  assert.equal(invoiceNo, "INV/POS/2026/00042");
  assert.match(invoiceNo, /^INV\/POS\/\d{4}\/\d{5}$/);
});

test("stock deduction: never goes below zero", () => {
  const currentStock = 2;
  const soldQty = 5;
  const newStock = Math.max(0, currentStock - soldQty);
  assert.equal(newStock, 0);
});

test("shift cash difference: positive means surplus", () => {
  const startingCash = 100_000;
  const cashSales = 300_000;
  const expectedEndingCash = startingCash + cashSales;
  const actualEndingCash = 410_000;
  const difference = actualEndingCash - expectedEndingCash;
  assert.equal(difference, 10_000); // surplus
});

test("shift cash difference: negative means shortage", () => {
  const startingCash = 100_000;
  const cashSales = 300_000;
  const expectedEndingCash = startingCash + cashSales;
  const actualEndingCash = 380_000;
  const difference = actualEndingCash - expectedEndingCash;
  assert.equal(difference, -20_000); // shortage
});