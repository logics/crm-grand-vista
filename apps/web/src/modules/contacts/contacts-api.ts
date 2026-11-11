import {
  contactOptionsPageSchema,
  type Contact,
  type ContactDuplicate,
  type ContactDuplicatesQuery,
  type ContactListQuery,
  type ContactOption,
  type ContactOptionsPage,
  type ContactRole,
  type CreateContactInput,
  type ListPage,
  type UpdateContactInput,
} from '@crm/shared';
import { FormSubmitError } from '@crm/ui';
import { api } from '../../lib/api.js';
import { ResourceNotFoundError } from '../../shell/tenant-query.js';

// Chamadas da API de contatos (`/e/:tenant/contacts`). A recusa de regra vira
// `FormSubmitError` com a mensagem pronta da API, para o formulário exibi-la.

/** Documento já cadastrado (409): o formulário mostra a mensagem no campo e o link para o existente. */
export class TaxIdTakenError extends FormSubmitError {
  constructor(
    message: string,
    readonly existing: { id: string; name: string },
  ) {
    super(message, { taxId: message });
    this.name = 'TaxIdTakenError';
  }
}

async function failure(response: Response): Promise<FormSubmitError> {
  const body: unknown = await response.json().catch(() => null);
  const error = (typeof body === 'object' && body !== null && 'error' in body ? body.error : null) as {
    message?: unknown;
    field?: unknown;
    existing?: { id?: unknown; name?: unknown };
  } | null;
  const message = typeof error?.message === 'string' ? error.message : 'Não foi possível salvar. Tente de novo.';
  const { existing } = error ?? {};
  if (response.status === 409 && typeof existing?.id === 'string' && typeof existing.name === 'string') {
    return new TaxIdTakenError(message, { id: existing.id, name: existing.name });
  }
  return new FormSubmitError(message, error?.field === 'taxId' ? { taxId: message } : {});
}

export async function fetchContacts(slug: string, query: ContactListQuery): Promise<ListPage<Contact>> {
  const response = await api.e[':tenant'].contacts.$get({
    param: { tenant: slug },
    query: {
      page: String(query.page),
      pageSize: String(query.pageSize),
      ...(query.q ? { q: query.q } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.role ? { role: query.role.join(',') } : {}),
      ...(query.personType ? { personType: query.personType } : {}),
      ...(query.classificationId ? { classificationId: query.classificationId } : {}),
      ...(query.leadSourceId ? { leadSourceId: query.leadSourceId } : {}),
      ...(query.createdFrom ? { createdFrom: query.createdFrom } : {}),
      ...(query.createdTo ? { createdTo: query.createdTo } : {}),
    },
  });
  if (!response.ok) throw new Error(`Falha ao listar os contatos: HTTP ${response.status}.`);
  return (await response.json()) as ListPage<Contact>;
}

export async function fetchContact(slug: string, id: string): Promise<Contact> {
  const response = await api.e[':tenant'].contacts[':id'].$get({ param: { tenant: slug, id } });
  const status: number = response.status;
  if (status === 404) throw new ResourceNotFoundError();
  if (!response.ok) throw new Error(`Falha ao carregar o contato: HTTP ${response.status}.`);
  return (await response.json()) as Contact;
}

export async function createContact(slug: string, json: CreateContactInput): Promise<Contact> {
  const response = await api.e[':tenant'].contacts.$post({ param: { tenant: slug }, json });
  if (response.status !== 201) throw await failure(response);
  return (await response.json()) as Contact;
}

export async function updateContact(slug: string, id: string, json: UpdateContactInput): Promise<Contact> {
  const response = await api.e[':tenant'].contacts[':id'].$patch({ param: { tenant: slug, id }, json });
  if (response.status !== 200) throw await failure(response);
  return (await response.json()) as Contact;
}

export async function deleteContact(slug: string, id: string): Promise<void> {
  const response = await api.e[':tenant'].contacts[':id'].$delete({ param: { tenant: slug, id } });
  if (response.status !== 204) throw await failure(response);
}

export const fetchContactHistory = (slug: string, id: string, cursor: string | undefined) =>
  api.e[':tenant'].contacts[':id'].history.$get({
    param: { tenant: slug, id },
    query: cursor ? { cursor } : {},
  });

/** Contatos que coincidem com o que se vai cadastrar (aviso, não bloqueio). */
export async function fetchDuplicates(slug: string, query: ContactDuplicatesQuery): Promise<ContactDuplicate[]> {
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => typeof value === 'string' && value !== ''));
  const response = await api.e[':tenant'].contacts.duplicates.$get({ param: { tenant: slug }, query: params });
  if (!response.ok) throw new Error(`Falha ao consultar duplicatas: HTTP ${response.status}.`);
  return ((await response.json()) as { items: ContactDuplicate[] }).items;
}

type OptionSearchOptions = { signal: AbortSignal; cursor?: string; role?: ContactRole };

async function readOptions(response: Response): Promise<ContactOptionsPage> {
  if (!response.ok) throw new Error(`Falha ao buscar os contatos: HTTP ${response.status}.`);
  return contactOptionsPageSchema.parse(await response.json());
}

/** Busca do `ContactPicker` em `GET /contacts/options`: o papel pedido ordena, não filtra. */
export function searchContactOptions(slug: string) {
  return async (term: string, { signal, cursor, role }: OptionSearchOptions): Promise<ContactOptionsPage> => {
    const response = await api.e[':tenant'].contacts.options.$get(
      {
        param: { tenant: slug },
        query: { ...(term ? { q: term } : {}), ...(cursor ? { cursor } : {}), ...(role ? { role } : {}) },
      },
      { init: { signal } },
    );
    return readOptions(response);
  };
}

/** Hidrata os ids gravados; sem `contatos.ver`, a API devolve só id e nome. */
export function resolveContactOptions(slug: string) {
  return async (ids: string[]): Promise<ContactOption[]> => {
    if (ids.length === 0) return [];
    const response = await api.e[':tenant'].contacts.options.$get({ param: { tenant: slug }, query: { ids: ids.join(',') } });
    return (await readOptions(response)).items;
  };
}
