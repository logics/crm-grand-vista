import { defineConfig, devices } from '@playwright/test';

const WEB_URL = 'http://localhost:5173';

// Teste de fumaça desta fase. O fluxo E2E real é da spec de CI e deploy.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: WEB_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @crm/web dev',
    url: WEB_URL,
    reuseExistingServer: true,
  },
});
