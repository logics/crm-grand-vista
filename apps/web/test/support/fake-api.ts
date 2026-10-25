// API falsa na borda HTTP: o `fetch` global é trocado por estas respostas, e
// todo o resto — cliente RPC, TanStack Query, roteador, formulário — é o código
// de produção. Responde as rotas de `/auth`, a entrada na empresa
// (`/e/:tenant/permissions/effective`) e registros avulsos de empresa, com os
// contratos de `@crm/shared`.
import {
  INVALID_CREDENTIALS_MESSAGE,
  type PermissionCode,
  TENANT_BLOCKED_MESSAGE,
  TENANT_NOT_FOUND_MESSAGE,
  type LoginInput,
  type Session,
  type SessionTenant,
} from '@crm/shared';
import { vi } from 'vitest';

interface FakeApiOptions {
  /** Sessão já aberta ao montar a aplicação. */
  session?: Session | null;
  /** A conta que o login aceita, e a sessão que ele abre. */
  account?: LoginInput & { session: Session };
  /** Força uma falha do servidor em `/auth/login`. */
  loginFails?: boolean;
  /** Força uma falha do servidor em `/auth/logout`: a sessão continua aberta. */
  logoutFails?: boolean;
  /**
   * Empresas em que a sessão entra mesmo sem vínculo — o super admin. As
   * vinculadas entram, salvo as bloqueadas (403); as demais, 404.
   */
  extraTenants?: string[];
  /** Permissões efetivas do usuário em toda empresa em que entra. */
  permissions?: PermissionCode[];
  /**
   * Registros de empresa por caminho (`/e/norte/farms/1`), ou por caminho e
   * query quando ela importa (`/e/norte/users/1/history?cursor=c2`): GET
   * devolve o corpo, ou 404. Uma `FakeResponse` responde por conta própria —
   * falha do servidor, resposta que demora.
   */
  records?: Record<string, unknown>;
}

/** Resposta montada pelo teste, a cada pedido: `() => new Response(null, { status: 500 })`. */
export type FakeResponse = () => Response | Promise<Response>;

export interface FakeApi {
  /** Requisições recebidas, na ordem: método, caminho e o `RequestInit`. */
  requests: { method: string; path: string; init: RequestInit | undefined }[];
}

export function session(overrides: Partial<Session> = {}): Session {
  return {
    user: { id: '01900000-0000-7000-8000-000000000001', name: 'Ana Ribeiro', email: 'ana@grandvista.com.br', image: null },
    tenants: [{ slug: 'grand-vista', name: 'Grand Vista', isDefault: true, blocked: false }],
    ...overrides,
  };
}

/** Empresa da sessão; o nome, se omitido, é o slug. */
export function sessionTenant(
  slug: string,
  { name = slug, isDefault = false, blocked = false }: Partial<Omit<SessionTenant, 'slug'>> = {},
): SessionTenant {
  return { slug, name, isDefault, blocked };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function stubFakeApi({
  session: initial = null,
  account,
  loginFails = false,
  logoutFails = false,
  extraTenants = [],
  permissions = [],
  records = {},
}: FakeApiOptions = {}): FakeApi {
  let current = initial;
  const api: FakeApi = { requests: [] };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const method = init?.method ?? 'GET';
      api.requests.push({ method, path: url.pathname, init });

      if (method === 'GET' && url.pathname === '/auth/session') {
        return current
          ? json(current)
          : json({ error: { code: 'unauthenticated', message: 'Sessão expirada.' } }, 401);
      }
      if (method === 'POST' && url.pathname === '/auth/login') {
        if (loginFails) return json({ error: { code: 'internal', message: 'Erro interno.' } }, 500);
        const body = JSON.parse(String(init?.body)) as LoginInput;
        if (account && body.email === account.email && body.password === account.password) {
          current = account.session;
          return json(current);
        }
        return json({ error: { code: 'invalid_credentials', message: INVALID_CREDENTIALS_MESSAGE } }, 401);
      }
      if (method === 'POST' && url.pathname === '/auth/logout') {
        if (logoutFails) return json({ error: { code: 'internal', message: 'Erro interno.' } }, 500);
        current = null;
        return new Response(null, { status: 204 });
      }
      const tenantPath = /^\/e\/([^/]+)(\/.*)$/.exec(url.pathname);
      if (method === 'GET' && tenantPath) {
        const slug = decodeURIComponent(tenantPath[1] ?? '');
        const linked = current?.tenants.find((item) => item.slug === slug);
        if (!current) return json({ error: { code: 'unauthenticated', message: 'Sessão expirada.' } }, 401);
        if (!linked && !extraTenants.includes(slug)) {
          return json({ error: { code: 'tenant_not_found', message: TENANT_NOT_FOUND_MESSAGE } }, 404);
        }
        if (linked?.blocked) return json({ error: { code: 'tenant_blocked', message: TENANT_BLOCKED_MESSAGE } }, 403);
        if (tenantPath[2] === '/permissions/effective') return json({ permissions, dataScopes: {} });
        const key = [url.pathname + url.search, url.pathname].find((candidate) => candidate in records);
        if (key !== undefined) {
          const record = records[key];
          return typeof record === 'function' ? (record as FakeResponse)() : json(record);
        }
        return json({ error: { code: 'not_found', message: 'Registro não encontrado.' } }, 404);
      }
      return json({ error: { code: 'not_found', message: 'Rota inexistente na API falsa.' } }, 404);
    }),
  );

  return api;
}
