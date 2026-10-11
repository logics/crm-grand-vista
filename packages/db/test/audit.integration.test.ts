// Wrapper de auditoria contra o Postgres real: mesma transação da escrita e
// `audit_log` append-only para a aplicação.
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, createUser } from './support/fixtures.js';
import { auditedWrites } from '../src/audit.js';
import { createDatabase } from '../src/database.js';
import { createPool } from '../src/pool.js';
import { accessProfiles, auditLog } from '../src/schema/index.js';

describe('wrapper de auditoria', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  let tenantId: string;
  let userId: string;

  const logOf = (entityId: string) =>
    db.withTenant(tenantId, (tx) => tx.select().from(auditLog).where(eq(auditLog.entityId, entityId)).orderBy(auditLog.id));

  beforeAll(async () => {
    tenantId = await createTenant(db, 'auditoria');
    userId = await createUser(db, 'Autora');
  });

  afterAll(() => pool.end());

  it('alterar dois campos gera exatamente duas linhas, com anterior, novo e autor', async () => {
    const id = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId });
      const created = await writes.insert(accessProfiles, { tenantId, name: 'Antes', description: 'd' });
      return created.id;
    });
    const afterInsert = (await logOf(id)).length;

    await db.withTenant(tenantId, (tx) =>
      auditedWrites(tx, { tenantId, userId }).update(
        accessProfiles,
        { name: 'Depois', description: 'e' },
        eq(accessProfiles.id, id),
      ),
    );

    const rows = (await logOf(id)).slice(afterInsert);
    expect(rows.map((r) => [r.field, r.oldValue, r.newValue, r.userId, r.entity]).sort()).toEqual([
      ['description', 'd', 'e', userId, 'access_profiles'],
      ['name', 'Antes', 'Depois', userId, 'access_profiles'],
    ]);
  });

  it('as linhas de um mesmo save compartilham change_id e saves distintos não', async () => {
    const id = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId });
      return (await writes.insert(accessProfiles, { tenantId, name: 'Agrupado' })).id;
    });
    const afterInsert = (await logOf(id)).length;

    for (const name of ['Um', 'Dois']) {
      await db.withTenant(tenantId, (tx) =>
        auditedWrites(tx, { tenantId, userId }).update(
          accessProfiles,
          { name, description: name },
          eq(accessProfiles.id, id),
        ),
      );
    }

    const [first, second] = [(await logOf(id)).slice(afterInsert, afterInsert + 2), (await logOf(id)).slice(afterInsert + 2)];
    expect(new Set(first.map((r) => r.changeId)).size).toBe(1);
    expect(new Set(second.map((r) => r.changeId)).size).toBe(1);
    expect(first[0]!.changeId).not.toBe(second[0]!.changeId);
  });

  it('várias escritas do mesmo envio, em registros distintos, compartilham change_id', async () => {
    const { a, b } = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId });
      const a = (await writes.insert(accessProfiles, { tenantId, name: 'Envio A' })).id;
      const b = (await writes.insert(accessProfiles, { tenantId, name: 'Envio B' })).id;
      await writes.update(accessProfiles, { description: 'x' }, eq(accessProfiles.id, a));
      return { a, b };
    });

    const ids = new Set([...(await logOf(a)), ...(await logOf(b))].map((r) => r.changeId));
    expect(ids.size).toBe(1);
  });

  it('campo não alterado não gera linha', async () => {
    const id = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId });
      return (await writes.insert(accessProfiles, { tenantId, name: 'Igual' })).id;
    });
    const before = (await logOf(id)).length;

    await db.withTenant(tenantId, (tx) =>
      auditedWrites(tx, { tenantId, userId }).update(accessProfiles, { name: 'Igual' }, eq(accessProfiles.id, id)),
    );

    expect((await logOf(id)).length).toBe(before);
  });

  it('alterar e dar rollback gera zero linhas', async () => {
    let id = '';
    const failing = db.withTenant(tenantId, async (tx) => {
      const created = await auditedWrites(tx, { tenantId, userId }).insert(accessProfiles, {
        tenantId,
        name: 'Revertido',
      });
      id = created.id;
      throw new Error('falha depois da escrita');
    });

    await expect(failing).rejects.toThrow('falha depois da escrita');
    expect(await logOf(id)).toEqual([]);
  });

  it('autor é nulo para ação de CLI ou de sistema', async () => {
    const id = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId: null });
      return (await writes.insert(accessProfiles, { tenantId, name: 'Sistema' })).id;
    });

    const rows = await logOf(id);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.userId === null)).toBe(true);
  });

  it('exclusão registra os campos com valor novo nulo', async () => {
    const id = await db.withTenant(tenantId, async (tx) => {
      const writes = auditedWrites(tx, { tenantId, userId });
      return (await writes.insert(accessProfiles, { tenantId, name: 'Apagar' })).id;
    });

    await db.withTenant(tenantId, (tx) =>
      auditedWrites(tx, { tenantId, userId }).delete(accessProfiles, eq(accessProfiles.id, id)),
    );

    const name = (await logOf(id)).find((r) => r.field === 'name' && r.newValue === null);
    expect(name?.oldValue).toBe('Apagar');
  });

  it('crm_app não consegue UPDATE nem DELETE em audit_log', async () => {
    // O Drizzle embrulha o erro do pg; o motivo real está em `cause`.
    const deniedBy = async (run: Promise<unknown>) =>
      run.then(
        () => null,
        (error: Error) => (error.cause as Error | undefined)?.message ?? error.message,
      );

    expect(await deniedBy(db.withTenant(tenantId, (tx) => tx.update(auditLog).set({ newValue: 'x' })))).toMatch(
      /permission denied/i,
    );
    expect(await deniedBy(db.withTenant(tenantId, (tx) => tx.delete(auditLog)))).toMatch(/permission denied/i);
  });
});
