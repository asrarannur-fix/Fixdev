import test from "node:test";
import assert from "node:assert/strict";

import {
  buildServiceReceptionPreview,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
  validateServiceReceptionForm,
} from "../src/utils/serviceReceptionUtils.ts";

test("validateServiceReceptionForm reports missing required customer and device details", () => {
  const errors = validateServiceReceptionForm({
    customerId: "",
    deviceName: "",
    complaint: "",
    isOutsourced: true,
    outsourcedVendor: "",
    outsourcingCost: "",
  });

  assert.deepEqual(errors, [
    "Nama pelanggan baru wajib diisi.",
    "Nomor WhatsApp pelanggan baru wajib diisi.",
    "Nama perangkat wajib diisi.",
    "Keluhan kerusakan wajib diisi.",
    "Isi nama vendor rekanan jika unit dikirim ke pihak luar.",
    "Isi estimasi biaya vendor jika unit dikirim ke pihak luar.",
  ]);
});

test("validateServiceReceptionForm passes when required fields are present", () => {
  const errors = validateServiceReceptionForm({
    customerId: "cust-1",
    deviceName: "iPhone 14",
    complaint: "Baterai cepat habis",
    isOutsourced: false,
    outsourcedVendor: "",
    outsourcingCost: "",
  });

  assert.deepEqual(errors, []);
});

test("validateServiceReceptionForm accepts a valid new customer", () => {
  const errors = validateServiceReceptionForm({
    customerName: "Budi Santoso",
    customerPhone: "0812-3456-7890",
    deviceName: "iPhone 14",
    complaint: "Baterai cepat habis",
  });

  assert.deepEqual(errors, []);
});

test("validateServiceReceptionForm rejects an invalid new customer phone", () => {
  const errors = validateServiceReceptionForm({
    customerName: "Budi Santoso",
    customerPhone: "12345",
    deviceName: "iPhone 14",
    complaint: "Baterai cepat habis",
  });

  assert.ok(errors.some((error) => error.includes("Nomor WhatsApp tidak valid")));
});

test("Indonesian customer phone is normalized consistently for duplicate detection", () => {
  assert.equal(normalizeIndonesianPhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeIndonesianPhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeIndonesianPhone("81234567890"), "6281234567890");
  assert.equal(isValidIndonesianPhone("0812-3456-7890"), true);
});

test("buildServiceReceptionPreview returns receipt lines for the new ticket", () => {
  const preview = buildServiceReceptionPreview({
    ticketNo: "TKT-2507-0001",
    deviceName: "iPhone 14",
    deviceBrandModel: "Apple iPhone 14",
    customerComplaints: "Baterai cepat habis",
    downPayment: 500000,
    estimatedCompletionDate: "2026-07-12",
    isCheckOnly: false,
  } as any, "Budi", "08123456789");

  assert.match(preview.title, /Nota Penerimaan/i);
  assert.match(preview.subtitle, /TKT-2507-0001/);
  assert.ok(preview.lines.some((line) => line.includes("Budi")));
  assert.ok(preview.lines.some((line) => line.includes("iPhone 14")));
  assert.ok(preview.lines.some((line) => line.includes("Rp 500.000")));
});
