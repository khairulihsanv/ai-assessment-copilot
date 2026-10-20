import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { requireTestDatabaseUrl } from "./apps/frontend/src/server/config/database-url";

const rawUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test";
const url = requireTestDatabaseUrl(rawUrl);
process.env.TEST_DATABASE_URL = url;
process.env.DATABASE_URL = url;

const backendPort = process.env.INTEGRATION_BACKEND_PORT || "3021";
const testBackendUrl = `http://127.0.0.1:${backendPort}`;
const testSecret =
  process.env.INTERNAL_API_SECRET ||
  process.env.SECRET_KEY ||
  "dexa-assessment-secure-auth-secret-key-32chars-min-2026";

process.env.BACKEND_URL = testBackendUrl;
process.env.SECRET_KEY = testSecret;
process.env.INTERNAL_API_SECRET = testSecret;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts", "tests/*.integration.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 15000,
    globalSetup: ["./tests/integration-global-setup.ts"],
    setupFiles: ["./tests/integration-setup-file.ts"],
    env: {
      DATABASE_URL: url,
      TEST_DATABASE_URL: url,
      SECRET_KEY: testSecret,
      INTERNAL_API_SECRET: testSecret,
    },
  },
  resolve: { alias: { "@": resolve(__dirname, "./apps/frontend/src") } },
});
