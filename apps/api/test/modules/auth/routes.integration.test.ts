// Login, sessão corrente e logout contra o Postgres real, pelo mesmo `createApp`
// que produção sobe. Nada aqui é mockado: a sessão é a linha em `sessions`.
import { createDatabase, createPool, sessions, users, type Database } from '@crm/db';
import { INVALID_CREDENTIALS_MESSAGE } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { cookiesOf } from '../../support/http.js';

const env = loadApiEnv();

const countSessions = (db: Database, userId: string): Promise<number> =>
  db.semTenant({ reason: 'cli' }, async (tx) => {
    const rows = await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
    return rows.length;
  });

const lastLoginOf = (db: Database, userId: string): Promise<Date | null> =>
  db.semTenant({ reason: 'cli' }, async (tx) => {
    const [row] = await tx.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.id, userId));
    return row?.lastLoginAt ?? null;
  });

describe('rotas de autenticação', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  const login = (email: string, password: string) =>
    app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const currentSession = (cookie?: string) =>
    app.request('/auth/session', { headers: cookie ? { cookie } : {} });

  const logout = (cookie: string) => app.request('/auth/logout', { method: 'POST', headers: { cookie } });

  let user: Awaited<ReturnType<typeof createUserWithPassword>>;
  let defaultTenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;

  beforeAll(async () => {
    user = await createUserWithPassword(db, 'Maria Corretora');
    defaultTenant = await createTenant(db, 'auth-padrao');
    otherTenant = await createTenant(db, 'auth-outra');
    const unrelatedTenant = await createTenant(db, 'auth-alheia');
    const stranger = await createUserWithPassword(db, 'Usuário de outra empresa');

    await createMembership(db, user.id, otherTenant.id);
    await createMembership(db, user.id, defaultTenant.id, { isDefault: true });
    await createMembership(db, stranger.id, unrelatedTenant.id, { isDefault: true });
  });

  afterAll(() => pool.end());

  describe('login', () => {
    it('com credencial válida cria a sessão no banco e a entrega em cookie httpOnly', async () => {
      const before = await countSessions(db, user.id);

      const response = await login(user.email, user.password);

      expect(response.status).toBe(200);
      expect(await countSessions(db, user.id)).toBe(before + 1);

      const sessionCookie = response.headers.getSetCookie().find((cookie) => cookie.includes('session_token'));
      expect(sessionCookie).toMatch(/;\s*HttpOnly/i);
      expect(sessionCookie).toMatch(/;\s*SameSite=Lax/i);
    });

    it('devolve o usuário serializado e as empresas vinculadas', async () => {
      const response = await login(user.email, user.password);

      expect(await response.json()).toEqual({
        user: { id: user.id, name: user.name, email: user.email, image: null },
        tenants: expect.arrayContaining([
          { slug: defaultTenant.slug, name: defaultTenant.name, isDefault: true, blocked: false },
          { slug: otherTenant.slug, name: otherTenant.name, isDefault: false, blocked: false },
        ]),
      });
    });

    it('não distingue e-mail inexistente de senha errada', async () => {
      const wrongPassword = await login(user.email, 'senha-errada');
      const unknownEmail = await login('ninguem@teste.local', user.password);

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);

      const wrongPasswordBody = await wrongPassword.text();
      expect(await unknownEmail.text()).toBe(wrongPasswordBody);
      expect(JSON.parse(wrongPasswordBody)).toEqual({
        error: { code: 'invalid_credentials', message: INVALID_CREDENTIALS_MESSAGE },
      });
    });

    it('com credencial inválida não cria sessão nem emite cookie', async () => {
      const before = await countSessions(db, user.id);

      const response = await login(user.email, 'senha-errada');

      expect(response.headers.getSetCookie()).toEqual([]);
      expect(await countSessions(db, user.id)).toBe(before);
    });

    it('registra o instante do último login no usuário', async () => {
      const fresh = await createUserWithPassword(db, 'Primeiro acesso');
      expect(await lastLoginOf(db, fresh.id)).toBeNull();

      const startedAt = Date.now();
      await login(fresh.email, fresh.password);
      const first = await lastLoginOf(db, fresh.id);
      await login(fresh.email, fresh.password);
      const second = await lastLoginOf(db, fresh.id);

      // Tolerância de 1s para diferença de relógio entre o teste e o banco.
      expect(first!.getTime()).toBeGreaterThanOrEqual(startedAt - 1000);
      expect(second!.getTime()).toBeGreaterThan(first!.getTime());
    });

    it('não mexe no último login quando a credencial é inválida nem ao consultar a sessão', async () => {
      const cookie = cookiesOf(await login(user.email, user.password));
      const before = await lastLoginOf(db, user.id);

      await login(user.email, 'senha-errada');
      await currentSession(cookie);

      expect(await lastLoginOf(db, user.id)).toEqual(before);
    });

    it('recusa corpo malformado com 400, sem consultar credencial', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'nao-e-email' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('sessão corrente', () => {
    it('devolve o usuário e as empresas vinculadas, com a padrão marcada', async () => {
      const cookie = cookiesOf(await login(user.email, user.password));

      const response = await currentSession(cookie);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { user: unknown; tenants: { slug: string; isDefault: boolean }[] };
      expect(body.user).toEqual({ id: user.id, name: user.name, email: user.email, image: null });
      // A padrão vem primeiro; só as empresas do próprio usuário aparecem.
      expect(body.tenants).toEqual([
        { slug: defaultTenant.slug, name: defaultTenant.name, isDefault: true, blocked: false },
        { slug: otherTenant.slug, name: otherTenant.name, isDefault: false, blocked: false },
      ]);
    });

    it('devolve lista vazia para usuário sem vínculo', async () => {
      const loose = await createUserWithPassword(db, 'Sem vínculo');
      const cookie = cookiesOf(await login(loose.email, loose.password));

      const response = await currentSession(cookie);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ tenants: [] });
    });

    it('responde 401 sem cookie de sessão', async () => {
      const response = await currentSession();

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: 'unauthenticated', message: 'Sessão ausente ou expirada.' },
      });
    });

    it('responde 401 com cookie adulterado', async () => {
      const cookie = cookiesOf(await login(user.email, user.password));

      const response = await currentSession(cookie.replace(/session_token=[^.;]+/, 'session_token=forjado'));

      expect(response.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('invalida a sessão no servidor: o cookie antigo deixa de valer', async () => {
      const cookie = cookiesOf(await login(user.email, user.password));
      const before = await countSessions(db, user.id);
      expect((await currentSession(cookie)).status).toBe(200);

      const response = await logout(cookie);

      expect(response.status).toBe(204);
      expect(await countSessions(db, user.id)).toBe(before - 1);
      // Quem guardou o cookie — e não só o navegador que o apagou — perde o acesso.
      expect((await currentSession(cookie)).status).toBe(401);
    });

    it('manda o navegador apagar o cookie', async () => {
      const cookie = cookiesOf(await login(user.email, user.password));

      const response = await logout(cookie);

      const cleared = response.headers.getSetCookie().find((item) => item.includes('session_token'));
      expect(cleared).toMatch(/Max-Age=0/i);
    });

    it('não derruba as outras sessões do mesmo usuário', async () => {
      const first = cookiesOf(await login(user.email, user.password));
      const second = cookiesOf(await login(user.email, user.password));

      await logout(first);

      expect((await currentSession(second)).status).toBe(200);
    });
  });

  describe('superfície exposta', () => {
    it('não revela a flag de super admin em nenhuma resposta de autenticação', async () => {
      const superAdmin = await createUserWithPassword(db, 'Usuário comum', { isSuperAdmin: true });

      const loginResponse = await login(superAdmin.email, superAdmin.password);
      const loginBody = await loginResponse.text();
      const sessionBody = await (await currentSession(cookiesOf(loginResponse))).text();

      expect(loginResponse.status).toBe(200);
      expect(`${loginBody}${sessionBody}`).not.toMatch(/super/i);
    });

    it.each([
      ['cadastro', '/api/auth/sign-up/email'],
      ['login da biblioteca', '/api/auth/sign-in/email'],
      ['criação de organização', '/api/auth/organization/create'],
    ])('não expõe a rota de %s do Better Auth', async (_name, path) => {
      const response = await app.request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Intruso', email: 'intruso@teste.local', password: 'senha-do-intruso' }),
      });

      expect(response.status).toBe(404);
    });
  });
});
