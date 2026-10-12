import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.FRONTEND_PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL || "chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Sequential for deterministic database states
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-report.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    channel: CHANNEL,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        channel: CHANNEL,
      },
    },
    {
      name: "Mobile Viewport",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
        channel: CHANNEL,
      },
      testMatch: /ui-responsiveness\.spec\.ts/,
    },
  ],
});
