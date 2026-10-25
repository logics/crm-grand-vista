// Leitura do histórico contra o Postgres real: filhos achados pela coluna do pai
// (inclusive excluídos), referências resolvidas pelo nome atual e o filtro de
// visibilidade por filho. Usa `users` com `memberships` como filho — as únicas
// tabelas auditadas que já têm essa relação.
import { auditedWrites, createDatabase, createPool, memberships, users, type Transaction } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EffectiveAccess } from '../../src/authorization/effective-access.js';
import type { HistoryChildDeclaration } from '../../src/history/assemble.js';
import { readHistory, type HistoryQuery } from '../../src/history/query.js';
import { createTenant, createUserWithPassword } from '../support/fixtures.js';
import { asSuperuser } from '../support/superuser.js';

const env = loadApiEnv();

describe('readHistory com filhos e referências', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  let tenantId: string;
  let parent: { id: string; name: string };
  let other: { id: string; name: string };

  const memberChild: HistoryChildDeclaration<'memberships'> = { entity: 'memberships', parentColumn: 'user_id' };
  const reader = (): EffectiveAccess => ({ userId: parent.id, permissions: new Set(), dataScopes: new Map() });

  const asCli = <T>(fn: (tx: Transaction) => Promise<T>) => db.semTenant({ reason: 'cli', tenantId }, fn);
  const writes = (tx: Transaction) => auditedWrites(tx, { tenantId, userId: parent.id });
  const read = (query: Omit<HistoryQuery, 'reader'>) => asCli((tx) => readHistory(tx, { ...query, reader: reader() }));

  beforeAll(async () => {
    ({ id: tenantId } = await createTenant(db, 'historico-filhos'));
    parent = await createUserWithPassword(db, 'Paula Pai');
    other = await createUserWithPassword(db, 'Otávio Outro');

    // Save 1: o registro e um filho no mesmo envio.
    await asCli(async (tx) => {
      const audited = writes(tx);
      await audited.update(users, { name: 'Paula Mãe' }, eq(users.id, parent.id));
      await audited.insert(memberships, { userId: parent.id, tenantId });
    });
    // Save 2: o filho excluído — achado só pela coluna do pai no valor anterior.
    await asCli((tx) => writes(tx).delete(memberships, eq(memberships.userId, parent.id)));
  });

  afterAll(() => pool.end());

  it('filhos entram na entrada do mesmo save, e o excluído é achado pela coluna do pai', async () => {
    const { entries } = await read({ entity: 'users', entityId: parent.id, children: [memberChild] });

    expect(entries).toMatchObject([
      { title: 'Vínculo removido', changes: [], children: [{ title: 'Vínculo removido' }] },
      {
        title: '2 alterações',
        changes: [{ field: 'Nome', from: 'Paula Pai', to: 'Paula Mãe' }],
        children: [
          {
            title: 'Vínculo adicionado',
            changes: [
              { field: 'Usuário', from: null, to: 'Paula Mãe' },
              { field: 'Empresa padrão', from: null, to: 'Não' },
            ],
          },
        ],
      },
    ]);
  });

  it('linha barrada pelo filtro some, e o save que só tinha ela também', async () => {
    const hidden = { ...memberChild, isVisible: () => false };
    const { entries } = await read({ entity: 'users', entityId: parent.id, children: [hidden] });

    expect(entries).toMatchObject([{ title: 'Nome alterado', children: [] }]);
  });

  it('referência pelo nome atual; referenciado excluído vira "(registro excluído)"', async () => {
    const membership = await asCli((tx) => writes(tx).insert(memberships, { userId: parent.id, tenantId }));
    await asCli((tx) => writes(tx).update(memberships, { userId: other.id }, eq(memberships.id, membership.id)));
    await asCli((tx) => tx.update(users).set({ name: 'Paula Renomeada' }).where(eq(users.id, parent.id)));

    const [renamed] = (await read({ entity: 'memberships', entityId: membership.id })).entries;
    expect(renamed?.changes).toEqual([{ field: 'Usuário', from: 'Paula Renomeada', to: 'Otávio Outro' }]);

    // Nenhum papel do CRM exclui usuário; excluí-lo leva o vínculo junto
    // (cascata), e o histórico do vínculo fica.
    await asSuperuser((client) => client.query('delete from users where id = $1', [other.id]));
    const [deleted] = (await read({ entity: 'memberships', entityId: membership.id })).entries;
    expect(deleted?.changes).toEqual([{ field: 'Usuário', from: 'Paula Renomeada', to: '(registro excluído)' }]);
  });
});
