import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_FEATURES,
  TIER_FEATURES,
  getEffectiveFeatures,
  isModuleLocked,
} from "../src/lib/featureUtils.ts";
import { requireFeature } from "../src/middleware/feature.middleware.ts";
import { SubscriptionTier } from "../src/types/index.ts";

test("BASIC includes POS, service, and inventory only", () => {
  assert.deepEqual(TIER_FEATURES.BASIC, ["POS", "SERVICE", "INVENTORY"]);
  assert.equal(TIER_FEATURES.BASIC.includes("ACCOUNTING"), false);
});

test("active trial exposes every feature without changing base tier", () => {
  const features = getEffectiveFeatures({
    tier: SubscriptionTier.BASIC,
    status: "TRIAL",
    trialEndsAt: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.deepEqual(features, ALL_FEATURES);
});

test("expired trial falls back to base tier", () => {
  const features = getEffectiveFeatures({
    tier: SubscriptionTier.BASIC,
    status: "TRIAL",
    trialEndsAt: new Date(Date.now() - 60_000).toISOString(),
  });
  assert.deepEqual(features, TIER_FEATURES.BASIC);
});

test("inventory is BASIC while accounting requires PRO", () => {
  const tenant = { tier: SubscriptionTier.BASIC, status: "ACTIVE" };
  assert.equal(isModuleLocked("inventory", tenant), false);
  assert.equal(isModuleLocked("accounting", tenant), true);
});

test("requireFeature allows included feature and blocks excluded feature", () => {
  const response = () => {
    const state = { status: 200, body: undefined as unknown };
    return {
      state,
      status(code: number) { state.status = code; return this; },
      json(body: unknown) { state.body = body; return this; },
    };
  };
  const req = {
    path: "/api/accounting/accounts",
    authActor: { userId: "u1", tenantId: "t1", role: "OWNER", features: ["ACCOUNTING"] },
  } as any;
  const allowed = response();
  let nextCalled = false;
  requireFeature("ACCOUNTING")(req, allowed as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  req.authActor.features = ["POS", "SERVICE", "INVENTORY"];
  const denied = response();
  requireFeature("ACCOUNTING")(req, denied as any, () => assert.fail("must not call next"));
  assert.equal(denied.state.status, 403);
  assert.deepEqual((denied.state.body as any).code, "FEATURE_LOCKED");
});

test("requireFeature rejects unauthenticated request", () => {
  const state = { status: 200 };
  const res = {
    status(code: number) { state.status = code; return this; },
    json() { return this; },
  };
  requireFeature("ACCOUNTING")({ path: "/api/accounting" } as any, res as any, () => assert.fail());
  assert.equal(state.status, 401);
});
