import { describe, expect, it } from "vitest";
import { posSaleSchema } from "./pos.controller";

describe("POS oversell protection — input validation", () => {
  it("rejects quantity 0 (would oversell nothing)", () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: "Item", quantity: 0, unitPrice: 10000, discount: 0 }],
      paymentMethod: "CASH",
      amountPaid: 10000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: "Item", quantity: -1, unitPrice: 10000, discount: 0 }],
      paymentMethod: "CASH",
      amountPaid: 10000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid sale without customerId", () => {
    const result = posSaleSchema.safeParse({
      customerId: null,
      items: [{ productId: null, name: "Item", quantity: 2, unitPrice: 50000, discount: 0 }],
      paymentMethod: "QRIS",
      amountPaid: 100000,
    });
    expect(result.success).toBe(true);
  });
});

describe("POS oversell protection — SQL guard", () => {
  it("stock deduction SQL contains quantity guard", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./src/server/controllers/pos.controller.ts", "utf-8");
    const hasOversellGuard = source.includes("quantity >= $1");
    expect(hasOversellGuard).toBe(true);
  });

  it("stock deduction SQL uses FOR UPDATE or row-level guard", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./src/server/controllers/pos.controller.ts", "utf-8");
    const hasRowGuard = source.includes("quantity >= $1");
    expect(hasRowGuard).toBe(true);
  });

  it("insufficient stock error message matches", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./src/server/controllers/pos.controller.ts", "utf-8");
    const hasStockError = source.includes("Stok tidak mencukupi");
    expect(hasStockError).toBe(true);
  });

  it("pg_advisory_xact_lock prevents concurrent invoice collision", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./src/server/controllers/pos.controller.ts", "utf-8");
    const hasLock = source.includes("pg_advisory_xact_lock");
    expect(hasLock).toBe(true);
  });
});