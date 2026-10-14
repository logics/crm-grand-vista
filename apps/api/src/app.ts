import type { Database } from '@crm/db';
import type { ApiEnv } from '@crm/shared/env';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { assertRouteAccess, noPermissionRequired } from './authorization/route-access.js';
import type { Auth } from './modules/auth/auth.js';
import { createAuthRoutes } from './modules/auth/routes.js';
import { createPermissionsRoutes } from './modules/permissions/routes.js';
import { createUsersRoutes } from './modules/users/routes.js';
import { createTenantContext, TENANT_PARAM, type TenantEnv } from './tenant-context.js';

interface AppDependencies {
  auth: Auth;
  db: Database;
  env: Pick<ApiEnv, 'WEB_URL'>;
}

// Router raiz. Fora de `/e/:tenant/` ficam só a saúde e a autenticação; cada
// módulo de negócio (`src/modules/<nome>`) se registra em `tenantRoutes`. Toda
// rota declara `requirePermission` ou `noPermissionRequired` (`src/authorization/`): o
// app não é criado com uma rota que não declare.
export function createApp({ auth, db, env }: AppDependencies) {
  // A resolução da empresa vem antes de qualquer rota e vale para todas: não
  // há como registrar um módulo aqui sem passar por ela.
  const tenantRoutes = new Hono<TenantEnv>()
    .use(createTenantContext({ auth, db }))
    .route('/permissions', createPermissionsRoutes())
    .route('/users', createUsersRoutes());

  const app = new Hono()
    // O front roda em outra origem e manda o cookie de sessão: só ela é aceita.
    .use(cors({ origin: env.WEB_URL, credentials: true }))
    .get('/health', noPermissionRequired, (c) => c.json({ status: 'ok' }))
    .route('/auth', createAuthRoutes({ auth, db }))
    .route(`/e/:${TENANT_PARAM}`, tenantRoutes);

  assertRouteAccess(app);
  return app;
}

export type AppType = ReturnType<typeof createApp>;
