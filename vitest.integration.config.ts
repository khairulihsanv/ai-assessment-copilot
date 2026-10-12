import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { requireTestDatabaseUrl } from "./apps/frontend/src/server/config/database-url";

// Evaluated before Vitest loads route modules or instantiates Prisma.
const url = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = url;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 15000,
    globalSetup: ["./tests/integration-global-setup.ts"],
    env: { DATABASE_URL: url, TEST_DATABASE_URL: url },
  },
  resolve: { alias: { "@": resolve(__dirname, "./apps/frontend/src") } },
});
