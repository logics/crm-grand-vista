// Diff do wrapper de auditoria: lógica pura, sem banco.
import { describe, expect, it } from 'vitest';
import { auditedWrites, diffRecords, toAuditText } from '../src/audit.js';
import type { Transaction } from '../src/database.js';
import { accessProfiles, auditLog } from '../src/schema/index.js';

describe('toAuditText', () => {
  it('converte qualquer tipo para texto e preserva o nulo', () => {
    expect(toAuditText(null)).toBeNull();
    expect(toAuditText(undefined)).toBeNull();
    expect(toAuditText(42)).toBe('42');
    expect(toAuditText(false)).toBe('false');
    expect(toAuditText(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05.000Z');
    expect(toAuditText({ a: 1 })).toBe('{"a":1}');
  });
});

describe('diffRecords', () => {
  it('devolve uma mudança por campo alterado e ignora os iguais', () => {
    const changes = diffRecords({ name: 'A', area: 10, notes: 'x' }, { name: 'B', area: 20, notes: 'x' });

    expect(changes).toEqual([
      { field: 'name', oldValue: 'A', newValue: 'B' },
      { field: 'area', oldValue: '10', newValue: '20' },
    ]);
  });

  it('não registra created_at nem updated_at', () => {
    expect(diffRecords({ updated_at: new Date(1) }, { updated_at: new Date(2) })).toEqual([]);
  });

  it('inserção tem valor anterior nulo e exclusão tem valor novo nulo', () => {
    expect(diffRecords(null, { name: 'A' })).toEqual([{ field: 'name', oldValue: null, newValue: 'A' }]);
    expect(diffRecords({ name: 'A' }, null)).toEqual([{ field: 'name', oldValue: 'A', newValue: null }]);
  });
});

describe('auditedWrites — change_id', () => {
  const TENANT = '0196a000-0000-7000-8000-000000000001';

  /** Transação falsa: devolve `rows` nas leituras e captura o que vai para `audit_log`. */
  function fakeTransaction(rows: Record<string, unknown>[]) {
    const logged: { changeId: string; entityId: string }[] = [];
    let sequence = 0;
    const tx = {
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
          if (table === auditLog) {
            logged.push(...(values as { changeId: string; entityId: string }[]));
            return Promise.resolve();
          }
          return { returning: async () => [{ id: `novo-${++sequence}`, ...values }] };
        },
      }),
      select: () => ({ from: () => ({ where: () => ({ for: async () => rows }) }) }),
      update: () => ({
        set: (changes: Record<string, unknown>) => ({
          where: () => ({ returning: async () => rows.map((row) => ({ ...row, ...changes })) }),
        }),
      }),
      delete: () => ({ where: () => ({ returning: async () => rows }) }),
    };
    return { tx: tx as unknown as Transaction, logged };
  }

  const actor = { tenantId: TENANT, userId: null };

  it('todas as linhas de um envio compartilham o mesmo change_id, em quantos registros e operações forem', async () => {
    const { tx, logged } = fakeTransaction([
      { id: 'a', tenantId: TENANT, name: 'Antes' },
      { id: 'b', tenantId: TENANT, name: 'Antes' },
    ]);
    const writes = auditedWrites(tx, actor);

    await writes.insert(accessProfiles, { tenantId: TENANT, name: 'Novo' });
    await writes.update(accessProfiles, { name: 'Depois', description: 'x' }, undefined as never);
    await writes.delete(accessProfiles, undefined as never);

    const ids = new Set(logged.map((row) => row.changeId));
    expect(new Set(logged.map((row) => row.entityId)).size, 'o envio tocou mais de um registro').toBeGreaterThan(1);
    expect(logged.length).toBeGreaterThan(2);
    expect(ids.size).toBe(1);
  });

  it('envios distintos (instâncias distintas) têm change_id distintos', async () => {
    const { tx, logged } = fakeTransaction([]);

    await auditedWrites(tx, actor).insert(accessProfiles, { tenantId: TENANT, name: 'Um' });
    await auditedWrites(tx, actor).insert(accessProfiles, { tenantId: TENANT, name: 'Dois' });

    expect(new Set(logged.map((row) => row.changeId)).size).toBe(2);
  });
});
