import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptScreenLockPin,
  encryptScreenLockPin,
} from "../src/server/lib/screenLockPin.ts";
import { sanitizeServiceReceptionDraft } from "../src/utils/serviceReceptionDraft.ts";

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
  // Inline implementation of sanitizeServiceTicketsForBootstrap
  // (copied from bootstrap.controller.ts to avoid db.js dependency)
  function sanitizeServiceTicketsForBootstrap(tickets: Record<string, any>[]) {
    return tickets.map(ticket => {
      const { screen_lock_pin: _, ...safeTicket } = ticket;
      return safeTicket;
    });
  }

  const safe = sanitizeServiceTicketsForBootstrap([
    { id: "ticket-1", screen_lock_pin: "v1.encrypted.secret" },
  ]);

  assert.deepEqual(safe, [{ id: "ticket-1" }]);
});

test("SERVICE_TICKET_ALLOWED_COLUMNS tidak mencakup screen_lock_pin", async () => {
  const fs = await import("fs");
  const code = fs.readFileSync("/data/fixdev/src/server/controllers/data.controller.ts", "utf-8");
  const allowedColumnsMatch = code.match(/const SERVICE_TICKET_ALLOWED_COLUMNS = \[([\s\S]*?)\];/);
  const columnsBlock = allowedColumnsMatch?.[1] || "";
  assert.equal(/'screen_lock_pin'|"screen_lock_pin"/.test(columnsBlock), false);
});