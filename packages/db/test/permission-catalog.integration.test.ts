// Espelho do catálogo de permissões no banco: a sincronização que a migration
// roda, e as garantias de escopo que o banco impõe sozinho.
import { type Permission, PERMISSION_CATALOG } from '@crm/shared';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAccessProfile, createTenant, createUser } from './support/fixtures.js';
import { createDatabase } from '../src/database.js';
import { syncPermissionCatalog } from '../src/permission-catalog.js';
import { createPool } from '../src/pool.js';
import { permissions, profilePermissions, userPlatformPermissions } from '../src/schema/index.js';
import { uuidv7 } from '../src/uuid.js';

/** Código do Postgres para violação de CHECK — o que o trigger de escopo levanta. */
const CHECK_VIOLATION = '23514';

/** Permissão fictícia, com código único para não colidir entre execuções. */
const fakePermission = (overrides: Partial<Permission> = {}): Permission => {
  const action = `acao_${uuidv7().replaceAll('-', '_')}`;
  return {
    code: `testes_sincronizacao.${action}` as Permission['code'],
    module: 'testes_sincronizacao',
    action,
    scope: 'tenant',
    description: 'Permissão fictícia da sincronização',
    ...overrides,
  };
};

describe('catálogo de permissões no banco', () => {
  // Quem escreve o catálogo é a migration, como crm_owner: a aplicação só lê.
  const ownerPool = new pg.Pool({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL, max: 1 });
  const owner = drizzle(ownerPool);
  const appPool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(appPool);

  const readRows = (codes: string[]) =>
    owner.select().from(permissions).where(inArray(permissions.code, codes)).orderBy(permissions.code);

  afterAll(async () => {
    await ownerPool.end();
    await appPool.end();
  });

  describe('sincronização', () => {
    it('as migrations deixam o banco com o catálogo do código', async () => {
      const rows = await readRows(PERMISSION_CATALOG.map((permission) => permission.code));

      expect(rows.map(({ code, module, action, scope, description }) => ({ code, module, action, scope, description })))
        .toEqual([...PERMISSION_CATALOG].sort((a, b) => a.code.localeCompare(b.code)));
    });

    it('é idempotente: rodar de novo não insere, não atualiza e não toca nas linhas', async () => {
      const codes = PERMISSION_CATALOG.map((permission) => permission.code);
      const before = await readRows(codes);

      const report = await syncPermissionCatalog(owner);

      expect(report).toMatchObject({ inserted: [], updated: [] });
      expect(await readRows(codes)).toEqual(before);
    });

    it('insere a permissão nova', async () => {
      const added = fakePermission();

      const report = await syncPermissionCatalog(owner, [added]);

      expect(report.inserted).toEqual([added.code]);
      expect(await readRows([added.code])).toMatchObject([added]);
    });

    it('atualiza a descrição alterada', async () => {
      const original = fakePermission();
      await syncPermissionCatalog(owner, [original]);
      const changed = { ...original, description: 'Descrição revista' };

      const report = await syncPermissionCatalog(owner, [changed]);

      expect(report).toMatchObject({ inserted: [], updated: [original.code] });
      expect(await readRows([original.code])).toMatchObject([changed]);
    });

    it('não apaga a permissão removida do código — e a aponta como órfã', async () => {
      const kept = fakePermission();
      const removed = fakePermission();
      await syncPermissionCatalog(owner, [kept, removed]);

      const report = await syncPermissionCatalog(owner, [kept]);

      expect(report.orphaned).toContain(removed.code);
      expect(await readRows([removed.code])).toMatchObject([removed]);
    });

    it('recusa mudar o escopo de uma permissão, sem gravar nada', async () => {
      const original = fakePermission();
      await syncPermissionCatalog(owner, [original]);
      const added = fakePermission();

      await expect(
        syncPermissionCatalog(owner, [added, { ...original, scope: 'platform', description: 'Outra' }]),
      ).rejects.toThrow(original.code);
      expect(await readRows([original.code, added.code])).toMatchObject([original]);
    });
  });

  describe('escopo da permissão vinculada', () => {
    const tenantPermission = fakePermission();
    const platformPermission = fakePermission({ scope: 'platform' });
    let tenantId: string;
    let profileId: string;

    const grantToProfile = (permissionCode: string) =>
      db.withTenant(tenantId, (tx) => tx.insert(profilePermissions).values({ tenantId, profileId, permissionCode }));

    beforeAll(async () => {
      await syncPermissionCatalog(owner, [tenantPermission, platformPermission]);
      tenantId = await createTenant(db, 'escopo-de-permissao');
      profileId = await createAccessProfile(db, tenantId, 'Perfil do teste de escopo');
    });

    it('perfil de acesso aceita permissão de escopo de empresa', async () => {
      await expect(grantToProfile(tenantPermission.code)).resolves.not.toThrow();
    });

    it('o banco recusa permissão de escopo de plataforma num perfil de acesso', async () => {
      await expect(grantToProfile(platformPermission.code)).rejects.toMatchObject({
        cause: { code: CHECK_VIOLATION, constraint: 'profile_permissions_permission_scope' },
      });
    });

    it('o banco recusa trocar o vínculo existente por uma permissão de plataforma', async () => {
      const other = fakePermission();
      await syncPermissionCatalog(owner, [other]);
      await grantToProfile(other.code);

      await expect(
        db.withTenant(tenantId, (tx) =>
          tx
            .update(profilePermissions)
            .set({ permissionCode: platformPermission.code })
            .where(inArray(profilePermissions.permissionCode, [other.code])),
        ),
      ).rejects.toMatchObject({ cause: { code: CHECK_VIOLATION } });
    });

    it('user_platform_permissions recusa permissão de escopo de empresa', async () => {
      const userId = await createUser(db, 'Usuário de plataforma');

      await expect(
        db.semTenant({ reason: 'cli' }, (tx) =>
          tx.insert(userPlatformPermissions).values({ userId, permissionCode: tenantPermission.code }),
        ),
      ).rejects.toMatchObject({
        cause: { code: CHECK_VIOLATION, constraint: 'user_platform_permissions_permission_scope' },
      });
    });
  });

  it('user_platform_permissions existe e está vazia na Fase 0', async () => {
    expect(await owner.select().from(userPlatformPermissions)).toEqual([]);
  });
});
