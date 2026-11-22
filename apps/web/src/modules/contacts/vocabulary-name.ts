import type { VocabularyKey } from '@crm/shared';
import { useTenantQuery } from '../../shell/tenant-query.js';
import { resolveVocabularyOptions } from '../settings/vocabulary-source.js';

/**
 * Nome da entrada do cadastro auxiliar que o contato guarda por id; vazio
 * enquanto carrega. A chave de cache é por id: as linhas da lista que repetem
 * a mesma classificação fazem um pedido só.
 */
export function useVocabularyName(vocabulary: VocabularyKey, id: string | null): string | null {
  const entry = useTenantQuery(['vocabulary-entry', vocabulary, id ?? 'none'], async (slug) =>
    id ? ((await resolveVocabularyOptions(slug, vocabulary)([id]))[0] ?? null) : null,
  );
  return entry.data?.name ?? null;
}

/**
 * Nomes das entradas que o contato guarda por lista de ids, na ordem do cadastro
 * (alfabética); vazio enquanto carrega. Uma consulta só por lista.
 */
export function useVocabularyNames(vocabulary: VocabularyKey, ids: readonly string[]): string[] {
  const entries = useTenantQuery(['vocabulary-entries', vocabulary, [...ids].sort().join(',')], async (slug) =>
    resolveVocabularyOptions(slug, vocabulary)([...ids]),
  );
  return (entries.data ?? []).map((entry) => entry.name);
}
