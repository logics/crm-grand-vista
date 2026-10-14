// Varredura do registro de rotas e o middleware de permissão, sem banco. O app
// real é montado com dependências vazias: montar não toca nelas, e é na
// montagem que a varredura roda.
import type { Database } from '@crm/db';
import type { PermissionCode } from '@crm/shared';
import { Hono, type MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { describe, expect, it } from 'vitest';
import { buildEffectiveAccess } from '../../src/authorization/effective-access.js';
import {
  assertRouteAccess,
  findRouteAccessViolations,
  noPermissionRequired,
  requirePermission,
  ROUTES_WITHOUT_TENANT,
} from '../../src/authorization/route-access.js';
import { createApp } from '../../src/app.js';
import type { Auth } from '../../src/modules/auth/auth.js';
import type { TenantEnv } from '../../src/tenant-context.js';

const USER_ID = '0190a5e0-0000-7000-8000-000000000001';
const OTHER_ID = '0190a5e0-0000-7000-8000-000000000002';

const buildRealApp = () => createApp({ auth: {} as Auth, db: {} as Database, env: { WEB_URL: 'http://localhost:5173' } });

/** Um app de empresa com a permissão efetiva dada, como o contexto de empresa a deixaria. */
function tenantApp(permissions: PermissionCode[], register: (app: Hono<TenantEnv>) => void) {
  const access = buildEffectiveAccess(USER_ID, [{ permissions, dataScopes: [] }]);
  const routes = new Hono<TenantEnv>().use(
    createMiddleware<TenantEnv>(async (c, next) => {
      c.set('userId', USER_ID);
      c.set('access', access);
      await next();
    }),
  );
  register(routes);
  return new Hono().route('/e/:tenant', routes);
}

const handler: MiddlewareHandler = async (c) => c.json({ ok: true }, 200);

describe('varredura de rotas', () => {
  it('o app real declara acesso em toda rota', () => {
    const app = buildRealApp();

    expect(app.routes.length).toBeGreaterThan(0);
    expect(findRouteAccessViolations(app.routes)).toEqual([]);
  });

  it('o app real tem fora de /e/:tenant/ exatamente as rotas da lista nominal', () => {
    const outside = new Set(
      buildRealApp()
        .routes.filter((route) => route.method !== 'ALL' && !route.path.startsWith('/e/:tenant'))
        .map((route) => `${route.method} ${route.path}`),
    );

    expect([...outside].sort()).toEqual([...ROUTES_WITHOUT_TENANT].sort());
  });

  it('acusa a rota que não declara permissão nem noPermissionRequired, também quando há validador', () => {
    const app = tenantApp([], (routes) => {
      routes.get('/farms', handler);
      routes.post('/farms', createMiddleware(async (_c, next) => next()), handler);
    });

    expect(findRouteAccessViolations(app.routes)).toEqual([
      'GET /e/:tenant/farms: não declara permissão nem noPermissionRequired',
      'POST /e/:tenant/farms: não declara permissão nem noPermissionRequired',
    ]);
  });

  it('acusa rota registrada por all() num caminho concreto', () => {
    const app = new Hono().all('/e/:tenant/farms', handler);

    expect(findRouteAccessViolations(app.routes)).toEqual([
      'ALL /e/:tenant/farms: não declara permissão nem noPermissionRequired',
    ]);
  });

  it('acusa rota de negócio fora de /e/:tenant/, com permissão ou sem ela', () => {
    const app = new Hono()
      .get('/farms', requirePermission('fazendas.ver'), handler)
      .get('/reports', noPermissionRequired, handler);

    expect(findRouteAccessViolations(app.routes)).toEqual([
      'GET /farms: rota de negócio fora de /e/:tenant/',
      'GET /reports: fora de /e/:tenant/ e fora da lista de rotas sem empresa',
    ]);
  });

  it('acusa rota que declara acesso duas vezes', () => {
    const app = tenantApp([], (routes) => {
      routes.get('/farms', noPermissionRequired, requirePermission('fazendas.ver'), handler);
    });

    expect(findRouteAccessViolations(app.routes)).toEqual(['GET /e/:tenant/farms: declara acesso mais de uma vez']);
  });

  it('reconhece a declaração mesmo em subapp com tratador de erro próprio', () => {
    const sub = new Hono<TenantEnv>().get('/farms', requirePermission('fazendas.ver'), handler);
    sub.onError((_error, c) => c.text('erro', 500));
    const app = new Hono().route('/e/:tenant', sub);

    expect(findRouteAccessViolations(app.routes)).toEqual([]);
  });

  it('não sobe o app com rota sem declaração, e nomeia a rota', () => {
    const app = tenantApp([], (routes) => routes.get('/farms', handler));

    expect(() => assertRouteAccess(app)).toThrow(/GET \/e\/:tenant\/farms/);
  });
});

describe('middleware de permissão', () => {
  it('com a permissão exigida, executa o handler', async () => {
    const app = tenantApp(['configuracoes.gerenciar'], (routes) => {
      routes.get('/settings', requirePermission('configuracoes.gerenciar'), handler);
    });

    const response = await app.request('/e/grand-vista/settings');

    expect(response.status).toBe(200);
  });

  it('sem ela, responde 403 sem executar o handler', async () => {
    let executed = false;
    const app = tenantApp(['fazendas.ver'], (routes) => {
      routes.get('/settings', requirePermission('configuracoes.gerenciar'), async (c) => {
        executed = true;
        return c.json({ ok: true }, 200);
      });
    });

    const response = await app.request('/e/grand-vista/settings');

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: 'forbidden', message: 'Você não tem permissão para esta ação.' },
    });
    expect(executed).toBe(false);
  });

  it('a dispensa declarada na rota vale sem a permissão, e só quando é verdadeira', async () => {
    const app = tenantApp([], (routes) => {
      routes.patch(
        '/users/:id',
        requirePermission('usuarios.gerenciar', { unless: (c) => c.req.param('id') === c.var.userId }),
        handler,
      );
    });

    expect((await app.request(`/e/grand-vista/users/${USER_ID}`, { method: 'PATCH' })).status).toBe(200);
    expect((await app.request(`/e/grand-vista/users/${OTHER_ID}`, { method: 'PATCH' })).status).toBe(403);
  });
});
