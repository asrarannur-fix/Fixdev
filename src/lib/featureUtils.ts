/**
 * Feature gating utilities – central source of truth for module/submenu access.
 * Handles tier-based features AND trial expansion (trial = all features visible).
 */

import { SubscriptionTier } from "../types";

export const ALL_FEATURES: string[] = [
  "POS", "SERVICE", "INVENTORY", "ACCOUNTING", "HRM", "CRM",
  "WHATSAPP", "TELEGRAM", "MARKETPLACE",
  "RENTAL", "SECURITY"
];

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  BASIC: ["POS", "SERVICE", "INVENTORY"],
  PRO: ["POS", "SERVICE", "INVENTORY", "ACCOUNTING", "HRM", "CRM", "WHATSAPP", "TELEGRAM"],
  ENTERPRISE: [...ALL_FEATURES]
};

const MODULE_FEATURE_MAP: Record<string, string> = {
  services: "SERVICE",
  pos: "POS",
  inventory: "INVENTORY",
  accounting: "ACCOUNTING",
  hr: "HRM",
  crm: "CRM",
  fraud: "SECURITY"
};

interface Tenant {
  id?: string;
  name?: string;
  tier?: SubscriptionTier;
  status?: string; // ACTIVE, TRIAL, EXPIRED, SUSPENDED
  trialEndsAt?: string;
  limits?: { features?: string[] };
}

export function isTrialActive(tenant: Tenant): boolean {
  if (tenant.status !== "TRIAL") return false;
  const ends = tenant.trialEndsAt;
  // A TRIAL tenant without an explicit end date is treated as actively
  // trialing (all features unlocked). Only an explicit past end date expires it.
  if (!ends) return true;
  return new Date(ends) > new Date();
}

export function getTenantFeatures(tenant: Tenant): string[] {
  const rawFeatures = tenant.limits?.features;
  if (Array.isArray(rawFeatures) && rawFeatures.length > 0) {
    return rawFeatures.map(f => f.toUpperCase());
  }
  const tier = tenant.tier || "BASIC";
  return TIER_FEATURES[tier] || TIER_FEATURES.BASIC;
}

export function getEffectiveFeatures(tenant: Tenant): string[] {
  if (isTrialActive(tenant)) {
    return ALL_FEATURES;
  }
  // If trial expired or not active, fallback to basic/tier features
  return getTenantFeatures(tenant);
}

export function isModuleLocked(modId: string, tenant: Tenant): boolean {
  const requiredFeature = MODULE_FEATURE_MAP[modId];
  if (!requiredFeature) return false;
  const features = getEffectiveFeatures(tenant);
  return !features.includes(requiredFeature);
}

export function getRequiredTierForModule(modId: string): "PRO" | "ENTERPRISE" | "" {
  if (modId === "accounting" || modId === "hr" || modId === "crm") return "PRO";
  if (modId === "fraud") return "ENTERPRISE";
  return "";
}