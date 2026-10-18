// API falsa na borda HTTP: o `fetch` global é trocado por estas respostas, e
// todo o resto — cliente RPC, TanStack Query, roteador, formulário — é o código
// de produção. Responde só as rotas de `/auth`, com os contratos de `@crm/shared`.
import { INVALID_CREDENTIALS_MESSAGE, type LoginInput, type Session } from '@crm/shared';
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
}

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function stubFakeApi({
  session: initial = null,
  account,
  loginFails = false,
  logoutFails = false,
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
      return json({ error: { code: 'not_found', message: 'Rota inexistente na API falsa.' } }, 404);
    }),
  );

  return api;
}
