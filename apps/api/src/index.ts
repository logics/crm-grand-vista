import { serve } from '@hono/node-server';
import { createDatabase, createPool } from '@crm/db';
import { InvalidEnvError, loadApiEnv, type ApiEnv } from '@crm/shared/env';
import { createApp } from './app.js';
import { createAuth } from './modules/auth/auth.js';

// Ambiente validado antes de qualquer outra coisa: variável faltando derruba o
// boot com o nome dela, em vez de virar `undefined` numa query em produção.
function loadEnvOrExit(): ApiEnv {
  try {
    return loadApiEnv();
  } catch (error) {
    if (!(error instanceof InvalidEnvError)) throw error;
    console.error(`A API não subiu. ${error.message}`);
    process.exit(1);
  }
}

const env = loadEnvOrExit();
const db = createDatabase(createPool(env.DATABASE_URL));
const app = createApp({ auth: createAuth({ db, env }), db, env });

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  console.log(`API ouvindo na porta ${port} (${env.API_URL})`);
});
