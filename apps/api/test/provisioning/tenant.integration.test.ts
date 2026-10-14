// Provisionamento de empresa contra o Postgres real, pelo mesmo `provisionTenant`
// que o CLI chama. O login do administrador vai pelo `createApp` de produção.
import {
  accessProfiles,
  auditLog,
  createDatabase,
  createPool,
  memberships,
  permissions,
  profileDataScopes,
  profilePermissions,
  tenants,
  userProfiles,
  users,
  uuidv7,
  type Database,
} from '@crm/db';
import { PERMISSION_CATALOG } from '@crm/shared';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { and, asc, eq, isNull } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createAuth } from '../../src/modules/auth/auth.js';
import { provisionTenant, ProvisioningError, type ProvisionedTenant } from '../../src/provisioning/tenant.js';
import { createTenant, createUserWithPassword } from '../support/fixtures.js';
import { jsonRequest } from '../support/http.js';

const env = loadApiEnv();

/** Unicidade entre execuções e arquivos: o banco de teste não é zerado entre eles. */
const uniqueSlug = (prefix: string) => `${prefix}-${uuidv7().slice(-12)}`;

const inputFor = (slug: string) => ({
  slug,
  name: 'Grand Vista',
  admin: { name: 'Ana Administradora', email: `${uuidv7()}@teste.local` },
});

/** Perfis de acesso da empresa com as permissões e os escopos de cada um. */
async function seededProfilesOf(db: Database, tenantId: string) {
  return db.withTenant(tenantId, async (tx) => {
    const profiles = await tx.select().from(accessProfiles).orderBy(asc(accessProfiles.name));
    const grants = await tx.select().from(profilePermissions);
    const scopes = await tx.select().from(profileDataScopes);

    return Object.fromEntries(
      profiles.map((profile) => [
        profile.name,
        {
          isSeeded: profile.isSeeded,
          permissions: grants
            .filter((grant) => grant.profileId === profile.id)
            .map((grant) => grant.permissionCode)
            .sort(),
          scopes: Object.fromEntries(
            scopes.filter((scope) => scope.profileId === profile.id).map((scope) => [scope.module, scope.scope]),
          ),
        },
      ]),
    );
  });
}

const tenantCatalog = (db: Database) =>
  db.semTenant({ reason: 'cli' }, (tx) =>
    tx.select({ code: permissions.code, module: permissions.module }).from(permissions).where(eq(permissions.scope, 'tenant')),
  );

describe('provisionamento de empresa', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  /** Permissão de empresa que existe no banco e não no código — a de uma fase futura. */
  const futurePermission = `futuro.${uuidv7()}`;
  let provisioned: ProvisionedTenant;

  beforeAll(async () => {
    // Quem escreve o catálogo é a migration, como crm_owner: a aplicação só lê.
    const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
    await owner.connect();
    try {
      await owner.query(
        `insert into permissions (code, module, action, scope, description) values ($1, 'futuro', $2, 'tenant', 'Permissão de uma fase futura')`,
        [futurePermission, futurePermission.split('.')[1]],
      );
    } finally {
      await owner.end();
    }

    provisioned = await provisionTenant(db, inputFor(uniqueSlug('grand-vista')));
  });

  afterAll(() => pool.end());

  it('cria a empresa, o administrador e o vínculo padrão entre eles', async () => {
    const { tenant, admin } = provisioned;

    const [membership] = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.select().from(memberships).where(eq(memberships.userId, admin.id)),
    );

    expect(tenant).toMatchObject({ name: 'Grand Vista' });
    expect(membership).toMatchObject({ tenantId: tenant.id, isDefault: true });
  });

  it('cria os três perfis de acesso semeados e vincula o administrador ao Admin', async () => {
    const { tenant, admin } = provisioned;
    const profiles = await seededProfilesOf(db, tenant.id);

    const linked = await db.withTenant(tenant.id, (tx) =>
      tx
        .select({ name: accessProfiles.name })
        .from(userProfiles)
        .innerJoin(accessProfiles, eq(accessProfiles.id, userProfiles.profileId))
        .where(eq(userProfiles.userId, admin.id)),
    );

    expect(Object.keys(profiles)).toEqual(['Admin', 'Corretor', 'Gestor']);
    expect(Object.values(profiles).every((profile) => profile.isSeeded)).toBe(true);
    expect(linked).toEqual([{ name: 'Admin' }]);
  });

  it('Admin tem todas as permissões de empresa do catálogo do banco e escopo all em todos os módulos', async () => {
    const { Admin } = await seededProfilesOf(db, provisioned.tenant.id);
    const catalog = await tenantCatalog(db);

    expect(Admin!.permissions).toEqual(catalog.map((permission) => permission.code).sort());
    // Por consulta ao banco, não por lista no código: a permissão futura entrou.
    expect(Admin!.permissions).toContain(futurePermission);
    expect(Admin!.permissions).toEqual(
      expect.arrayContaining(PERMISSION_CATALOG.filter((p) => p.scope === 'tenant').map((p) => p.code)),
    );
    expect(Admin!.scopes).toEqual(Object.fromEntries(catalog.map((permission) => [permission.module, 'all'])));
  });

  it('nenhum perfil de acesso semeado recebe permissão de plataforma', async () => {
    const profiles = await seededProfilesOf(db, provisioned.tenant.id);
    const platform = PERMISSION_CATALOG.filter((p) => p.scope === 'platform').map((p) => p.code);

    for (const profile of Object.values(profiles)) {
      expect(profile.permissions.filter((code) => (platform as string[]).includes(code))).toEqual([]);
    }
  });

  it('Gestor tem tudo menos a gestão de perfis de acesso, com a comissão de terceiros e escopo all', async () => {
    const { Gestor } = await seededProfilesOf(db, provisioned.tenant.id);
    const catalog = await tenantCatalog(db);

    expect(Gestor!.permissions).toEqual(
      catalog
        .filter((permission) => permission.module !== 'perfis_de_acesso')
        .map((permission) => permission.code)
        .sort(),
    );
    expect(Gestor!.permissions).toContain('comissao.ver_de_terceiros');
    expect(Gestor!.permissions).toContain(futurePermission);
    expect(Gestor!.permissions).not.toContain('perfis_de_acesso.gerenciar');
    expect(new Set(Object.values(Gestor!.scopes))).toEqual(new Set(['all']));
    expect(Gestor!.scopes).not.toHaveProperty('perfis_de_acesso');
  });

  it('Corretor cria e edita fazendas, contatos e oportunidades, com escopo own em fazendas e oportunidades', async () => {
    const { Corretor } = await seededProfilesOf(db, provisioned.tenant.id);

    expect(Corretor).toMatchObject({
      permissions: [
        'contatos.criar',
        'contatos.editar',
        'contatos.ver',
        'fazendas.criar',
        'fazendas.editar',
        'fazendas.ver',
        'oportunidades.criar',
        'oportunidades.editar',
        'oportunidades.ver',
      ],
      scopes: { fazendas: 'own', oportunidades: 'own', contatos: 'all' },
    });
    expect(Corretor!.permissions).not.toContain('comissao.ver_de_terceiros');
    expect(Corretor!.permissions).not.toContain('configuracoes.gerenciar');
  });

  it('os perfis de acesso semeados são editáveis e removíveis pela empresa', async () => {
    const other = await provisionTenant(db, inputFor(uniqueSlug('editavel')));

    const remaining = await db.withTenant(other.tenant.id, async (tx) => {
      await tx.update(accessProfiles).set({ name: 'Corretor Pleno' }).where(eq(accessProfiles.name, 'Corretor'));
      await tx.delete(accessProfiles).where(eq(accessProfiles.name, 'Gestor'));
      return tx.select({ name: accessProfiles.name }).from(accessProfiles).orderBy(asc(accessProfiles.name));
    });

    expect(remaining).toEqual([{ name: 'Admin' }, { name: 'Corretor Pleno' }]);
  });

  it('o administrador criado consegue fazer login, já com a empresa padrão', async () => {
    const { tenant, admin } = provisioned;

    const response = await app.request('/auth/login', jsonRequest('POST', { email: admin.email, password: admin.password }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      tenants: [{ slug: tenant.slug, name: tenant.name, isDefault: true, blocked: false }],
    });
  });

  it('registra a criação em audit_log, sob a empresa nova e com autor nulo', async () => {
    const { tenant, admin } = provisioned;

    const rows = await db.withTenant(tenant.id, (tx) => tx.select().from(auditLog));
    const entities = new Set(rows.map((row) => row.entity));
    const adminFields = rows.filter((row) => row.entityId === admin.id).map((row) => row.field);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.userId === null)).toBe(true);
    expect(entities).toEqual(new Set(['tenants', 'users', 'memberships', 'access_profiles']));
    expect(adminFields).toContain('email');
    // O hash da senha não vai para o log, nem a flag de super admin para o histórico da empresa.
    expect(rows.some((row) => row.entity === 'accounts')).toBe(false);
    expect(adminFields).not.toContain('is_super_admin');
  });

  describe('recusa', () => {
    const countOf = async () =>
      db.semTenant({ reason: 'cli' }, async (tx) => ({
        tenants: (await tx.select({ id: tenants.id }).from(tenants)).length,
        users: (await tx.select({ id: users.id }).from(users)).length,
        memberships: (await tx.select({ id: memberships.id }).from(memberships)).length,
        platformAudit: (await tx.select({ id: auditLog.id }).from(auditLog).where(isNull(auditLog.tenantId))).length,
      }));

    it('o mesmo slug de novo, dizendo que já existe, sem duplicar nem apagar nada', async () => {
      const { tenant } = provisioned;
      const before = await countOf();
      const profilesBefore = await seededProfilesOf(db, tenant.id);

      const again = provisionTenant(db, inputFor(tenant.slug));

      await expect(again).rejects.toThrow(ProvisioningError);
      await expect(again).rejects.toThrow(`Já existe uma empresa com o slug "${tenant.slug}"`);
      expect(await countOf()).toEqual(before);
      expect(await seededProfilesOf(db, tenant.id)).toEqual(profilesBefore);
    });

    it('o e-mail de um usuário que já existe, sem criar a empresa', async () => {
      const slug = uniqueSlug('email-repetido');

      const again = provisionTenant(db, { ...inputFor(slug), admin: { name: 'Outra', email: provisioned.admin.email } });

      await expect(again).rejects.toThrow(`Já existe um usuário com o e-mail ${provisioned.admin.email}`);
      const [created] = await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(tenants).where(eq(tenants.slug, slug)));
      expect(created).toBeUndefined();
    });

    it.each(['api', 'admin', 'app', 'e', 'assets', 'static', 'login'])('o slug reservado %s', async (slug) => {
      await expect(provisionTenant(db, inputFor(slug))).rejects.toThrow(ProvisioningError);
    });

    it.each(['Grand-Vista', 'grand vista', '-grandvista', 'grandvista-', 'gv', 'agropecuária'])(
      'o slug com formato inválido %s',
      async (slug) => {
        const before = await countOf();

        await expect(provisionTenant(db, inputFor(slug))).rejects.toThrow(ProvisioningError);
        expect(await countOf()).toEqual(before);
      },
    );
  });
});

describe('empresa padrão', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  it('um usuário não consegue ter duas — o índice único parcial recusa', async () => {
    const { admin } = await provisionTenant(db, inputFor(uniqueSlug('padrao')));
    const other = await createTenant(db, 'segunda-padrao');

    const secondDefault = db.semTenant({ reason: 'cli' }, (tx) =>
      tx.insert(memberships).values({ userId: admin.id, tenantId: other.id, isDefault: true }),
    );

    await expect(secondDefault).rejects.toMatchObject({
      cause: { code: '23505', constraint: 'memberships_user_id_default_unique' },
    });
  });

  it('vínculos que não são padrão convivem com o padrão', async () => {
    const user = await createUserWithPassword(db, 'Em duas empresas');
    const first = await createTenant(db, 'primeira');
    const second = await createTenant(db, 'segunda');

    await db.semTenant({ reason: 'cli' }, async (tx) => {
      await tx.insert(memberships).values({ userId: user.id, tenantId: first.id, isDefault: true });
      await tx.insert(memberships).values({ userId: user.id, tenantId: second.id, isDefault: false });
    });

    const rows = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.isDefault, true))),
    );
    expect(rows.map((row) => row.tenantId)).toEqual([first.id]);
  });
});
