import { defineConfig, devices } from '@playwright/test';

// Fumaça contra o ambiente publicado, depois de cada deploy: sem servidor
// próprio, sem seed e sem conta — só `smoke.spec.ts`, que não usa credencial
// nem grava no banco. O fluxo completo roda no CI, contra o banco semeado.
// Sem nova tentativa: falha intermitente em produção também é aviso.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'smoke.spec.ts',
  use: { baseURL: 'https://crmgv.logics.com.br', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
