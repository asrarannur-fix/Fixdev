import { test, expect } from "@playwright/test";
import { createTestTenant, BASE_URL } from "./helpers/auth";

test.describe("Service Reception", () => {
  let token: string;
  let tenantId: string;
  let branchId: string | null;

  test.beforeAll(async ({ request }) => {
    const tenant = await createTestTenant(request);
    token = tenant.token;
    tenantId = tenant.tenantId;
    branchId = tenant.branchId;
  });

  test("unauthenticated reception listing is rejected", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/service-receptions`);
    expect(res.status()).toBe(401);
  });

  test("tenant can list service tickets", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/service-receptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("tenant can create a service reception ticket", async ({ request }) => {
    const payload = {
      branchId: branchId || "00000000-0000-0000-0000-000000000000",
      customer: {
        mode: "new",
        name: "E2E Customer",
        phone: "081234567890",
        email: "e2e-customer@example.com",
        address: "Jl. Test No. 1",
      },
      device: {
        name: "Lenovo ThinkPad",
        brandModel: "Lenovo X1",
        serial: "SN12345",
        category: "LAPTOP",
        dynamicFields: {},
      },
      reception: {
        complaint: "Tidak mau menyala sama sekali",
        physicalCondition: "Body mulus",
        checklist: [{ name: "Power button", checked: true }],
        accessories: ["Charger"],
        customAccessories: "",
        capturedConditions: [],
        storageLocationId: "",
      },
      service: {
        assignedTechId: null,
        estimatedCompletionDate: "",
        warrantyMonths: 0,
        downPayment: 0,
        isCheckOnly: false,
      },
      outsourcing: { enabled: false, vendorId: "", cost: 0 },
    };
    const res = await request.post(`${BASE_URL}/api/service-receptions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.data?.ticket?.id || body.data?.id || body.id).toBeTruthy();
  });
});
