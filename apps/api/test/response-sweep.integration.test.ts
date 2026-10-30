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
import { loginAs } from './support/http.js';

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

/** Quem tenta descobrir a flag manda a flag: a resposta não pode ecoá-la. */
const FLAG_PROBE = { is_super_admin: true, isSuperAdmin: true };

/**
 * Uma requisição válida por rota, chaveada por `MÉTODO caminho` como o Hono a
 * registra. Rota nova entra aqui com um corpo que a faça responder 2xx. As
 * rotas de empresa usam o slug da empresa da varredura.
 */
const SAMPLES: Record<string, (actor: Actor, tenantSlug: string) => Sample> = {
  'GET /health': () => ({ path: '/health' }),
  'POST /auth/login': ({ credentials }) => ({
    path: '/auth/login',
    body: {
      email: credentials?.email ?? 'ninguem@teste.local',
      password: credentials?.password ?? 'senha-qualquer',
      ...FLAG_PROBE,
    },
  }),
  'POST /auth/logout': () => ({ path: '/auth/logout' }),
  'GET /auth/session': () => ({ path: '/auth/session' }),
  'GET /e/:tenant/municipalities': (_actor, tenantSlug) => ({ path: `/e/${tenantSlug}/municipalities?q=rio` }),
  'GET /e/:tenant/permissions': (_actor, tenantSlug) => ({ path: `/e/${tenantSlug}/permissions` }),
  'GET /e/:tenant/permissions/effective': (_actor, tenantSlug) => ({ path: `/e/${tenantSlug}/permissions/effective` }),
  'GET /e/:tenant/users': (_actor, tenantSlug) => ({ path: `/e/${tenantSlug}/users` }),
  'PATCH /e/:tenant/users/:id': ({ credentials }, tenantSlug) => ({
    // Cada um altera o próprio usuário; o anônimo aponta para um id qualquer.
    path: `/e/${tenantSlug}/users/${credentials?.id ?? '00000000-0000-7000-8000-000000000000'}`,
    body: { name: credentials?.name ?? 'Ninguém', ...FLAG_PROBE },
  }),
  'GET /e/:tenant/users/:id/history': ({ credentials }, tenantSlug) => ({
    // Cada um lê o próprio histórico; o anônimo aponta para um id qualquer.
    path: `/e/${tenantSlug}/users/${credentials?.id ?? '00000000-0000-7000-8000-000000000000'}/history`,
  }),
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
  let tenantSlug: string;

  beforeAll(async () => {
    const tenant = await createTenant(db, 'varredura');
    tenantSlug = tenant.slug;
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
  const cookieFor = async ({ credentials }: Actor): Promise<string | null> =>
    credentials ? loginAs(app, credentials) : null;

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
        const sample = SAMPLES[route]?.(actor, tenantSlug);
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
