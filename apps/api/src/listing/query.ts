// A consulta paginada que toda listagem de módulo usa: monta ordenação, busca e
// escopo de dados uma vez só, e aplica o mesmo `where` aos itens e ao total.
// Os parâmetros chegam já validados pelo schema de `listQuerySchema`
// (`@crm/shared`).
import type { Transaction } from '@crm/db';
import { parseSort, type ListPage, type PageSize, type SortParam } from '@crm/shared';
import { and, asc, desc, or, sql, type Column, type InferSelectModel, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

type ListTable = PgTable & { id: Column };

/**
 * O que um módulo declara sobre a própria lista: a tabela, as colunas por trás
 * de cada campo ordenável (as mesmas chaves do `sortable` do schema da rota),
 * a ordenação padrão e as colunas de texto em que `q` procura.
 */
export interface ListDefinition<TTable extends ListTable, TSortField extends string> {
  table: TTable;
  sortable: Record<TSortField, Column>;
  defaultSort?: SortParam<NoInfer<TSortField>>;
  searchable: readonly Column[];
}

/** Identidade com inferência: `defineList({ ... })` tipa os campos ordenáveis pelas chaves. */
export function defineList<TTable extends ListTable, TSortField extends string>(
  list: ListDefinition<TTable, TSortField>,
): ListDefinition<TTable, TSortField> {
  return list;
}

/**
 * Ordenação pedida (ou a padrão), terminando sempre em `id`: registros com o
 * mesmo valor não trocam de página entre uma consulta e a seguinte.
 */
export function listOrderBy<TSortField extends string>(
  list: ListDefinition<ListTable, TSortField>,
  sort: SortParam<TSortField> | undefined,
): SQL[] {
  const tiebreak = asc(list.table.id);
  const requested = sort ?? list.defaultSort;
  if (requested === undefined) return [tiebreak];

  const { field, direction } = parseSort(requested);
  const column = list.sortable[field];
  return [direction === 'desc' ? desc(column) : asc(column), tiebreak];
}

/** Escapa os curingas do `LIKE`: "100%" procura o texto "100%", não "100" seguido de qualquer coisa. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

/**
 * Busca insensível a acento e a maiúsculas (`unaccent` + `ILIKE`) em qualquer
 * das colunas declaradas: "joao" acha "João". Sem busca, nenhum recorte.
 */
export function searchClause(list: Pick<ListDefinition<ListTable, string>, 'searchable'>, q: string | undefined) {
  if (q === undefined || list.searchable.length === 0) return undefined;

  const pattern = `%${escapeLike(q)}%`;
  return or(...list.searchable.map((column) => sql`unaccent(${column}) ilike unaccent(${pattern})`));
}

/**
 * Lista sem escopo de dados — a que não tem corretor responsável, como os
 * vocabulários da empresa. Explícito de propósito: esquecer o escopo não pode
 * ser o mesmo que declarar que ele não existe.
 */
export const withoutDataScope: SQL = sql`true`;

export interface ListPageQuery<TSortField extends string> {
  page: number;
  pageSize: PageSize;
  sort?: SortParam<TSortField> | undefined;
  q?: string | undefined;
}

/**
 * Uma página da lista e o total. O predicado de escopo de dados
 * (`dataScopeClause`, ou `withoutDataScope`) entra **também no total**: total
 * que conta registro invisível revela o tamanho da carteira dos colegas. Página
 * além do fim volta vazia, com o total verdadeiro.
 */
export async function paginatedQuery<TTable extends ListTable, TSortField extends string>(
  tx: Transaction,
  list: ListDefinition<TTable, TSortField>,
  query: ListPageQuery<TSortField>,
  options: { scope: SQL; filters?: readonly (SQL | undefined)[] },
): Promise<ListPage<InferSelectModel<TTable>>> {
  const where = and(options.scope, searchClause(list, query.q), ...(options.filters ?? []));

  const items = (await tx
    .select()
    .from(list.table as PgTable)
    .where(where)
    .orderBy(...listOrderBy(list, query.sort))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)) as InferSelectModel<TTable>[];
  const total = await tx.$count(list.table, where);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
