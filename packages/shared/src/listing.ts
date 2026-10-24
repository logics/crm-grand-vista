// Contrato de toda listagem de módulo: os parâmetros da URL e a forma da
// resposta. A API valida a requisição por este schema, e o front lê e escreve a
// URL pelo mesmo — um link copiado reabre a mesma lista.
import { z } from 'zod';

/** Tamanhos de página aceitos. Outro valor é recusado, não arredondado. */
export const PAGE_SIZES = [25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 25;

/** `campo` ordena crescente; `-campo`, decrescente. */
export type SortParam<TField extends string> = TField | `-${TField}`;

export type SortDirection = 'asc' | 'desc';

const baseShape = {
  page: z.coerce.number().int().min(1, 'A página começa em 1.').default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.literal(PAGE_SIZES, { error: `O tamanho de página aceita só ${PAGE_SIZES.join(', ')}.` }))
    .default(DEFAULT_PAGE_SIZE),
  // Busca só com espaços é ausência de busca, não um ILIKE que acha tudo.
  q: z
    .string()
    .trim()
    .transform((q) => q || undefined)
    .optional(),
};

type ListQueryShape<TSortField extends string, TFilters extends z.ZodRawShape> = typeof baseShape & {
  sort: z.ZodOptional<z.ZodEnum<{ [K in SortParam<TSortField>]: K }>>;
} & TFilters;

/**
 * Schema dos parâmetros de uma listagem: `page`, `pageSize`, `sort` (só entre os
 * campos declarados ordenáveis) e `q`, mais os filtros próprios do módulo, como
 * parâmetros simples. A ordenação por `id` não é declarável: o servidor a põe
 * sempre no fim, como desempate.
 */
export function listQuerySchema<const TSortField extends string, TFilters extends z.ZodRawShape = {}>(options: {
  sortable: readonly [TSortField, ...TSortField[]];
  filters?: TFilters;
}): z.ZodObject<ListQueryShape<TSortField, TFilters>> {
  const sortValues = options.sortable.flatMap((field) => [field, `-${field}`]) as SortParam<TSortField>[];
  const sort = z.enum(sortValues, { error: 'Ordenação não disponível nesta lista.' }).optional();

  return z.object({ ...baseShape, sort, ...options.filters } as ListQueryShape<TSortField, TFilters>);
}

export type ListQuery<TSortField extends string, TFilters extends z.ZodRawShape = {}> = z.output<
  z.ZodObject<ListQueryShape<TSortField, TFilters>>
>;

export function parseSort<TField extends string>(sort: SortParam<TField>): { field: TField; direction: SortDirection } {
  return sort.startsWith('-')
    ? { field: sort.slice(1) as TField, direction: 'desc' }
    : { field: sort as TField, direction: 'asc' };
}

/**
 * Resposta de toda listagem. Página além do fim vem com `items` vazio e o
 * `total` verdadeiro — quem pagina ajusta sozinho.
 */
export function listPageSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.literal(PAGE_SIZES),
  });
}

export interface ListPage<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: PageSize;
}
