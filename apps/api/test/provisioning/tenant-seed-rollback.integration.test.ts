// Falha no meio da semente: o provisionamento é uma transação só, então não
// sobra empresa, usuário nem cadastro semeado.
import { createDatabase, createPool, crops, tenants, uuidv7 } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/provisioning/tenant-seed.js', () => ({
  seedTenantDefaults: async (
    writes: { insert: (table: unknown, values: unknown) => Promise<unknown> },
    tenantId: string,
  ) => {
    await writes.insert(crops, { tenantId, name: 'Soja' });
    throw new Error('falha no meio da semente');
  },
}));

const { provisionTenant } = await import('../../src/provisioning/tenant.js');

describe('provisionamento com falha na semente', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  it('não deixa empresa nem cadastros', async () => {
    const slug = `rollback-${uuidv7().slice(-12)}`;

    await expect(
      provisionTenant(db, { slug, name: 'Rollback', admin: { name: 'Ana', email: `${uuidv7()}@teste.local` } }),
    ).rejects.toThrow('falha no meio da semente');

    const [tenant] = await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(tenants).where(eq(tenants.slug, slug)));
    expect(tenant).toBeUndefined();
  });
});
