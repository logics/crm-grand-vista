import { serve } from '@hono/node-server';
import { InvalidEnvError, loadApiEnv, type ApiEnv } from '@crm/shared/env';
import { createApp } from './app.js';

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

serve({ fetch: createApp().fetch, port: env.PORT }, ({ port }) => {
  console.log(`API ouvindo na porta ${port} (${env.API_URL})`);
});
