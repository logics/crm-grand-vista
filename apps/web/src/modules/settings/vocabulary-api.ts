import type {
  CreateVocabularyEntryInput,
  ListPage,
  UpdateVocabularyEntryInput,
  VocabularyEntry,
  VocabularyKey,
  VocabularyListQuery,
} from '@crm/shared';
import { api } from '../../lib/api.js';

// Chamadas da API de cadastros auxiliares (`/e/:tenant/settings/vocabularies`).
// A recusa de regra (409, 404) vira `VocabularyRequestError` com a mensagem
// pronta da API, para o diálogo exibi-la sem fechar.

export class VocabularyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'VocabularyRequestError';
  }
}

async function failure(response: Response): Promise<VocabularyRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body.error as { message?: unknown } | null)?.message
      : undefined;
  return new VocabularyRequestError(
    typeof message === 'string' ? message : 'Não foi possível concluir a operação. Tente de novo.',
    response.status,
  );
}

export async function fetchEntries(
  slug: string,
  key: VocabularyKey,
  query: VocabularyListQuery,
): Promise<ListPage<VocabularyEntry>> {
  const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'].$get({
    param: { tenant: slug, vocabulary: key },
    query: {
      page: String(query.page),
      pageSize: String(query.pageSize),
      status: query.status,
      ...(query.q ? { q: query.q } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
    },
  });
  if (!response.ok) throw new Error(`Falha ao listar o cadastro: HTTP ${response.status}.`);
  return (await response.json()) as ListPage<VocabularyEntry>;
}

export async function createEntry(slug: string, key: VocabularyKey, json: CreateVocabularyEntryInput) {
  const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'].$post({
    param: { tenant: slug, vocabulary: key },
    json,
  });
  if (response.status !== 201) throw await failure(response);
}

export async function updateEntry(slug: string, key: VocabularyKey, id: string, json: UpdateVocabularyEntryInput) {
  const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'][':id'].$patch({
    param: { tenant: slug, vocabulary: key, id },
    json,
  });
  if (response.status !== 200) throw await failure(response);
}

export async function deleteEntry(slug: string, key: VocabularyKey, id: string) {
  const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'][':id'].$delete({
    param: { tenant: slug, vocabulary: key, id },
  });
  if (response.status !== 204) throw await failure(response);
}
