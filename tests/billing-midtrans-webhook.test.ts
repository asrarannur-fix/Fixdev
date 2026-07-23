import { test, expect } from "vitest";

import { buildMidtransSignature } from "../src/server/controllers/billing.controller.js";

test("buildMidtransSignature uses Midtrans SHA-512 payload format", () => {
  const signature = buildMidtransSignature("saas-inv-123", "200", "99000.00", "server-key");
  expect(signature).toBe(
    "2290863baaf48cc5a1e8817474c7423dc7a97a3d61bd9b88c419e5e39eb0a4c7bb7c2e011236483a2da7a91accced1380a8d81b7e14fe94dfa108b3758616988"
  );
});
