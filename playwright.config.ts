import { defineConfig, devices } from "@playwright/test";

// Тот же порт, что у `pnpm dev`: Next 16 не запускает второй dev-сервер в одной папке,
// поэтому локально переиспользуем уже запущенный.
const port = 3000;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Dev-вход работает только при NODE_ENV=development, поэтому e2e идут против next dev.
  webServer: {
    command: `pnpm next dev --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
