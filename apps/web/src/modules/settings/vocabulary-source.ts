import {
  type VocabularyKey,
  type VocabularyOption,
  type VocabularyOptionsPage,
  vocabularyOptionsPageSchema,
} from '@crm/shared';
import type { VocabularyPickerMode } from '@crm/ui';
import { api } from '../../lib/api.js';

// Busca e hidratação do `VocabularyPicker` pela rota real
// (`GET /e/:tenant/settings/vocabularies/:vocabulary/options`). Quem usa o
// seletor (contatos, fazendas) passa o slug da empresa ativa e a chave do
// cadastro, e entrega os dois ao picker: `search` e `resolve`. No modo filtro a
// busca pede as inativas; no formulário, não.

type SearchOptions = { signal: AbortSignal; cursor?: string };

async function readPage(response: Response): Promise<VocabularyOptionsPage> {
  if (!response.ok) throw new Error(`Falha ao buscar as opções: HTTP ${response.status}.`);
  return vocabularyOptionsPageSchema.parse(await response.json());
}

export function searchVocabularyOptions(slug: string, key: VocabularyKey, mode: VocabularyPickerMode = 'form') {
  return async (term: string, { signal, cursor }: SearchOptions): Promise<VocabularyOptionsPage> => {
    const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'].options.$get(
      {
        param: { tenant: slug, vocabulary: key },
        query: {
          ...(term ? { q: term } : {}),
          ...(cursor ? { cursor } : {}),
          ...(mode === 'filter' ? { includeInactive: 'true' as const } : {}),
        },
      },
      { init: { signal } },
    );
    return readPage(response);
  };
}

/** Hidrata os ids gravados, ativos ou não: a entrada inativa continua exibida no formulário. */
export function resolveVocabularyOptions(slug: string, key: VocabularyKey) {
  return async (ids: string[]): Promise<VocabularyOption[]> => {
    if (ids.length === 0) return [];
    const response = await api.e[':tenant'].settings.vocabularies[':vocabulary'].options.$get({
      param: { tenant: slug, vocabulary: key },
      query: { ids: ids.join(',') },
    });
    return (await readPage(response)).items;
  };
}
