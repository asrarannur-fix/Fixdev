import test from "node:test";
import assert from "node:assert/strict";
import { toApiResponse } from "../src/server/utils/responseTransform.js";

test("toApiResponse converts nested database values safely", () => {
  const date = new Date("2026-08-10T09:22:33.371Z");
  const result = toApiResponse({
    trial_ends_at: date,
    nested_value: [{ created_at: date, nullable_value: null }],
    binary_value: Buffer.from("ok"),
  });

  assert.deepEqual(result, {
    trialEndsAt: date.toISOString(),
    nestedValue: [{ createdAt: date.toISOString(), nullableValue: null }],
    binaryValue: Buffer.from("ok").toString("base64"),
  });
});
