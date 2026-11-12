import { FormSubmitError } from '@crm/ui';
import type { CreateFarmInput, Farm, FarmListQuery, ListPage, UpdateFarmInput } from '@crm/shared';
import { api } from '../../lib/api.js';
import { ResourceNotFoundError } from '../../shell/tenant-query.js';

// Chamadas da API de fazendas (`/e/:tenant/farms`). A recusa de regra vira
// `FormSubmitError` com a mensagem pronta da API (e o campo, se ela o aponta),
// para o formulário exibi-la.

async function failure(response: Response): Promise<FormSubmitError> {
  const body: unknown = await response.json().catch(() => null);
  const error = (typeof body === 'object' && body !== null && 'error' in body ? body.error : null) as {
    message?: unknown;
    field?: unknown;
  } | null;
  const message = typeof error?.message === 'string' ? error.message : 'Não foi possível salvar. Tente de novo.';
  return new FormSubmitError(message, typeof error?.field === 'string' ? { [error.field]: message } : {});
}

export async function fetchFarms(slug: string, query: FarmListQuery): Promise<ListPage<Farm>> {
  const response = await api.e[':tenant'].farms.$get({
    param: { tenant: slug },
    query: {
      page: String(query.page),
      pageSize: String(query.pageSize),
      ...(query.q ? { q: query.q } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
    },
  });
  if (!response.ok) throw new Error(`Falha ao listar as fazendas: HTTP ${response.status}.`);
  return (await response.json()) as ListPage<Farm>;
}

export async function fetchFarm(slug: string, id: string): Promise<Farm> {
  const response = await api.e[':tenant'].farms[':id'].$get({ param: { tenant: slug, id } });
  const status: number = response.status;
  if (status === 404) throw new ResourceNotFoundError();
  if (!response.ok) throw new Error(`Falha ao carregar a fazenda: HTTP ${response.status}.`);
  return (await response.json()) as Farm;
}

export async function createFarm(slug: string, json: CreateFarmInput): Promise<Farm> {
  const response = await api.e[':tenant'].farms.$post({ param: { tenant: slug }, json });
  if (response.status !== 201) throw await failure(response);
  return (await response.json()) as Farm;
}

export async function updateFarm(slug: string, id: string, json: UpdateFarmInput): Promise<Farm> {
  const response = await api.e[':tenant'].farms[':id'].$patch({ param: { tenant: slug, id }, json });
  if (response.status !== 200) throw await failure(response);
  return (await response.json()) as Farm;
}

export const fetchFarmHistory = (slug: string, id: string, cursor: string | undefined) =>
  api.e[':tenant'].farms[':id'].history.$get({
    param: { tenant: slug, id },
    query: cursor ? { cursor } : {},
  });

/** Exclui a fazenda (só desativada). 409 traz a mensagem pronta da API. */
export async function deleteFarm(slug: string, id: string): Promise<void> {
  const response = await api.e[':tenant'].farms[':id'].$delete({ param: { tenant: slug, id } });
  if (response.status !== 204) throw await failure(response);
}
