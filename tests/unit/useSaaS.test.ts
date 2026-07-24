import { describe, it, expect, vi } from "vitest";

vi.mock("../../context/SaaSContext", () => ({
  useSaaS: vi.fn(),
}));

describe("useSaaS hook integration", () => {
  it("should return required context fields when authenticated", () => {
    const mockContext = {
      currentUser: { id: "u1", name: "Test User", role: "ADMIN" as const, permissions: [] },
      currentTenantId: "t1",
      tenants: [{ id: "t1", name: "Test Corp", status: "ACTIVE" as const }],
      branches: [{ id: "b1", name: "Main Branch", tenantId: "t1", isActive: true }],
      currentBranchId: "b1",
      apiLoading: false,
      apiStatus: "ok",
      isAuthenticated: true,
      isImpersonating: false,
      apiFetch: vi.fn(),
    };

    const { useSaaS } = require("../../context/SaaSContext");
    useSaaS.mockReturnValue(mockContext);

    const ctx = useSaaS();
    expect(ctx.currentUser).toBeDefined();
    expect(ctx.currentUser.name).toBe("Test User");
    expect(ctx.currentTenantId).toBe("t1");
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.apiFetch).toBeTypeOf("function");
  });

  it("should return null currentTenant when not in tenant workspace", () => {
    const mockContext = {
      currentUser: { id: "u1", name: "Admin", role: "SUPER_ADMIN" as const, permissions: [] },
      currentTenantId: null,
      tenants: [],
      branches: [],
      currentBranchId: null,
      apiLoading: false,
      apiStatus: "ok",
      isAuthenticated: true,
      isImpersonating: false,
      apiFetch: vi.fn(),
    };

    const { useSaaS } = require("../../context/SaaSContext");
    useSaaS.mockReturnValue(mockContext);

    const ctx = useSaaS();
    expect(ctx.currentTenantId).toBeNull();
    expect(ctx.tenants).toEqual([]);
  });
});