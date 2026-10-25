// Estado de uma listagem na URL: página, tamanho, ordenação, busca e filtros
// vivem nos parâmetros (`/e/gv/farms?page=2&sort=-totalAreaHa&q=rio`), lidos e
// escritos pelo mesmo schema que a API valida (`listQuerySchema` de
// `@crm/shared`). Voltar do navegador reabre a lista anterior; link copiado
// reabre a mesma.
import type { PageSize } from '@crm/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { z } from 'zod';

/** O que toda listagem tem, saído de `listQuerySchema`; o resto são os filtros do módulo. */
export interface ListQueryBase {
  page: number;
  pageSize: PageSize;
  q?: string | undefined;
  sort?: string | undefined;
}

/** Schema de `listQuerySchema({ sortable, filters })`. */
export type ListSchema = z.ZodObject & z.ZodType<ListQueryBase>;

/** Parâmetros que não restringem a lista, só a ordenam ou fatiam. */
const LAYOUT_KEYS = new Set(['page', 'pageSize', 'sort']);

const defaultsOf = (schema: ListSchema): Record<string, unknown> => schema.safeParse({}).data ?? {};

/**
 * Lê a lista da URL. Parâmetro inválido cai no padrão sozinho — os válidos
 * continuam valendo —, e parâmetro que a lista não conhece é ignorado: link
 * velho ou editado à mão nunca quebra a tela.
 */
export function readListQuery<S extends ListSchema>(schema: S, params: URLSearchParams): z.output<S> {
  const raw: Record<string, string> = {};
  for (const key of Object.keys(schema.shape)) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }
  // Cada rodada tira os parâmetros recusados; acaba quando não sobra nenhum.
  for (;;) {
    const result = schema.safeParse(raw);
    if (result.success) return result.data;
    const rejected = result.error.issues.map((issue) => issue.path[0]).filter((key) => typeof key === 'string' && key in raw);
    if (rejected.length === 0) throw result.error;
    for (const key of rejected) delete raw[key as string];
  }
}

/** Escreve a lista nos parâmetros da URL, na ordem do schema e sem o que está no padrão. */
export function writeListQuery<S extends ListSchema>(schema: S, query: z.output<S>): URLSearchParams {
  const defaults = defaultsOf(schema);
  const values = query as Record<string, unknown>;
  const params = new URLSearchParams();
  for (const key of Object.keys(schema.shape)) {
    const value = values[key];
    if (value === undefined || value === null || value === '' || value === defaults[key]) continue;
    params.set(key, String(value));
  }
  return params;
}

/** Se a busca ou algum filtro, fora do padrão, restringe a lista. */
export function isFilteredQuery<S extends ListSchema>(schema: S, query: z.output<S>): boolean {
  return [...writeListQuery(schema, query).keys()].some((key) => !LAYOUT_KEYS.has(key));
}

export interface UpdateListOptions {
  /** Troca a entrada atual do histórico em vez de criar outra (correção, não navegação). */
  replace?: boolean;
}

/**
 * A lista da URL e as trocas dela. Toda troca é uma entrada do histórico.
 * Trocar busca, filtro, ordenação ou tamanho volta à primeira página, salvo
 * se a própria troca diz a página.
 */
export function useListQuery<S extends ListSchema>(schema: S) {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => readListQuery(schema, params), [schema, params]);

  const update = useCallback(
    (patch: Partial<z.output<S>>, { replace = false }: UpdateListOptions = {}) => {
      setParams((current) => writeListQuery(schema, { ...readListQuery(schema, current), page: 1, ...patch }), {
        replace,
      });
    },
    [schema, setParams],
  );

  const clearFilters = useCallback(() => {
    setParams((current) => {
      const { pageSize, sort } = readListQuery(schema, current);
      return writeListQuery(schema, { ...defaultsOf(schema), pageSize, sort } as z.output<S>);
    });
  }, [schema, setParams]);

  return { query, filtered: isFilteredQuery(schema, query), update, clearFilters };
}

export type ListQueryState<S extends ListSchema> = ReturnType<typeof useListQuery<S>>;
