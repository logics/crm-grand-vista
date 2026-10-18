// Semeia o banco do E2E: zera o database de teste, aplica as migrations e cria
// as contas de `accounts.ts`. Roda num processo próprio (`global-setup.ts`),
// com o ambiente do `.env.test`, pelos mesmos fixtures da suíte de integração.
import { createDatabase, createPool } from '../../packages/db/src/index.js';
import { resetTestDatabase } from '../../packages/db/test/support/reset-database.js';
import { loadCliEnv, loadMigrationEnv } from '../../packages/shared/src/env.js';
import { createMembership, createTenant, createUserWithPassword } from '../../apps/api/test/support/fixtures.js';
import { twoTenantUser } from './accounts.js';

await resetTestDatabase(loadMigrationEnv().MIGRATION_DATABASE_URL);

const pool = createPool(loadCliEnv().DATABASE_URL);
try {
  const db = createDatabase(pool);
  const { name, email, password } = twoTenantUser;
  const user = await createUserWithPassword(db, name, { email, password });
  for (const { slug, name: tenantName, isDefault } of twoTenantUser.tenants) {
    const tenant = await createTenant(db, tenantName, { slug });
    await createMembership(db, user.id, tenant.id, { isDefault });
  }
} finally {
  await pool.end();
}
