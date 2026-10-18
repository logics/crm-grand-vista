import { defineConfig, devices } from '@playwright/test';
import { WEB_URL } from './e2e/support/accounts.js';
import { e2eEnv } from './e2e/support/test-env.js';

// E2E contra a API real e o banco de teste do container (`pnpm db:up`),
// zerado e semeado a cada execução. API e front sobem em portas próprias.
export default defineConfig({
  testDir: './e2e',
  testIgnore: 'support/**',
  globalSetup: './e2e/support/global-setup.ts',
  use: { baseURL: WEB_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @crm/api dev',
      url: `${e2eEnv.API_URL}/health`,
      env: e2eEnv,
      reuseExistingServer: false,
    },
    {
      command: `pnpm --filter @crm/web dev --port ${new URL(WEB_URL).port}`,
      url: WEB_URL,
      env: e2eEnv,
      reuseExistingServer: false,
    },
  ],
});
