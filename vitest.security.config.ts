import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/billing-security.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
