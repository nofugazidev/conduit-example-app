import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev -w backend",
      port: 3001,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -w frontend",
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
