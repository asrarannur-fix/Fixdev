import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    exclude: ["node_modules", "dist"],
  },
  resolve: {
    alias: {
      "@": "/home/ubuntu/barufix/src",
    },
  },
});
