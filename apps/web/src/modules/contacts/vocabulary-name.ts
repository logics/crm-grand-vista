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
