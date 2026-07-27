import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeReceptionPhone,
  serviceReceptionSchema,
} from "../src/server/controllers/serviceReception.controller.ts";

const validPayload = {
  idempotencyKey: "f2d3f6f1-1a7f-4b1d-9c16-7f63f0a2e881",
  branchId: "bd7725f3-02cf-4944-bdc9-80ba642a2c55",
  customer: {
    mode: "new" as const,
    name: "Budi Santoso",
    phone: "0812-3456-7890",
    email: "",
    address: "Makassar",
  },
  device: {
    name: "iPhone 14",
    brandModel: "Apple iPhone 14",
    serial: "IMEI-123",
    category: "Smartphone",
    dynamicFields: {},
    screenLockPin: "",
  },
  reception: {
    complaint: "Baterai cepat habis",
    physicalCondition: "Mulus",
    checklist: [{ name: "Layar", checked: true }],
    accessories: ["charger"],
    customAccessories: "",
    capturedConditions: [],
    storageLocationId: "",
  },
  service: {
    assignedTechId: null,
    estimatedCompletionDate: "2026-07-20",
    warrantyMonths: 3,
    downPayment: 100000,
    downPaymentMethod: "CASH" as const,
    isCheckOnly: false,
  },
  outsourcing: { enabled: false, vendorId: "", cost: 0 },
};

test("service reception contract accepts complete frontend payload", () => {
  const result = serviceReceptionSchema.safeParse(validPayload);
  assert.equal(result.success, true);
});

test("service reception contract rejects missing complaint", () => {
  const result = serviceReceptionSchema.safeParse({
    ...validPayload,
    reception: { ...validPayload.reception, complaint: "" },
  });
  assert.equal(result.success, false);
});

test("service reception contract requires idempotency key and bounded photo metadata", () => {
  const missingKey = serviceReceptionSchema.safeParse({
    ...validPayload,
    idempotencyKey: undefined,
  });
  assert.equal(missingKey.success, false);
  const invalidPhoto = serviceReceptionSchema.safeParse({
    ...validPayload,
    reception: { ...validPayload.reception, capturedConditions: [{ id: "1", category: "Unit" }] },
  });
  assert.equal(invalidPhoto.success, false);
});

test("service reception contract accepts existing customer", () => {
  const result = serviceReceptionSchema.safeParse({
    ...validPayload,
    customer: { mode: "existing", id: "e9c1bf94-1e8f-4520-9d14-4805fe48d881" },
  });
  assert.equal(result.success, true);
});

test("server phone normalization matches frontend duplicate detection", () => {
  assert.equal(normalizeReceptionPhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeReceptionPhone("+62 812 3456 7890"), "6281234567890");
});
