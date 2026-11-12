// Semeia o banco do E2E: zera o database de teste, aplica as migrations e cria
// as contas de `accounts.ts`. Roda num processo próprio (`global-setup.ts`),
// com o ambiente do `.env.test`, pelos mesmos fixtures da suíte de integração.
import { commercialStatuses, createDatabase, createPool, tenantSettings, tradingPostMunicipalities, tradingPosts } from '../../packages/db/src/index.js';
import { resetTestDatabase } from '../../packages/db/test/support/reset-database.js';
import { loadCliEnv, loadMigrationEnv } from '../../packages/shared/src/env.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../apps/api/test/support/fixtures.js';
import { RIO_VERDE_IBGE, TRADING_POST_NAME, twoTenantUser } from './accounts.js';

await resetTestDatabase(loadMigrationEnv().MIGRATION_DATABASE_URL);

const pool = createPool(loadCliEnv().DATABASE_URL);
try {
  const db = createDatabase(pool);
  const { name, email, password } = twoTenantUser;
  const user = await createUserWithPassword(db, name, { email, password });
  for (const { slug, name: tenantName, isDefault } of twoTenantUser.tenants) {
    const tenant = await createTenant(db, tenantName, { slug });
    await createMembership(db, user.id, tenant.id, { isDefault });
    // a primeira empresa é a do formulário de fazenda: perfil com escopo `all`, parâmetros, status e uma praça
    if (!isDefault) continue;
    await createLinkedAccessProfile(db, tenant.id, user.id, 'Gestor do E2E', {
      permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
      dataScopes: { fazendas: 'all' },
    });
    await db.withTenant(tenant.id, async (tx) => {
      await tx.insert(tenantSettings).values({ tenantId: tenant.id });
      await tx.insert(commercialStatuses).values({ tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available' });
      const [post] = await tx.insert(tradingPosts).values({ tenantId: tenant.id, name: TRADING_POST_NAME }).returning();
      await tx
        .insert(tradingPostMunicipalities)
        .values({ tenantId: tenant.id, tradingPostId: post!.id, municipalityIbgeCode: RIO_VERDE_IBGE });
    });
  }
} finally {
  await pool.end();
}
