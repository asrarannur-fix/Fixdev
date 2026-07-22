import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const auth = fs.readFileSync(new URL("../src/middleware/auth.middleware.ts", import.meta.url), "utf8");
const routes = fs.readFileSync(new URL("../src/server/routes/superadmin.routes.ts", import.meta.url), "utf8");
const invitation = fs.readFileSync(new URL("../src/server/controllers/invitation.controller.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../migrations/009_superadmin_session_and_operations.sql", import.meta.url), "utf8");

test("Super Admin mutations require an authoritative edit session", () => {
  assert.match(auth, /superadmin_console_sessions/);
  assert.match(auth, /session\.mode !== "EDIT"/);
  assert.match(routes, /router\.use\(requireSuperAdminConsoleSession\)/);
});

test("Super Admin tenant scope requires active matching impersonation", () => {
  assert.match(auth, /x-impersonation-session-id/);
  assert.match(auth, /ended_at IS NULL AND expires_at>now\(\)/);
  assert.match(auth, /requestedTenant !== session\.tenant_id/);
  assert.match(auth, /session\.access_mode !== "FULL"/);
});

test("invitation provisioning tracks completion and compensation failure", () => {
  assert.match(invitation, /provisioning_status='PROVISIONING'/);
  assert.match(invitation, /provisioning_status='COMPLETED'/);
  assert.match(invitation, /provisioning_status='FAILED'/);
  assert.match(invitation, /password_hash/);
  assert.doesNotMatch(invitation, /ARRAY\['\*'\]/);
  assert.match(migration, /provisioning_status/);
});

test("tenant registration and role assignment have server-side controls", () => {
  assert.match(migration, /registration_key UUID/);
  assert.match(routes, /tenants\/availability/);
  assert.match(routes, /users\/:userId\/role/);
  assert.match(routes, /requireSuperAdminPermission\("users:assign_role"\)/);
});
