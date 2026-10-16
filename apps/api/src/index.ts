import { serve } from '@hono/node-server';
import { assertApplicationRole, createDatabase, createPool, UnsafeApplicationRoleError } from '@crm/db';
import { InvalidEnvError, loadApiEnv, type ApiEnv } from '@crm/shared/env';
import { createApp } from './app.js';
import { createAuth } from './modules/auth/auth.js';

// Boot que falha é o comportamento desejado: o painel mantém o processo
// anterior, e o erro aparece no log em vez de em produção.
function refuseBoot(reason: string): never {
  console.error(`A API não subiu. ${reason}`);
  process.exit(1);
}

// Ambiente validado antes de qualquer outra coisa: variável faltando derruba o
// boot com o nome dela, em vez de virar `undefined` numa query em produção.
function loadEnvOrExit(): ApiEnv {
  try {
    return loadApiEnv();
  } catch (error) {
    if (!(error instanceof InvalidEnvError)) throw error;
    refuseBoot(error.message);
  }
}

const env = loadEnvOrExit();
const pool = createPool(env.DATABASE_URL);

// Mesma verificação da suíte (`packages/db/test/roles.integration.test.ts`),
// agora contra o processo que está rodando: pega a string de conexão editada à
// mão no servidor, que nenhum teste vê.
try {
  await assertApplicationRole(pool);
} catch (error) {
  if (!(error instanceof UnsafeApplicationRoleError)) throw error;
  refuseBoot(error.message);
}

const db = createDatabase(pool);
const app = createApp({ auth: createAuth({ db, env }), db, env });

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  console.log(`API ouvindo na porta ${port} (${env.API_URL})`);
});
