import type { Database } from '@crm/db';
import type { ApiEnv } from '@crm/shared/env';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Auth } from './modules/auth/auth.js';
import { createAuthRoutes } from './modules/auth/routes.js';

interface AppDependencies {
  auth: Auth;
  db: Database;
  env: Pick<ApiEnv, 'WEB_URL'>;
}

// Router raiz. Cada módulo de negócio (`src/modules/<nome>`) se registra aqui.
export function createApp({ auth, db, env }: AppDependencies) {
  return new Hono()
    // O front roda em outra origem e manda o cookie de sessão: só ela é aceita.
    .use(cors({ origin: env.WEB_URL, credentials: true }))
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/auth', createAuthRoutes({ auth, db }));
}

export type AppType = ReturnType<typeof createApp>;
