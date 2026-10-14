// Resolução da empresa ativa contra o Postgres real, pelo mesmo `createApp` que
// produção sobe: a URL pede uma empresa, o vínculo é que autoriza, e só então a
// transação recebe o contexto. O super admin é a exceção: entra em qualquer
// empresa que exista, pelo caminho nominal `semTenant()`.
import { createDatabase, createPool, memberships, tenants, type Database } from '@crm/db';
import { TENANT_BLOCKED_MESSAGE, TENANT_NOT_FOUND_MESSAGE } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/modules/auth/auth.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from './support/fixtures.js';
import { jsonRequest, loginAs } from './support/http.js';

const env = loadApiEnv();

type Tenant = Awaited<ReturnType<typeof createTenant>>;
type User = Awaited<ReturnType<typeof createUserWithPassword>>;

interface TeamResponse {
  users: { id: string; accessProfiles: { name: string }[] }[];
}

describe('resolução da empresa ativa', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  /**
   * Empresas que chegaram a uma transação com contexto, na ordem das chamadas:
   * o id puro por `withTenant()`, prefixado por `semTenant()` do super admin.
   */
  const appliedTenants: string[] = [];
  const recording: Database = {
    withTenant: (tenantId, fn) => {
      appliedTenants.push(tenantId);
      return db.withTenant(tenantId, fn);
    },
    semTenant: (context, fn) => {
      if (context.reason === 'super_admin') appliedTenants.push(`super_admin:${context.tenantId}`);
      return db.semTenant(context, fn);
    },
  };
  const app = createApp({ auth: createAuth({ db: recording, env }), db: recording, env });

  let north: Tenant;
  let south: Tenant;
  let foreign: Tenant;
  let member: User;
  let foreigner: User;
  let superAdmin: User;

  const teamPath = (slug: string) => `/e/${slug}/users`;
  const userPath = (slug: string, userId: string) => `/e/${slug}/users/${userId}`;

  const listTeam = (slug: string, cookie?: string) =>
    app.request(teamPath(slug), { headers: cookie ? { cookie } : {} });

  const renameUser = (slug: string, userId: string, cookie?: string) =>
    app.request(userPath(slug, userId), jsonRequest('PATCH', { name: 'Nome trocado' }, cookie));

  beforeAll(async () => {
    north = await createTenant(db, 'contexto-norte');
    south = await createTenant(db, 'contexto-sul');
    foreign = await createTenant(db, 'contexto-alheia');
    member = await createUserWithPassword(db, 'Marina de Duas Empresas');
    foreigner = await createUserWithPassword(db, 'Fábio da Alheia');
    superAdmin = await createUserWithPassword(db, 'Sônia Sem Vínculo Nenhum', { isSuperAdmin: true });

    await createMembership(db, member.id, north.id, { isDefault: true });
    await createMembership(db, member.id, south.id);
    await createMembership(db, foreigner.id, foreign.id, { isDefault: true });

    // Perfis de acesso estão sob RLS: o que a listagem devolve diz qual empresa a transação recebeu.
    await createLinkedAccessProfile(db, north.id, member.id, 'Perfil do Norte');
    await createLinkedAccessProfile(db, south.id, member.id, 'Perfil do Sul');
    await createLinkedAccessProfile(db, foreign.id, foreigner.id, 'Perfil da Alheia');
  });

  afterAll(() => pool.end());

  describe('sem sessão', () => {
    it('responde 401, exista a empresa ou não, com o mesmo corpo da sessão corrente', async () => {
      const existing = await listTeam(north.slug);
      const missing = await listTeam('empresa-que-nao-existe');

      expect(existing.status).toBe(401);
      expect(missing.status).toBe(401);

      const body = await existing.text();
      expect(await missing.text()).toBe(body);
      expect(body).toBe(await (await app.request('/auth/session')).text());
    });
  });

  describe('sem vínculo', () => {
    it('responde 404 na listagem da empresa alheia', async () => {
      const cookie = await loginAs(app, member);

      const response = await listTeam(foreign.slug, cookie);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: 'tenant_not_found', message: TENANT_NOT_FOUND_MESSAGE },
      });
    });

    it('responde 404 por ID direto, e nada é alterado', async () => {
      const cookie = await loginAs(app, member);

      // O ID é de um usuário que existe na empresa alheia — e o do próprio autor também não passa.
      const byForeignId = await renameUser(foreign.slug, foreigner.id, cookie);
      const byOwnId = await renameUser(foreign.slug, member.id, cookie);

      expect(byForeignId.status).toBe(404);
      expect(byOwnId.status).toBe(404);

      const foreignTeam = (await (await listTeam(foreign.slug, await loginAs(app, foreigner))).json()) as {
        users: { name: string }[];
      };
      expect(foreignTeam.users.map((user) => user.name)).toEqual([foreigner.name]);
    });

    it('não abre transação de empresa nenhuma', async () => {
      const cookie = await loginAs(app, member);
      appliedTenants.length = 0;

      await listTeam(foreign.slug, cookie);
      await renameUser(foreign.slug, foreigner.id, cookie);
      await listTeam('empresa-que-nao-existe', cookie);

      expect(appliedTenants).toEqual([]);
    });

    it.each([
      ['na listagem', (slug: string, cookie: string) => listTeam(slug, cookie)],
      ['por ID direto', (slug: string, cookie: string) => renameUser(slug, foreigner.id, cookie)],
    ])('slug inexistente e slug sem vínculo devolvem status e corpo idênticos %s', async (_name, request) => {
      const cookie = await loginAs(app, member);

      const unlinked = await request(foreign.slug, cookie);
      const missing = await request('empresa-que-nao-existe', cookie);

      expect(missing.status).toBe(unlinked.status);
      expect(missing.headers.get('content-type')).toBe(unlinked.headers.get('content-type'));
      expect(await missing.text()).toBe(await unlinked.text());
    });

    it('o corpo do 404 não cita o slug pedido', async () => {
      const cookie = await loginAs(app, member);

      const body = await (await listTeam(foreign.slug, cookie)).text();

      expect(body).not.toContain(foreign.slug);
      expect(body).not.toContain(foreign.name);
    });

    it('quem perde o vínculo perde o acesso na requisição seguinte, com a mesma sessão', async () => {
      const tenant = await createTenant(db, 'contexto-desligamento');
      const leaving = await createUserWithPassword(db, 'Lia de Saída');
      await createMembership(db, leaving.id, tenant.id, { isDefault: true });
      const cookie = await loginAs(app, leaving);
      expect((await listTeam(tenant.slug, cookie)).status).toBe(200);

      await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.delete(memberships).where(and(eq(memberships.userId, leaving.id), eq(memberships.tenantId, tenant.id))),
      );

      expect((await listTeam(tenant.slug, cookie)).status).toBe(404);
    });
  });

  describe('com vínculo', () => {
    it('acessa normalmente, e o wrapper de transação recebe a empresa do slug', async () => {
      const cookie = await loginAs(app, member);
      appliedTenants.length = 0;

      const response = await listTeam(south.slug, cookie);

      expect(response.status).toBe(200);
      // A da permissão efetiva e a do handler: as duas com a empresa do slug.
      expect(appliedTenants).toEqual([south.id, south.id]);

      const { users } = (await response.json()) as TeamResponse;
      expect(users).toEqual([expect.objectContaining({ id: member.id, accessProfiles: [expect.objectContaining({ name: 'Perfil do Sul' })] })]);
    });

    it('o slug é exato: outra caixa ou espaço não resolve a empresa', async () => {
      const cookie = await loginAs(app, member);

      expect((await listTeam(north.slug.toUpperCase(), cookie)).status).toBe(404);
      expect((await listTeam(`${north.slug}%20`, cookie)).status).toBe(404);
    });
  });

  describe('duas empresas ao mesmo tempo', () => {
    const profilesSeenAt = async (slug: string, cookie: string): Promise<string[]> => {
      const { users } = (await (await listTeam(slug, cookie)).json()) as TeamResponse;
      return users.flatMap((user) => user.accessProfiles.map((profile) => profile.name));
    };

    it('duas abas da mesma sessão, uma em cada empresa, não interferem uma na outra', async () => {
      const cookie = await loginAs(app, member);

      // Intercaladas e em paralelo: disputam as conexões do pool.
      const seen = await Promise.all(
        Array.from({ length: 30 }, (_item, index) => profilesSeenAt(index % 2 === 0 ? north.slug : south.slug, cookie)),
      );

      seen.forEach((profiles, index) => {
        expect(profiles).toEqual([index % 2 === 0 ? 'Perfil do Norte' : 'Perfil do Sul']);
      });
    });

    it('duas sessões de usuários diferentes, em empresas diferentes, não interferem uma na outra', async () => {
      const memberCookie = await loginAs(app, member);
      const foreignerCookie = await loginAs(app, foreigner);

      const seen = await Promise.all(
        Array.from({ length: 30 }, (_item, index) =>
          index % 2 === 0 ? profilesSeenAt(north.slug, memberCookie) : profilesSeenAt(foreign.slug, foreignerCookie),
        ),
      );

      seen.forEach((profiles, index) => {
        expect(profiles).toEqual([index % 2 === 0 ? 'Perfil do Norte' : 'Perfil da Alheia']);
      });
    });

    it('a empresa da requisição anterior não vaza para a seguinte na mesma sessão', async () => {
      const cookie = await loginAs(app, member);

      expect(await profilesSeenAt(north.slug, cookie)).toEqual(['Perfil do Norte']);
      expect((await listTeam(foreign.slug, cookie)).status).toBe(404);
      expect(await profilesSeenAt(south.slug, cookie)).toEqual(['Perfil do Sul']);
    });
  });

  describe('super admin', () => {
    it('entra em empresa sem vínculo, pelo semTenant() com a empresa inspecionada', async () => {
      const cookie = await loginAs(app, superAdmin);
      appliedTenants.length = 0;

      const response = await listTeam(foreign.slug, cookie);

      expect(response.status).toBe(200);
      expect(appliedTenants).toEqual([`super_admin:${foreign.id}`]);
      // Vê a equipe dela como ela é — e não aparece nela, porque não tem vínculo.
      const { users } = (await response.json()) as TeamResponse;
      expect(users.map((user) => user.id)).toEqual([foreigner.id]);
    });

    it('com vínculo, entra pelo withTenant() como qualquer usuário', async () => {
      const linked = await createUserWithPassword(db, 'Saulo Com Vínculo', { isSuperAdmin: true });
      await createMembership(db, linked.id, north.id, { isDefault: true });
      const cookie = await loginAs(app, linked);
      appliedTenants.length = 0;

      expect((await listTeam(north.slug, cookie)).status).toBe(200);
      expect(appliedTenants).toEqual([north.id]);
    });

    it('recebe o 404 de sempre só quando a empresa não existe', async () => {
      const response = await listTeam('empresa-que-nao-existe', await loginAs(app, superAdmin));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: 'tenant_not_found', message: TENANT_NOT_FOUND_MESSAGE },
      });
    });
  });

  describe('empresa bloqueada', () => {
    let blocked: Tenant;

    beforeAll(async () => {
      blocked = await createTenant(db, 'contexto-bloqueada');
      await createMembership(db, member.id, blocked.id);
      await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.update(tenants).set({ blocked: true }).where(eq(tenants.id, blocked.id)),
      );
    });

    it('recusa quem tem vínculo com 403, sem abrir transação na empresa', async () => {
      const cookie = await loginAs(app, member);
      appliedTenants.length = 0;

      const listing = await listTeam(blocked.slug, cookie);
      const byId = await renameUser(blocked.slug, member.id, cookie);

      expect(listing.status).toBe(403);
      expect(await listing.json()).toEqual({ error: { code: 'tenant_blocked', message: TENANT_BLOCKED_MESSAGE } });
      expect(byId.status).toBe(403);
      expect(appliedTenants).toEqual([]);
    });

    it('para quem não tem vínculo, continua o mesmo 404 de slug inexistente', async () => {
      const cookie = await loginAs(app, foreigner);

      const unlinked = await listTeam(blocked.slug, cookie);
      const missing = await listTeam('empresa-que-nao-existe', cookie);

      expect(unlinked.status).toBe(404);
      expect(await unlinked.text()).toBe(await missing.text());
    });

    it('o super admin continua entrando', async () => {
      const response = await listTeam(blocked.slug, await loginAs(app, superAdmin));

      expect(response.status).toBe(200);
    });

    it('a sessão continua listando a empresa, marcada como bloqueada', async () => {
      const response = await app.request('/auth/session', { headers: { cookie: await loginAs(app, member) } });

      const { tenants: linked } = (await response.json()) as { tenants: { slug: string; blocked: boolean }[] };
      expect(linked).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slug: blocked.slug, blocked: true }),
          expect.objectContaining({ slug: north.slug, blocked: false }),
        ]),
      );
    });
  });
});
