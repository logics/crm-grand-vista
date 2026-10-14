// Declaração de acesso por rota, e a varredura que a exige. Negar por padrão:
// rota sem permissão declarada não é rota liberada, é erro — e o app não sobe
// com ela. A regra falha sozinha, com duzentas rotas e ninguém lembrando dela.
import { FORBIDDEN_MESSAGE, type PermissionCode } from '@crm/shared';
import type { Context, MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { RouterRoute } from 'hono/types';
import { TENANT_PARAM, type TenantEnv } from '../tenant-context.js';

type RouteAccess = { kind: 'permission'; code: PermissionCode } | { kind: 'no_permission' };

/** Os middlewares de declaração, reconhecidos pela identidade — não há outro jeito de forjar um. */
const declarations = new WeakMap<object, RouteAccess>();

interface RequirePermissionOptions {
  /**
   * Dispensa a permissão quando verdadeiro — para a ação que vale sem ela sobre
   * o que é do próprio usuário. Continua declarativo: a rota diz a regra inteira.
   */
  unless?: (c: Context<TenantEnv>) => boolean;
}

/**
 * O handler só executa se a permissão efetiva contiver `code`; senão, 403. Só
 * existe sob `/e/:tenant/`, onde a permissão efetiva já foi resolvida.
 */
export function requirePermission(
  code: PermissionCode,
  { unless }: RequirePermissionOptions = {},
): MiddlewareHandler<TenantEnv> {
  const middleware = createMiddleware<TenantEnv>(async (c, next) => {
    if (!c.var.access.permissions.has(code) && !unless?.(c)) {
      return c.json({ error: { code: 'forbidden', message: FORBIDDEN_MESSAGE } }, 403);
    }
    return next();
  });
  declarations.set(middleware, { kind: 'permission', code });
  return middleware;
}

/**
 * Marcador nominal de rota que não exige permissão do catálogo — o que a spec
 * chama de "rota pública". Não dispensa login: sob `/e/:tenant/` a rota ainda
 * exige sessão e vínculo. Fora de `/e/:tenant/`, só nas rotas de
 * `ROUTES_WITHOUT_TENANT`.
 */
export const noPermissionRequired: MiddlewareHandler = createMiddleware(async (_c, next) => next());
declarations.set(noPermissionRequired, { kind: 'no_permission' });

/**
 * As únicas rotas fora de `/e/:tenant/`: saúde e autenticação, que
 * legitimamente ainda não têm empresa. Entrar nesta lista é decisão de revisão.
 */
export const ROUTES_WITHOUT_TENANT: readonly string[] = [
  'GET /health',
  'POST /auth/login',
  'POST /auth/logout',
  'GET /auth/session',
];

const TENANT_PREFIX = `/e/:${TENANT_PARAM}`;
const isUnderTenant = (path: string) => path === TENANT_PREFIX || path.startsWith(`${TENANT_PREFIX}/`);

// Subapp com `onError` próprio tem o handler embrulhado pelo Hono, que guarda o
// original nesta chave.
const COMPOSED_HANDLER = '__COMPOSED_HANDLER';
const unwrap = (handler: object): object =>
  (handler as Record<string, object | undefined>)[COMPOSED_HANDLER] ?? handler;

// `use()` registra o middleware como `ALL` num caminho terminado em `*`; `all()`
// num caminho concreto é rota, e é varrida como as outras.
const isMiddleware = ({ method, path }: RouterRoute) => method === 'ALL' && path.endsWith('*');

/**
 * Problemas de declaração de acesso no registro de rotas, um por rota, em
 * português. Vazio quando toda rota declara exatamente uma permissão ou o
 * marcador `noPermissionRequired`, e toda rota de negócio está sob `/e/:tenant/`.
 */
export function findRouteAccessViolations(routes: readonly RouterRoute[]): string[] {
  // Validador, middleware e handler de uma rota são entradas com a mesma chave.
  const handlersByRoute = new Map<string, object[]>();
  for (const route of routes) {
    if (isMiddleware(route)) continue;
    const key = `${route.method} ${route.path}`;
    handlersByRoute.set(key, [...(handlersByRoute.get(key) ?? []), unwrap(route.handler)]);
  }

  return [...handlersByRoute].flatMap(([key, handlers]) => {
    const declared = handlers.flatMap((handler) => declarations.get(handler) ?? []);
    const [access] = declared;
    if (!access) return [`${key}: não declara permissão nem noPermissionRequired`];
    if (declared.length > 1) return [`${key}: declara acesso mais de uma vez`];

    const path = key.slice(key.indexOf(' ') + 1);
    if (isUnderTenant(path)) return [];
    if (access.kind === 'permission') return [`${key}: rota de negócio fora de ${TENANT_PREFIX}/`];
    if (!ROUTES_WITHOUT_TENANT.includes(key)) return [`${key}: fora de ${TENANT_PREFIX}/ e fora da lista de rotas sem empresa`];
    return [];
  });
}

/** Recusa o registro de rotas com qualquer problema de declaração de acesso. */
export function assertRouteAccess(app: { routes: readonly RouterRoute[] }): void {
  const violations = findRouteAccessViolations(app.routes);
  if (violations.length > 0) {
    throw new Error(`Rotas sem declaração de acesso válida:\n${violations.map((line) => `- ${line}`).join('\n')}`);
  }
}
