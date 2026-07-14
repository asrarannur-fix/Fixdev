import { describe, expect, it } from "vitest";
import { COMPONENTS, RADIUS, SPACING, TYPOGRAPHY } from "./designTokens";

describe("Design system tokens", () => {
  it("uses consistent card radius and spacing", () => {
    expect(RADIUS.card).toBe("rounded-2xl");
    expect(SPACING.card).toBe("p-4");
    expect(COMPONENTS.card.base).toContain("rounded-2xl");
  });

  it("defines readable typography tokens", () => {
    expect(TYPOGRAPHY.h1).toContain("font-black");
    expect(TYPOGRAPHY.label).toContain("font-bold");
  });
});

describe("Rupiah formatting contract", () => {
  const fmt = (value: unknown) => `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

  it("never renders NaN", () => {
    expect(fmt(undefined)).toBe("Rp 0");
    expect(fmt(null)).toBe("Rp 0");
    expect(fmt("invalid")).toBe("Rp 0");
  });

  it("formats Rupiah locale", () => {
    expect(fmt(1500000)).toBe("Rp 1.500.000");
  });
});
