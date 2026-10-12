import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["tests/**/*.integration.test.ts", "apps/**/*.integration.test.ts", "apps/**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./apps/frontend/src"),
    },
  },
});
