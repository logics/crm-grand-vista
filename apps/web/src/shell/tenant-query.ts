// Cache do cliente separado por empresa: toda consulta de empresa leva o slug
// na chave, então trocar de empresa nunca encontra no cache o registro da
// anterior — nem por um instante, enquanto o da nova carrega.
import { type UseQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { TENANT_PARAM } from './tenant-path.js';

export const tenantQueryKey = (slug: string, ...parts: readonly unknown[]) => ['tenant', slug, ...parts] as const;

/**
 * O registro pedido não existe na empresa ativa (a API respondeu 404). Lançado
 * pela consulta, sobe até `TenantRouteError`.
 */
export class ResourceNotFoundError extends Error {
  constructor() {
    super('Registro não encontrado nesta empresa.');
    this.name = 'ResourceNotFoundError';
  }
}

/** O slug da empresa ativa, de `/e/:tenant/...`. Só vale sob a rota da empresa. */
export function useTenantSlug(): string {
  const slug = useParams()[TENANT_PARAM];
  if (!slug) throw new Error('useTenantSlug fora de /e/:tenant/.');
  return slug;
}

/** Opções do TanStack Query que a consulta de empresa repassa (`placeholderData`). */
export type TenantQueryOptions<T> = Pick<UseQueryOptions<T>, 'placeholderData'>;

/**
 * Consulta da empresa ativa: a chave ganha o slug, e a busca o recebe. Lance
 * `ResourceNotFoundError` no 404 do registro para a página de erro tratá-lo.
 */
export function useTenantQuery<T>(
  key: readonly unknown[],
  queryFn: (slug: string) => Promise<T>,
  options: TenantQueryOptions<T> = {},
) {
  const slug = useTenantSlug();
  return useQuery({
    ...options,
    queryKey: tenantQueryKey(slug, ...key),
    queryFn: () => queryFn(slug),
    throwOnError: isResourceNotFound,
  });
}

/**
 * Consulta paginada por cursor da empresa ativa (o histórico): a chave ganha
 * o slug, e a busca recebe o slug e o cursor — nenhum na primeira página. Sem
 * cursor seguinte, não há próxima página.
 */
export function useTenantInfiniteQuery<T>(
  key: readonly unknown[],
  queryFn: (slug: string, cursor: string | undefined) => Promise<T>,
  nextCursor: (page: T) => string | undefined,
) {
  const slug = useTenantSlug();
  return useInfiniteQuery({
    queryKey: tenantQueryKey(slug, ...key),
    queryFn: ({ pageParam }) => queryFn(slug, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    throwOnError: isResourceNotFound,
  });
}

const isResourceNotFound = (error: Error) => error instanceof ResourceNotFoundError;
