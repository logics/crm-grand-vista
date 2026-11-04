// Motor dos cadastros auxiliares: uma implementação para todas as tabelas do
// registro de `@crm/shared`. Recebe a transação já aberta pela rota.
import {
  auditedWrites,
  aptitudes,
  commercialStatuses,
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
  findVocabulary,
  lastActiveMeaningMessage,
  serializeVocabularyEntry,
  vocabularyMaxEntriesMessage,
  VOCABULARY_NAME_TAKEN_INACTIVE_MESSAGE,
  VOCABULARY_NAME_TAKEN_MESSAGE,
  VOCABULARY_NOT_MANUAL_MESSAGE,
  VOCABULARY_REORDER_MISMATCH_MESSAGE,
  type CreateVocabularyEntryInput,
  type VocabularyDefaults,
  type ListPage,
  type UpdateVocabularyEntryInput,
  type VocabularyEntry,
  type VocabularyKey,
  type VocabularyListQuery,
  type VocabularyOptionsPage,
  type VocabularyOptionsQuery,
} from '@crm/shared';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { defineList, escapeLike, paginatedQuery, searchClause } from '../../listing/query.js';
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
  'commercial-statuses': commercialStatuses,
};

type Table = VocabularyTable;

export const tableOf = (key: VocabularyKey): Table => TABLES[key];

/** Resultado de uma escrita que a regra pode recusar. */
export type WriteResult =
  | { ok: true; entry: VocabularyEntry }
  | { ok: false; reason: 'not_found' | 'name_taken' | 'refused'; message?: string };

const ENTRY_COLUMNS = (table: Table) => ({
  id: table.id,
  name: table.name,
  active: table.active,
  ...(table.systemMeaning ? { systemMeaning: table.systemMeaning } : {}),
});

/** A leitura do banco, na forma que `serializeVocabularyEntry` aceita. */
const asEntry = (row: unknown) => serializeVocabularyEntry(row as VocabularyEntry);

const definitionOf = (key: VocabularyKey) => findVocabulary(key)!;

/** A ordem do cadastro: manual pela posição e depois pelo nome; alfabética só pelo nome. */
const registryOrder = (key: VocabularyKey, table: Table) => [
  ...(definitionOf(key).orderMode === 'manual' ? [asc(table.displayOrder)] : []),
  asc(sql`${table.name} collate "pt-BR-x-icu"`),
  asc(table.id),
];

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
  const list = listFor(table);

  // Cadastro manual não pagina: é uma lista curta (limite do registro, abaixo do maior pageSize) na ordem do cadastro.
  if (definitionOf(key).orderMode === 'manual') {
    const where = and(searchClause(list, query.q), status);
    const rows = await tx.select(ENTRY_COLUMNS(table)).from(table).where(where).orderBy(...registryOrder(key, table));
    return { items: rows.map(asEntry), total: rows.length, page: 1, pageSize: 100 };
  }

  const page = await paginatedQuery(tx, list, query, { scope: withoutDataScope, filters: [status] });
  return { ...page, items: page.items.map(asEntry) };
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
  const ordering = [desc(table.active), ...registryOrder(key, table)];

  if (query.ids.length > 0) {
    const rows = await tx.select(ENTRY_COLUMNS(table)).from(table).where(inArray(table.id, query.ids)).orderBy(...ordering);
    return { items: rows.map(asEntry) };
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

  const items = rows.slice(0, query.limit).map(asEntry);
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

const refused = (message: string): WriteResult => ({ ok: false, reason: 'refused', message });

/** Serializa as escritas de um cadastro de uma empresa: limite e posição no fim não correm em paralelo. */
async function lockVocabulary(tx: Transaction, tenantId: string, key: VocabularyKey) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${tenantId}:${key}`}))`);
}

export async function createEntry(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  input: CreateVocabularyEntryInput,
): Promise<WriteResult> {
  const table = tableOf(key);
  const vocabulary = definitionOf(key);
  const conflict = await findNameConflict(tx, table, input.name);
  if (conflict) return nameTaken(conflict);

  const values: Record<string, unknown> = { tenantId: actor.tenantId, name: input.name };
  if (vocabulary.systemMeaning) values.systemMeaning = input.systemMeaning;

  if (vocabulary.orderMode === 'manual') {
    await lockVocabulary(tx, actor.tenantId, key);
    const [totals] = await tx
      .select({ count: sql<number>`count(*)::int`, last: sql<number | null>`max(${table.displayOrder})` })
      .from(table);
    const count = totals?.count ?? 0;
    if (vocabulary.maxEntries !== undefined && count >= vocabulary.maxEntries) {
      return refused(vocabularyMaxEntriesMessage(vocabulary));
    }
    // Entrada nova entra no fim.
    values.displayOrder = (totals?.last ?? -1) + 1;
  }

  const created = await auditedWrites(tx, actor).insert(table, values as never);
  return { ok: true, entry: asEntry(created) };
}

/**
 * Confere que sair do ar (desativar ou excluir) a entrada não deixa o
 * significado dela sem nenhuma ativa. Trava as ativas do significado para que
 * duas desativações simultâneas não passem juntas.
 */
async function guardLastActiveMeaning(
  tx: Transaction,
  key: VocabularyKey,
  table: Table,
  id: string,
): Promise<string | undefined> {
  const meaningColumn = table.systemMeaning;
  if (!meaningColumn) return undefined;

  const [entry] = await tx
    .select({ active: table.active, meaning: meaningColumn })
    .from(table)
    .where(eq(table.id, id));
  if (!entry || !entry.active) return undefined;

  const peers = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(meaningColumn, entry.meaning), eq(table.active, true)))
    .for('update');
  return peers.some((peer) => peer.id !== id)
    ? undefined
    : lastActiveMeaningMessage(definitionOf(key), String(entry.meaning));
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

  if (changes.active === false) {
    const blocked = await guardLastActiveMeaning(tx, key, table, id);
    if (blocked) return refused(blocked);
  }

  // Corpo sem campo editável não é escrita: nem `updated_at` muda.
  const [entry] =
    Object.keys(changes).length === 0
      ? await tx.select().from(table).where(eq(table.id, id))
      : await auditedWrites(tx, actor).update(table, changes, eq(table.id, id));

  return entry ? { ok: true, entry: asEntry(entry) } : { ok: false, reason: 'not_found' };
}

/**
 * Exclui a entrada. Entrada em uso é recusada pelo banco (FK `RESTRICT`), e a
 * violação sobe para a rota traduzir. Devolve `true` se excluiu, `false` se a
 * entrada não existe, ou a mensagem da regra que recusou.
 */
export async function deleteEntry(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  id: string,
): Promise<boolean | { refused: string }> {
  const table = tableOf(key);
  const blocked = await guardLastActiveMeaning(tx, key, table, id);
  if (blocked) return { refused: blocked };
  const removed = await auditedWrites(tx, actor).delete(table, eq(table.id, id));
  return removed.length > 0;
}

/**
 * A primeira entrada ativa de cada significado, na ordem do cadastro: a que um
 * registro novo recebe por padrão. Significado sem entrada ativa vem nulo.
 */
export async function defaultEntries(tx: Transaction, key: VocabularyKey): Promise<VocabularyDefaults> {
  const table = tableOf(key);
  const meanings = Object.keys(definitionOf(key).systemMeaning?.options ?? {});
  const meaningColumn = table.systemMeaning;
  const result: VocabularyDefaults = Object.fromEntries(meanings.map((meaning) => [meaning, null]));
  if (!meaningColumn) return result;

  const rows = await tx
    .select({ id: table.id, name: table.name, meaning: meaningColumn })
    .from(table)
    .where(eq(table.active, true))
    .orderBy(...registryOrder(key, table));
  for (const row of rows) {
    const meaning = String(row.meaning);
    if (result[meaning] === null) result[meaning] = { id: String(row.id), name: String(row.name) };
  }
  return result;
}

/**
 * Regrava a posição das entradas na ordem recebida, só das que mudaram, num
 * único `auditedWrites` (um `change_id` para a reordenação inteira). A lista
 * precisa ser exatamente a das entradas do cadastro; senão, nada é gravado.
 */
export async function reorderEntries(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  key: VocabularyKey,
  ids: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (definitionOf(key).orderMode !== 'manual') return { ok: false, message: VOCABULARY_NOT_MANUAL_MESSAGE };
  const table = tableOf(key);
  await lockVocabulary(tx, actor.tenantId, key);

  const rows = await tx.select({ id: table.id, displayOrder: table.displayOrder }).from(table);
  const current = new Map(rows.map((row) => [String(row.id), row.displayOrder]));
  if (ids.length !== current.size || new Set(ids).size !== ids.length || !ids.every((id) => current.has(id))) {
    return { ok: false, message: VOCABULARY_REORDER_MISMATCH_MESSAGE };
  }

  const writes = auditedWrites(tx, actor);
  for (const [position, id] of ids.entries()) {
    if (current.get(id) !== position) await writes.update(table, { displayOrder: position }, eq(table.id, id));
  }
  return { ok: true };
}
