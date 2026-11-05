// Falha depois da semente real: o provisionamento é uma transação só, então não
// sobra empresa, usuário, cadastro semeado, parâmetros nem linha de auditoria.
import { auditLog, commercialStatuses, createDatabase, createPool, crops, documentCategories, tenantSettings, tenants, uuidv7 } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

const seededTenants: string[] = [];

// A semente real roda por inteiro; o mock só falha logo depois dela.
vi.mock('../../src/provisioning/tenant-seed.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/provisioning/tenant-seed.js')>();
  return {
    seedTenantDefaults: async (...args: Parameters<typeof original.seedTenantDefaults>) => {
      await original.seedTenantDefaults(...args);
      seededTenants.push(args[1]);
      throw new Error('falha depois da semente');
    },
  };
});

const { provisionTenant } = await import('../../src/provisioning/tenant.js');

describe('provisionamento com falha depois da semente', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  it('não deixa empresa, cadastros, parâmetros nem auditoria', async () => {
    const slug = `rollback-${uuidv7().slice(-12)}`;

    await expect(
      provisionTenant(db, { slug, name: 'Rollback', admin: { name: 'Ana', email: `${uuidv7()}@teste.local` } }),
    ).rejects.toThrow('falha depois da semente');

    const [tenant] = await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(tenants).where(eq(tenants.slug, slug)));
    expect(tenant).toBeUndefined();

    expect(seededTenants).toHaveLength(1);
    const left = await db.withTenant(seededTenants[0]!, async (tx) => ({
      crops: await tx.select().from(crops),
      categories: await tx.select().from(documentCategories),
      statuses: await tx.select().from(commercialStatuses),
      settings: await tx.select().from(tenantSettings),
      audit: await tx.select().from(auditLog),
    }));
    expect(left).toEqual({ crops: [], categories: [], statuses: [], settings: [], audit: [] });
  });
});
