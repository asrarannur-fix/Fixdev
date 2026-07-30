
import { describe, expect, it } from "vitest";
import { SubscriptionTier } from "../types";
import { ALL_FEATURES, getEffectiveFeatures, isModuleLocked, isSubTabFeatureAllowed, isTrialActive, TIER_FEATURES } from "./featureUtils";

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

  it('should grant all features for a TRIAL tenant without trialEndsAt', () => {
    const tenant = { status: 'TRIAL' as const };
    const features = getEffectiveFeatures(tenant);
    expect(features).toEqual(ALL_FEATURES);
    expect(isModuleLocked('hr', tenant)).toBe(false);
    expect(isModuleLocked('crm', tenant)).toBe(false);
    expect(isModuleLocked('accounting', tenant)).toBe(false);
  });

  it('should expire trial when trialEndsAt is in the past', () => {
    const tenant = { status: 'TRIAL' as const, trialEndsAt: new Date(Date.now() - 86400000).toISOString() };
    expect(isTrialActive(tenant)).toBe(false);
  });

  it('hides rental subtab without RENTAL feature', () => {
    const tenant = { tier: SubscriptionTier.ENTERPRISE, limits: { features: ['SERVICE'] } };
    expect(isSubTabFeatureAllowed('services', 'rental', tenant)).toBe(false);
    expect(isSubTabFeatureAllowed('services', 'list', tenant)).toBe(true);
    expect(isSubTabFeatureAllowed('services', 'rental', { tier: SubscriptionTier.ENTERPRISE })).toBe(true);
  });
});
