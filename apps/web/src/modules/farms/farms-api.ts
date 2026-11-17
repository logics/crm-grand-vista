import { FormSubmitError } from '@crm/ui';
import {
  farmOptionsPageSchema,
  type ContactFarm,
  type CreateFarmInput,
  type Farm,
  type FarmDuplicate,
  type FarmDuplicatesQuery,
  type FarmListQuery,
  type FarmOption,
  type FarmOptionsPage,
  type ListPage,
  type UpdateFarmInput,
} from '@crm/shared';
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

/** Todo parâmetro da lista, como texto: listas viram `a,b`, o resto sai como o schema o leu. */
function listParams(query: FarmListQuery): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return params;
}

export async function fetchFarms(slug: string, query: FarmListQuery): Promise<ListPage<Farm>> {
  const response = await api.e[':tenant'].farms.$get({ param: { tenant: slug }, query: listParams(query) });
  if (!response.ok) throw new Error(`Falha ao listar as fazendas: HTTP ${response.status}.`);
  return (await response.json()) as ListPage<Farm>;
}

async function readOptions(response: Response): Promise<FarmOptionsPage> {
  if (!response.ok) throw new Error(`Falha ao buscar as fazendas: HTTP ${response.status}.`);
  return farmOptionsPageSchema.parse(await response.json());
}

/** Busca do `FarmPicker` em `GET /farms/options`: sem desativadas, no escopo de quem busca. */
export function searchFarmOptions(slug: string) {
  return async (term: string, { signal, cursor }: { signal: AbortSignal; cursor?: string }): Promise<FarmOptionsPage> => {
    const response = await api.e[':tenant'].farms.options.$get(
      { param: { tenant: slug }, query: { ...(term ? { q: term } : {}), ...(cursor ? { cursor } : {}) } },
      { init: { signal } },
    );
    return readOptions(response);
  };
}

/** Hidrata os ids gravados, desativadas inclusive. */
export function resolveFarmOptions(slug: string) {
  return async (ids: string[]): Promise<FarmOption[]> => {
    if (ids.length === 0) return [];
    const response = await api.e[':tenant'].farms.options.$get({ param: { tenant: slug }, query: { ids: ids.join(',') } });
    return (await readOptions(response)).items;
  };
}

export async function fetchFarm(slug: string, id: string): Promise<Farm> {
  const response = await api.e[':tenant'].farms[':id'].$get({ param: { tenant: slug, id } });
  const status: number = response.status;
  if (status === 404) throw new ResourceNotFoundError();
  if (!response.ok) throw new Error(`Falha ao carregar a fazenda: HTTP ${response.status}.`);
  return (await response.json()) as Farm;
}

export async function fetchFarmDuplicates(slug: string, query: FarmDuplicatesQuery): Promise<FarmDuplicate[]> {
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => typeof value === 'string' && value !== ''));
  const response = await api.e[':tenant'].farms.duplicates.$get({ param: { tenant: slug }, query: params });
  if (!response.ok) throw new Error(`Falha ao consultar duplicatas: HTTP ${response.status}.`);
  return ((await response.json()) as { items: FarmDuplicate[] }).items;
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

/** Fazendas de que o contato é proprietário, em qualquer status, no escopo de quem lê. */
export async function fetchFarmsByOwner(slug: string, contactId: string, page: number): Promise<ListPage<ContactFarm>> {
  const response = await api.e[':tenant'].farms['by-owner'][':contactId'].$get({
    param: { tenant: slug, contactId },
    query: { page: String(page), pageSize: '25' },
  });
  if (!response.ok) throw new Error(`Falha ao listar as fazendas do contato: HTTP ${response.status}.`);
  return (await response.json()) as ListPage<ContactFarm>;

}
