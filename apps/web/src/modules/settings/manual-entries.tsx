import { vocabularyListQuerySchema, type VocabularyDefinition, type VocabularyEntry, type VocabularyKey } from '@crm/shared';
import { Card, ReorderableList } from '@crm/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { fetchEntries, reorderEntries } from './vocabulary-api.js';

interface ManualEntriesProps {
  vocabulary: VocabularyDefinition & { key: VocabularyKey };
  /** Relê as listas do cadastro depois de uma escrita. */
  refresh: () => unknown;
  onError: (message: string | undefined) => void;
  renderRow: (entry: VocabularyEntry) => ReactNode;
}

/**
 * Lista de um cadastro de ordem manual: a lista inteira (reordenar exige todas
 * as entradas, então sem busca nem filtro), reordenável por arrastar, alça de
 * teclado e botões. A nova ordem aparece de imediato; se a API recusar, a
 * releitura devolve a ordem do servidor.
 */
export function ManualEntries({ vocabulary, refresh, onError, renderRow }: ManualEntriesProps) {
  const { key, label } = vocabulary;
  const slug = useTenantSlug();
  const queryClient = useQueryClient();
  const queryPath = ['settings', 'vocabularies', key, 'ordered'] as const;
  const ordered = useTenantQuery(queryPath, (tenantSlug) =>
    fetchEntries(tenantSlug, key, vocabularyListQuerySchema.parse({})),
  );

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderEntries(slug, key, ids),
    onMutate: (ids) => {
      onError(undefined);
      queryClient.setQueryData<typeof ordered.data>(tenantQueryKey(slug, ...queryPath), (current) => {
        if (!current) return current;
        const byId = new Map(current.items.map((entry) => [entry.id, entry]));
        // lista que mudou por fora no meio do movimento: a releitura (`onSettled`) corrige
        if (!ids.every((id) => byId.has(id))) return current;
        return { ...current, items: ids.map((id) => byId.get(id)!) };
      });
    },
    onError: (error) => onError(error.message),
    onSettled: refresh,
  });

  if (ordered.isPending) return <LoadingState />;
  if (ordered.isError) {
    return <LoadFailedState inline title="Não foi possível carregar a lista" onRetry={() => ordered.refetch()} />;
  }
  return (
    <Card>
      <ReorderableList
        aria-label={label.plural}
        items={ordered.data.items}
        getId={(entry) => entry.id}
        getLabel={(entry) => entry.name}
        onReorder={(ids) => reorder.mutate(ids)}
        disabled={reorder.isPending}
        renderItem={renderRow}
      />
    </Card>
  );
}
