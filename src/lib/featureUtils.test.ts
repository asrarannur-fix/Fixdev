
import { describe, expect, it } from "vitest";
import { SubscriptionTier } from "../types";
import { ALL_FEATURES, getEffectiveFeatures, isModuleLocked, TIER_FEATURES } from "./featureUtils";

describe('featureUtils feature gating', () => {
  it('should grant all features when trial is active', () => {
    const tenant = { status: 'TRIAL', trialEndsAt: new Date(Date.now() + 86400000).toISOString() };
    const features = getEffectiveFeatures(tenant);
    expect(features).toContain('INVENTORY');
    expect(features.length).toBeGreaterThan(10);
  });

  it('should fallback to tier features when trial is inactive', () => {
    const tenant = { status: 'ACTIVE', tier: SubscriptionTier.BASIC };
    const features = getEffectiveFeatures(tenant);
    expect(features).toContain('INVENTORY');
    expect(features).toEqual(TIER_FEATURES.BASIC);
  });

  it('should correctly gate INVENTORY in BASIC tier', () => {
    const tenant = { status: 'ACTIVE', tier: SubscriptionTier.BASIC };
    expect(isModuleLocked('inventory', tenant)).toBe(false);
  });
});
