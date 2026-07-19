import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptScreenLockPin,
  encryptScreenLockPin,
} from "../src/server/lib/screenLockPin.ts";
import { sanitizeServiceReceptionDraft } from "../src/utils/serviceReceptionDraft.ts";
import { sanitizeServiceTicketsForBootstrap } from "../src/server/controllers/bootstrap.controller.ts";

test("PIN kunci layar dienkripsi dan dapat dibuka kembali dengan kunci server", () => {
  const encrypted = encryptScreenLockPin("123456", "test-server-secret");

  assert.notEqual(encrypted, "123456");
  assert.equal(decryptScreenLockPin(encrypted, "test-server-secret"), "123456");
});

test("draft penerimaan tidak menyimpan PIN kunci layar", () => {
  const draft = sanitizeServiceReceptionDraft({
    newSrvCustName: "Budi",
    newSrvScreenLock: "123456",
  });

  assert.deepEqual(draft, { newSrvCustName: "Budi" });
  assert.equal("newSrvScreenLock" in draft, false);
});

test("bootstrap tidak mengirim PIN kunci layar ke browser", () => {
  const safe = sanitizeServiceTicketsForBootstrap([
    { id: "ticket-1", screen_lock_pin: "v1.encrypted.secret" },
  ]);

  assert.deepEqual(safe, [{ id: "ticket-1" }]);
});
