// Ambiente do E2E contra produção, validado pelo módulo de ambiente: a URL
// publicada do front e a conta de verificação. Variável ausente derruba a
// execução nomeando-a, antes de abrir o navegador.
import { loadE2EProductionEnv } from '../../packages/shared/src/env.js';
import type { E2EAccount } from './fixtures.js';

export function loadProductionE2E(): { baseURL: string; account: E2EAccount } {
  const env = loadE2EProductionEnv();
  return {
    baseURL: env.E2E_BASE_URL,
    account: {
      name: env.E2E_USER_NAME,
      email: env.E2E_USER_EMAIL,
      password: env.E2E_USER_PASSWORD,
      tenant: { slug: env.E2E_TENANT_SLUG, name: env.E2E_TENANT_NAME },
    },
  };
}
