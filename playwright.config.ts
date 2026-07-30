import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/api/class-testoptions
 */
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const port = new URL(baseURL).port || '80';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(process.env.TEST_E2E_SERVER === '1'
    ? {
        webServer: {
          command: `NODE_ENV=test PORT=${port} DEV_PORT=${port} DOTENV_CONFIG_PATH=/dev/null npm run dev`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 60 * 1000,
        },
      }
    : {}),
});
