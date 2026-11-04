import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5194",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
  },
  webServer: [
    {
      command: `${process.env.BACKEND_PYTHON || "/Users/huichao/PycharmProjects/AI_Interview/.venv/bin/python"} scripts/serve-test-backend.py`,
      url: "http://127.0.0.1:8011/health/ready",
      reuseExistingServer: !!process.env.SHARED_TEST_BACKEND,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --port 5194 --strictPort",
      url: "http://127.0.0.1:5194",
      env: { API_PROXY_TARGET: "http://127.0.0.1:8011" },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
