// Wrapper de auditoria: envolve as escritas do Drizzle, compara o estado
// anterior com o novo e grava uma linha de `audit_log` por campo alterado.
// Tudo acontece na transação recebida — a mesma da escrita —, então um
// rollback leva o registro junto e o log nunca prova uma alteração que não houve.
import { getTableColumns, getTableName, inArray, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Transaction } from './database.js';
import { auditLog } from './schema/index.js';
import { uuidv7 } from './uuid.js';

/** Quem escreve. `userId` é nulo para ação de CLI ou de sistema: nulo é a verdade. */
export interface AuditActor {
  tenantId: string | null;
  userId: string | null;
}

/** Tabela auditável: tem `id` (uuid) como chave do registro. */
type AuditedTable = PgTable & { id: PgColumn };
type Row<T extends AuditedTable> = T['$inferSelect'];

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Colunas que mudam a cada escrita por construção e só fariam ruído no log. */
const IGNORED_FIELDS: ReadonlySet<string> = new Set(['created_at', 'updated_at']);

/**
 * Colunas que só entram em linha de plataforma (`tenant_id` nulo). No histórico
 * de uma empresa — que vira resposta de API — a flag de super admin o revelaria
 * a quem o lê; a marcação, pelo CLI, é ação de plataforma e fica registrada lá.
 */
export const PLATFORM_ONLY_FIELDS: ReadonlySet<string> = new Set(['is_super_admin']);

/** Todo tipo vira `text`; a formatação legível vem dos metadados de campo. */
export function toAuditText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Compara dois estados (chaveados pelo nome da coluna no banco) e devolve um
 * item por campo cujo valor, como texto, mudou. Estado ausente conta como nulo.
 */
export function diffRecords(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldChange[] {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: FieldChange[] = [];
  for (const field of fields) {
    if (IGNORED_FIELDS.has(field)) continue;
    const oldValue = toAuditText(before?.[field]);
    const newValue = toAuditText(after?.[field]);
    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }
  return changes;
}

/** Linha do Drizzle (chaves em camelCase) para chaves no nome da coluna. */
function byColumnName(table: PgTable, row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (row === null) return null;
  const named: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) named[column.name] = row[key];
  return named;
}

export interface AuditedWrites {
  /** Insere e registra cada campo preenchido (valor anterior nulo). */
  insert<T extends AuditedTable>(table: T, values: T['$inferInsert']): Promise<Row<T>>;
  /** Atualiza as linhas de `where` e registra só os campos que mudaram. */
  update<T extends AuditedTable>(table: T, set: Partial<T['$inferInsert']>, where: SQL): Promise<Row<T>[]>;
  /** Exclui as linhas de `where` e registra cada campo (valor novo nulo). */
  delete<T extends AuditedTable>(table: T, where: SQL): Promise<Row<T>[]>;
}

/**
 * Escritas auditadas dentro de `tx`. O autor vem de `actor`, nunca do chamador
 * de cada escrita: é o contexto da requisição. Crie uma instância por envio
 * (requisição) — todas as linhas gravadas por ela compartilham o `change_id`.
 */
export function auditedWrites(tx: Transaction, actor: AuditActor): AuditedWrites {
  // Um `change_id` por `auditedWrites`: tudo que um envio grava, em quantas
  // tabelas e registros for, fica agrupado. A consulta por registro filtra por
  // `entity_id`, então compartilhar o id entre registros não a atrapalha.
  const changeId = uuidv7();
  const record = async (
    table: PgTable,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ) => {
    const changes = diffRecords(byColumnName(table, before), byColumnName(table, after)).filter(
      (change) => actor.tenantId === null || !PLATFORM_ONLY_FIELDS.has(change.field),
    );
    if (changes.length === 0) return;
    await tx.insert(auditLog).values(
      changes.map((change) => ({
        tenantId: actor.tenantId,
        entity: getTableName(table),
        entityId,
        changeId,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        userId: actor.userId,
      })),
    );
  };

  return {
    async insert(table, values) {
      const [row] = await tx.insert(table).values(values).returning();
      const created = row as Row<typeof table>;
      await record(table, String(created.id), null, created);
      return created;
    },

    async update(table, set, where) {
      // Trava as linhas lidas: o "antes" não pode mudar entre a leitura e o UPDATE.
      const before = (await tx.select().from(table as PgTable).where(where).for('update')) as Row<typeof table>[];
      if (before.length === 0) return [];

      const ids = before.map((row) => row.id);
      const after = (await tx.update(table).set(set).where(inArray(table.id, ids)).returning()) as Row<
        typeof table
      >[];

      const previous = new Map(before.map((row) => [row.id, row]));
      for (const row of after) await record(table, String(row.id), previous.get(row.id) ?? null, row);
      return after;
    },

    async delete(table, where) {
      const removed = (await tx.delete(table).where(where).returning()) as Row<typeof table>[];
      for (const row of removed) await record(table, String(row.id), row, null);
      return removed;
    },
  };
}
