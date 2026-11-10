import type { Contact, ContactListQuery, CreateContactInput, ListPage, UpdateContactInput } from '@crm/shared';
import { FormSubmitError } from '@crm/ui';
import { api } from '../../lib/api.js';
import { ResourceNotFoundError } from '../../shell/tenant-query.js';

// Chamadas da API de contatos (`/e/:tenant/contacts`). A recusa de regra vira
// `FormSubmitError` com a mensagem pronta da API, para o formulário exibi-la.

async function failure(response: Response): Promise<FormSubmitError> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body.error as { message?: unknown } | null)?.message
      : undefined;
  return new FormSubmitError(typeof message === 'string' ? message : 'Não foi possível salvar. Tente de novo.');
}

export async function fetchContacts(slug: string, query: ContactListQuery): Promise<ListPage<Contact>> {
  const response = await api.e[':tenant'].contacts.$get({
    param: { tenant: slug },
    query: {
      page: String(query.page),
      pageSize: String(query.pageSize),
      ...(query.q ? { q: query.q } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
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
