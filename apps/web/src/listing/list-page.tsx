import { type ListPage as ListPageResult, PAGE_SIZES, type PageSize, parseSort } from '@crm/shared';
import {
  Button,
  Card,
  DataTable,
  type DataTableColumn,
  EmptyState,
  type EmptyStateProps,
  Pagination,
  pageCount,
  SearchBar,
  useBelowBreakpoint,
} from '@crm/ui';
import { keepPreviousData } from '@tanstack/react-query';
import { type Key, type ReactNode, useEffect } from 'react';
import type { z } from 'zod';
import { LoadFailedState, LoadingState } from '../shell/page-state.js';
import { useTenantQuery } from '../shell/tenant-query.js';
import {
  type ListQueryBase,
  type ListQueryState,
  type ListSchema,
  type UpdateListOptions,
  useListQuery,
} from './list-query.js';

// Página de lista de um módulo: a busca com os filtros, a tabela (os cartões no
// mobile, onde a `DataTable` não serve) e a paginação, com o estado na URL
// (`useListQuery`) e os estados de carregando, vazio e erro. O módulo dá o
// schema da lista, a busca, as colunas, os filtros e o cartão; a ordenação, a
// troca de página e o cache por empresa são daqui.

/** Coluna da lista: a da `DataTable`; `sortable` exige que `key` seja um campo ordenável do schema. */
export type ListColumn<Row> = Omit<DataTableColumn<Row>, 'sorted'>;

export interface ListPageProps<S extends ListSchema, Row> {
  /** `listQuerySchema({ sortable, filters })`, o mesmo da rota da API. */
  schema: S;
  /** Chave da lista no cache da empresa (`['farms']`); a lista da URL entra depois dela. */
  queryKey: readonly unknown[];
  /** Busca uma página na API da empresa ativa. */
  fetchPage: (slug: string, query: z.output<S>) => Promise<ListPageResult<Row>>;
  columns: ListColumn<Row>[];
  /** O cartão de um registro, no lugar da linha da tabela no mobile. */
  renderCard: (row: Row) => ReactNode;
  /** Chave de cada registro; por padrão, `row.id`. */
  rowKey?: (row: Row) => Key;
  onRowClick?: (row: Row) => void;
  /** Também é o nome acessível do campo de busca. */
  searchPlaceholder: string;
  /** A lista sem nenhum registro, antes de busca ou filtro. */
  empty: Pick<EmptyStateProps, 'icon' | 'title' | 'description' | 'action'>;
  /** Controles de filtro do módulo, ao lado da busca; leem e escrevem a lista pelo estado recebido. */
  children?: (list: ListQueryState<S>) => ReactNode;
}

const defaultRowKey = (row: unknown): Key => (row as { id: Key }).id;

export function ListPage<S extends ListSchema, Row>({
  schema,
  queryKey,
  fetchPage,
  columns,
  renderCard,
  rowKey = defaultRowKey,
  onRowClick,
  searchPlaceholder,
  empty,
  children,
}: ListPageProps<S, Row>) {
  const list = useListQuery(schema);
  const { query, filtered, clearFilters } = list;
  // os campos da base existem em todo schema de lista, mas o TypeScript não
  // enxerga isso através do genérico
  const update = list.update as (patch: Partial<ListQueryBase>, options?: UpdateListOptions) => void;
  const mobile = useBelowBreakpoint('mobile');
  // a página anterior fica na tela enquanto a nova carrega: a tabela não pisca
  const result = useTenantQuery([...queryKey, query], (slug) => fetchPage(slug, query), {
    placeholderData: keepPreviousData,
  });

  // Página além do fim (o total encolheu, link velho) leva à última, corrigindo
  // a URL em vez de empilhar uma entrada no histórico.
  const lastPage = result.data ? pageCount(result.data.total, result.data.pageSize) : 0;
  useEffect(() => {
    if (!result.isPlaceholderData && lastPage > 0 && query.page > lastPage) {
      update({ page: lastPage }, { replace: true });
    }
  }, [result.isPlaceholderData, lastPage, query.page, update]);

  const sorted = query.sort ? parseSort(query.sort) : undefined;
  const tableColumns: DataTableColumn<Row>[] = columns.map((column) => ({
    ...column,
    sorted: sorted?.field === column.key ? sorted.direction : undefined,
  }));

  function content() {
    if (result.isPending) {
      return (
        <Card padding="none">
          <LoadingState />
        </Card>
      );
    }
    if (result.isError) {
      return (
        <Card padding="none">
          <LoadFailedState inline title="Não foi possível carregar a lista" onRetry={() => void result.refetch()} />
        </Card>
      );
    }
    const { items } = result.data;
    if (items.length === 0) {
      return (
        <Card padding="none">
          {filtered ? (
            <EmptyState
              compact
              icon="search-x"
              title="Nenhum resultado"
              description="Nenhum registro bate com a busca e os filtros."
              action={<Button onClick={clearFilters}>Limpar busca e filtros</Button>}
            />
          ) : (
            <EmptyState compact {...empty} />
          )}
        </Card>
      );
    }
    if (mobile) {
      return (
        <ul aria-label="Resultados" aria-busy={result.isPlaceholderData || undefined} className="flex flex-col gap-gap-shell-mobile">
          {items.map((row) => (
            <li key={rowKey(row)}>{renderCard(row)}</li>
          ))}
        </ul>
      );
    }
    return (
      <Card padding="none" aria-busy={result.isPlaceholderData || undefined}>
        <DataTable
          columns={tableColumns}
          rows={items}
          rowKey={rowKey}
          onRowClick={onRowClick}
          onSortChange={(field, direction) => update({ sort: direction === 'desc' ? `-${field}` : field })}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-gap-shell max-mobile:gap-gap-shell-mobile">
      <SearchBar
        placeholder={searchPlaceholder}
        // remonta o campo quando a busca muda por fora (voltar, limpar)
        key={query.q ?? ''}
        inputProps={{ defaultValue: query.q ?? '' }}
        filters={children?.(list)}
        onSubmit={(q) => update({ q })}
      />
      {content()}
      {result.data && result.data.total > 0 && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={result.data.total}
          compact={mobile}
          onPageChange={(page) => update({ page })}
          pageSizeOptions={[...PAGE_SIZES]}
          // o seletor só oferece `PAGE_SIZES`
          onPageSizeChange={(pageSize) => update({ pageSize: pageSize as PageSize })}
        />
      )}
    </div>
  );
}
