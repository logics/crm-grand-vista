// Motor dos cadastros auxiliares: uma implementação para todas as tabelas do
// registro de `@crm/shared`. Recebe a transação já aberta pela rota.
import {
  auditedWrites,
  aptitudes,
  contactClassifications,
  crops,
  documentCategories,
  leadSources,
  paymentMethods,
  purchaseProfiles,
  normalizedVocabularyName,
  type AuditActor,
  type Transaction,
  type VocabularyTable,
} from '@crm/db';
import {
  serializeVocabularyEntry,
  VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE,
  VOCABULARY_NAME_TAKEN_MESSAGE,
  type CreateVocabularyEntryInput,
  type ListPage,
  type UpdateVocabularyEntryInput,
  type VocabularyEntry,
  type VocabularyKey,
  type VocabularyListQuery,
  type VocabularyOptionsPage,
  type VocabularyOptionsQuery,
} from '@crm/shared';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { defineList, escapeLike, paginatedQuery } from '../../listing/query.js';
import { withoutDataScope } from '../../authorization/data-scope.js';

/**
 * A tabela de cada cadastro do registro. O tipo exige uma entrada por chave:
 * cadastro novo no registro sem tabela aqui é erro de compilação.
 */
const TABLES: Record<VocabularyKey, VocabularyTable> = {
  aptitudes,
  'contact-classifications': contactClassifications,
  crops,
  'document-categories': documentCategories,
  'lead-sources': leadSources,
  'payment-methods': paymentMethods,
  'purchase-profiles': purchaseProfiles,
};

type Table = VocabularyTable;

export const tableOf = (key: VocabularyKey): Table => TABLES[key];

/** Resultado de uma escrita que a regra pode recusar. */
export type WriteResult =
  | { ok: true; entry: VocabularyEntry }
  | { ok: false; reason: 'not_found' | 'name_taken'; message?: string };

const ENTRY_COLUMNS = (table: Table) => ({ id: table.id, name: table.name, active: table.active });

// Ordem alfabética pela collation pt-BR do ICU: "Água" fica junto do "A".
const listFor = (table: Table) =>
  defineList({
    table,
    sortable: { name: sql`${table.name} collate "pt-BR-x-icu"` },
    defaultSort: 'name',
    searchable: [table.name],
  });

export async function listEntries(
  tx: Transaction,
  key: VocabularyKey,
  query: VocabularyListQuery,
): Promise<ListPage<VocabularyEntry>> {
  const table = tableOf(key);
  const status =
    query.status === 'all' ? undefined : eq(table.active, query.status === 'active');
  const page = await paginatedQuery(tx, listFor(table), query, { scope: withoutDataScope, filters: [status] });
  return { ...page, items: page.items.map((entry) => serializeVocabularyEntry(entry as VocabularyEntry)) };
}

/**
 * Opções para o seletor: as ativas em ordem alfabética e, com `includeInactive`,
 * as inativas depois delas. `ids` hidrata o valor gravado, ativo ou não, e ignora
 * a busca e as demais regras. A paginação é por posição (cursor = deslocamento),
 * com desempate pelo `id`: a ordem é total, então nada repete nem se perde.
 */
export async function listOptions(
  tx: Transaction,
  key: VocabularyKey,
  query: VocabularyOptionsQuery,
): Promise<VocabularyOptionsPage> {
  const table = tableOf(key);
  const ordering = [desc(table.active), asc(sql`${table.name} collate "pt-BR-x-icu"`), asc(table.id)];

  if (query.ids.length > 0) {
    const rows = await tx.select(ENTRY_COLUMNS(table)).from(table).where(inArray(table.id, query.ids)).orderBy(...ordering);
    return { items: rows.map((row) => serializeVocabularyEntry(row as VocabularyEntry)) };
  }

  const offset = query.cursor === undefined ? 0 : Number(query.cursor);
  const rows = await tx
    .select(ENTRY_COLUMNS(table))
    .from(table)
    .where(
      and(
        query.includeInactive ? undefined : eq(table.active, true),
        query.q
          ? sql`${normalizedVocabularyName(table.name)} like '%' || ${normalizedVocabularyName(escapeLike(query.q))} || '%'`
          : undefined,
      ),
    )
    .orderBy(...ordering)
    .limit(query.limit + 1)
    .offset(offset);

  const items = rows.slice(0, query.limit).map((row) => serializeVocabularyEntry(row as VocabularyEntry));
  return rows.length > query.limit ? { items, nextCursor: String(offset + query.limit) } : { items };
}

/** A entrada de mesmo nome (sem caixa nem acento), se houver, para nomear a recusa. */
async function findNameConflict(tx: Transaction, table: Table, name: string, exceptId?: string) {
  const [existing] = await tx
    .select(ENTRY_COLUMNS(table))
    .from(table)
    .where(
      and(
        sql`${normalizedVocabularyName(table.name)} = ${normalizedVocabularyName(name)}`,
        exceptId ? ne(table.id, exceptId) : undefined,
      ),
    );
  return existing as { id: string; name: string; active: boolean } | undefined;
}

const nameTaken = (conflict: { active: boolean }): WriteResult => ({
  ok: false,
  reason: 'name_taken',
  message: conflict.active ? VOCABULARY_NAME_TAKEN_MESSAGE : VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE,
});

export async function createEntry(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  input: CreateVocabularyEntryInput,
): Promise<WriteResult> {
  const table = tableOf(key);
  const conflict = await findNameConflict(tx, table, input.name);
  if (conflict) return nameTaken(conflict);

  const created = await auditedWrites(tx, actor).insert(table, {
    tenantId: actor.tenantId,
    name: input.name,
  });
  return { ok: true, entry: serializeVocabularyEntry(created as VocabularyEntry) };
}

export async function updateEntry(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  id: string,
  input: UpdateVocabularyEntryInput,
): Promise<WriteResult> {
  const table = tableOf(key);
  const changes: UpdateVocabularyEntryInput = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.active !== undefined) changes.active = input.active;

  if (changes.name !== undefined) {
    const conflict = await findNameConflict(tx, table, changes.name, id);
    if (conflict) return nameTaken(conflict);
  }

  // Corpo sem campo editável não é escrita: nem `updated_at` muda.
  const [entry] =
    Object.keys(changes).length === 0
      ? await tx.select().from(table).where(eq(table.id, id))
      : await auditedWrites(tx, actor).update(table, changes, eq(table.id, id));

  return entry ? { ok: true, entry: serializeVocabularyEntry(entry as VocabularyEntry) } : { ok: false, reason: 'not_found' };
}

/**
 * Exclui a entrada. Entrada em uso é recusada pelo banco (FK `RESTRICT`), e a
 * violação sobe para a rota traduzir; aqui só se diz se a entrada existia.
 */
export async function deleteEntry(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  id: string,
): Promise<boolean> {
  const table = tableOf(key);
  const removed = await auditedWrites(tx, actor).delete(table, eq(table.id, id));
  return removed.length > 0;
}
