import { defineConfig, devices } from '@playwright/test';
import type { AccountOptions } from './e2e/support/fixtures.js';
import { loadProductionE2E } from './e2e/support/production-env.js';

// E2E contra o ambiente publicado, não contra o local: sem servidor próprio e
// sem seed — a conta de verificação já existe em produção. Só os testes que
// não dependem de dados semeados; roda depois do deploy do front, no CI. Sem
// nova tentativa: falha intermitente em produção também é aviso.
const { baseURL, account } = loadProductionE2E();

export default defineConfig<AccountOptions>({
  testDir: './e2e',
  testMatch: ['smoke.spec.ts', 'hello-world.spec.ts'],
  use: { baseURL, account, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
