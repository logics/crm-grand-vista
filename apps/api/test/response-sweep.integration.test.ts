// Varredura das respostas da API: toda rota registrada é chamada por cada tipo
// de usuário, e nenhuma resposta pode trazer a flag de super admin — nem no
// corpo, nem nos cabeçalhos. A lista de rotas vem do próprio app, não deste
// arquivo: rota nova sem amostra aqui falha a suíte.
import { createDatabase, createPool } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/modules/auth/auth.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from './support/fixtures.js';

const env = loadApiEnv();

type Credentials = Awaited<ReturnType<typeof createUserWithPassword>>;

interface Actor {
  label: string;
  /** Nulo para a requisição anônima. */
  credentials: Credentials | null;
}

interface Sample {
  path: string;
  body?: unknown;
}

/**
 * Uma requisição válida por rota, chaveada por `MÉTODO caminho` como o Hono a
 * registra. Rota nova entra aqui com um corpo que a faça responder 2xx.
 */
const SAMPLES: Record<string, (actor: Actor) => Sample> = {
  'GET /health': () => ({ path: '/health' }),
  'POST /auth/login': ({ credentials }) => ({
    path: '/auth/login',
    body: {
      email: credentials?.email ?? 'ninguem@teste.local',
      password: credentials?.password ?? 'senha-qualquer',
      // Quem tenta descobrir a flag manda a flag: a resposta não pode ecoá-la.
      is_super_admin: true,
      isSuperAdmin: true,
    },
  }),
  'POST /auth/logout': () => ({ path: '/auth/logout' }),
  'GET /auth/session': () => ({ path: '/auth/session' }),
};

/** A flag em qualquer grafia: `is_super_admin`, `isSuperAdmin`, `super-admin`. */
const SUPER_ADMIN_TRACE = /super/i;

describe('varredura das respostas da API', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  // `ALL` é middleware (`use`), não rota; validador e handler repetem a mesma chave.
  const routes = [
    ...new Set(app.routes.filter((route) => route.method !== 'ALL').map((route) => `${route.method} ${route.path}`)),
  ].sort();

  const actors: Actor[] = [{ label: 'anônimo', credentials: null }];

  beforeAll(async () => {
    const tenant = await createTenant(db, 'varredura');
    // Os nomes não dizem quem tem a flag: a varredura procura a palavra na resposta.
    const commonUser = await createUserWithPassword(db, 'Bruno Corretor');
    const superAdmin = await createUserWithPassword(db, 'Ana Gestora', { isSuperAdmin: true });
    const bareSuperAdmin = await createUserWithPassword(db, 'Carla Sem Vínculo', { isSuperAdmin: true });

    for (const user of [commonUser, superAdmin]) {
      await createMembership(db, user.id, tenant.id, { isDefault: true });
      await createLinkedAccessProfile(db, tenant.id, user.id, `Perfil de ${user.name}`);
    }

    actors.push(
      { label: 'usuário comum', credentials: commonUser },
      { label: 'super admin com vínculo e perfil', credentials: superAdmin },
      { label: 'super admin sem vínculo', credentials: bareSuperAdmin },
    );
  });

  afterAll(() => pool.end());

  /** Sessão nova por requisição: a rota de logout não derruba a amostra seguinte. */
  const cookieFor = async ({ credentials }: Actor): Promise<string | null> => {
    if (!credentials) return null;
    const response = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  };

  const call = async (route: string, sample: Sample, actor: Actor) => {
    const method = route.slice(0, route.indexOf(' '));
    const { path, body } = sample;
    const cookie = await cookieFor(actor);

    const response = await app.request(path, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const headers = [...response.headers].map(([name, value]) => `${name}: ${value}`).join('\n');

    return { status: response.status, text: `${headers}\n${await response.text()}` };
  };

  it('toda rota registrada tem amostra, e toda amostra é de rota que existe', () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(Object.keys(SAMPLES).sort()).toEqual(routes);
  });

  it('nenhuma resposta traz a flag de super admin, para nenhum tipo de usuário', async () => {
    const leaks: string[] = [];
    const answered = new Set<string>();

    for (const route of routes) {
      for (const actor of actors) {
        // Rota sem amostra já falha o teste acima; aqui ela conta como não respondida.
        const sample = SAMPLES[route]?.(actor);
        if (!sample) continue;
        const { status, text } = await call(route, sample, actor);

        if (SUPER_ADMIN_TRACE.test(text)) leaks.push(`${route} como ${actor.label} (${status})`);
        if (actor.credentials && status >= 200 && status < 300) answered.add(route);
      }
    }

    expect(leaks).toEqual([]);
    // Amostra que só colhe 4xx não prova nada: toda rota respondeu 2xx a alguém logado.
    expect(routes.filter((route) => !answered.has(route))).toEqual([]);
  });
});
