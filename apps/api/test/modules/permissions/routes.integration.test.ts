// Permissão efetiva por HTTP, contra o Postgres real e o mesmo `createApp` de
// produção: o middleware recusa com 403, a união dos perfis de acesso vale, a
// revogação vale na requisição seguinte e o super admin passa sem nada vinculado.
import { createDatabase, createPool } from '@crm/db';
import { PERMISSION_CATALOG, PERMISSION_MODULES } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
  unlinkAccessProfile,
} from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

type Tenant = Awaited<ReturnType<typeof createTenant>>;

interface EffectiveAccessBody {
  permissions: string[];
  dataScopes: Record<string, string>;
}

describe('rotas de permissões', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Tenant;
  let otherTenant: Tenant;

  const catalog = (cookie: string, slug = tenant.slug) => app.request(`/e/${slug}/permissions`, { headers: { cookie } });

  const effective = async (cookie: string): Promise<EffectiveAccessBody> => {
    const response = await app.request(`/e/${tenant.slug}/permissions/effective`, { headers: { cookie } });
    expect(response.status).toBe(200);
    return (await response.json()) as EffectiveAccessBody;
  };

  /** Usuário com vínculo na empresa e, se houver, os perfis de acesso dados. */
  const member = async (name: string, ...profiles: Parameters<typeof createLinkedAccessProfile>[4][]) => {
    const user = await createUserWithPassword(db, name);
    await createMembership(db, user.id, tenant.id, { isDefault: true });
    const linked = [];
    for (const [index, content] of profiles.entries()) {
      linked.push(await createLinkedAccessProfile(db, tenant.id, user.id, `Perfil ${index + 1} de ${name}`, content));
    }
    return { user, profiles: linked };
  };

  beforeAll(async () => {
    tenant = await createTenant(db, 'permissoes');
    otherTenant = await createTenant(db, 'permissoes-alheia');
  });

  afterAll(() => pool.end());

  describe('middleware de permissão', () => {
    it('sem a permissão exigida, responde 403', async () => {
      const { user } = await member('Bruno Sem Configurações', { permissions: ['fazendas.ver'] });

      const response = await catalog(await loginAs(app, user));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: { code: 'forbidden', message: 'Você não tem permissão para esta ação.' },
      });
    });

    it('com ela, executa: o catálogo traz só as permissões de escopo de empresa', async () => {
      const { user } = await member('Clara Configura', { permissions: ['configuracoes.gerenciar'] });

      const response = await catalog(await loginAs(app, user));

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        permissions: { code: string; module: string; action: string; description: string }[];
      };
      const codes = body.permissions.map((permission) => permission.code);
      // Outras suítes acrescentam permissões ao banco de teste: o catálogo de empresa está contido.
      expect(codes).toEqual(
        expect.arrayContaining(PERMISSION_CATALOG.filter(({ scope }) => scope === 'tenant').map(({ code }) => code)),
      );
      // As de plataforma não compõem perfil de acesso, e não aparecem.
      const platformCodes = new Set<string>(PERMISSION_CATALOG.filter(({ scope }) => scope === 'platform').map(({ code }) => code));
      expect(codes.filter((code) => platformCodes.has(code))).toEqual([]);
      expect(body.permissions).toContainEqual({
        code: 'fazendas.criar',
        module: 'fazendas',
        action: 'criar',
        description: 'Cadastrar fazendas',
      });
    });

    it('usuário sem perfil de acesso nenhum recebe 403', async () => {
      const { user } = await member('Davi Sem Perfil');

      expect((await catalog(await loginAs(app, user))).status).toBe(403);
      expect(await effective(await loginAs(app, user))).toMatchObject({ permissions: [] });
    });

    it('perfil de acesso de outra empresa não concede nada nesta', async () => {
      const { user } = await member('Elisa de Duas Empresas');
      await createMembership(db, user.id, otherTenant.id);
      await createLinkedAccessProfile(db, otherTenant.id, user.id, 'Admin da alheia', {
        permissions: ['configuracoes.gerenciar'],
      });
      const cookie = await loginAs(app, user);

      expect((await catalog(cookie)).status).toBe(403);
      expect((await catalog(cookie, otherTenant.slug)).status).toBe(200);
    });
  });

  describe('permissão efetiva', () => {
    it('com dois perfis de acesso, é a união das permissões', async () => {
      const colleague = await member('Fábio Colega');
      const { user } = await member(
        'Gabriela de Dois Perfis',
        { permissions: ['configuracoes.gerenciar', 'fazendas.ver'] },
        { permissions: ['usuarios.gerenciar', 'fazendas.ver'] },
      );
      const cookie = await loginAs(app, user);

      expect((await catalog(cookie)).status).toBe(200);
      const rename = await app.request(
        `/e/${tenant.slug}/users/${colleague.user.id}`,
        jsonRequest('PATCH', { name: 'Fábio Renomeado' }, cookie),
      );
      expect(rename.status).toBe(200);
      expect((await effective(cookie)).permissions).toEqual([
        'configuracoes.gerenciar',
        'fazendas.ver',
        'usuarios.gerenciar',
      ]);
    });

    it('expõe o escopo de dados de todo módulo: o mais amplo entre os perfis, own onde nenhum declara', async () => {
      const { user } = await member(
        'Heitor de Escopos Divergentes',
        { dataScopes: { fazendas: 'own', oportunidades: 'own' } },
        { dataScopes: { fazendas: 'all', contatos: 'all' } },
      );

      const { dataScopes } = await effective(await loginAs(app, user));

      expect(Object.keys(dataScopes).sort()).toEqual([...PERMISSION_MODULES].sort());
      expect(dataScopes).toMatchObject({ fazendas: 'all', contatos: 'all', oportunidades: 'own', agenda: 'own' });
    });

    it('revogar um perfil de acesso vale na requisição seguinte, com a mesma sessão', async () => {
      const { user, profiles } = await member('Iara Revogada', {
        permissions: ['configuracoes.gerenciar'],
        dataScopes: { fazendas: 'all' },
      });
      const [profile] = profiles;
      const cookie = await loginAs(app, user);
      expect((await catalog(cookie)).status).toBe(200);

      await unlinkAccessProfile(db, tenant.id, user.id, profile!.id);

      expect((await catalog(cookie)).status).toBe(403);
      expect(await effective(cookie)).toMatchObject({ permissions: [], dataScopes: { fazendas: 'own' } });
    });
  });

  describe('super admin', () => {
    it('passa pela permissão e pelo escopo sem vínculo nem perfil de acesso', async () => {
      const superAdmin = await createUserWithPassword(db, 'Joana Sem Nada', { isSuperAdmin: true });
      const cookie = await loginAs(app, superAdmin);

      expect((await catalog(cookie)).status).toBe(200);
      const access = await effective(cookie);
      expect(access.permissions).toEqual(PERMISSION_CATALOG.map((permission) => permission.code).sort());
      expect(Object.values(access.dataScopes)).toEqual(PERMISSION_MODULES.map(() => 'all'));
    });

    it('com perfil de acesso restrito vinculado, continua passando por tudo', async () => {
      const superAdmin = await createUserWithPassword(db, 'Kátia Com Perfil Corretor', { isSuperAdmin: true });
      await createMembership(db, superAdmin.id, tenant.id);
      await createLinkedAccessProfile(db, tenant.id, superAdmin.id, 'Corretor da Kátia', {
        permissions: ['fazendas.ver'],
        dataScopes: { fazendas: 'own' },
      });
      const cookie = await loginAs(app, superAdmin);

      expect((await catalog(cookie)).status).toBe(200);
      expect((await effective(cookie)).dataScopes).toMatchObject({ fazendas: 'all' });
    });
  });
});
