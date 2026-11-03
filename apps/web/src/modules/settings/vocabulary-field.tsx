import type { VocabularyKey } from '@crm/shared';
import { VocabularyPicker, type VocabularyPickerProps } from '@crm/ui';
import { useMemo } from 'react';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { resolveVocabularyOptions, searchVocabularyOptions } from './vocabulary-source.js';

// Seletor de entrada de um cadastro auxiliar já ligado à API da empresa ativa:
// é o que contatos e fazendas usam em formulários (`mode="form"`) e filtros
// (`mode="filter"`). Nenhum módulo escreve a sua busca.

/** `Omit` que preserva a união entre seleção única e múltipla. */
type WithoutSource<P> = P extends unknown ? Omit<P, 'search' | 'resolve'> : never;

export type VocabularyFieldProps = WithoutSource<VocabularyPickerProps> & { vocabulary: VocabularyKey };

export function VocabularyField({ vocabulary, mode = 'form', ...props }: VocabularyFieldProps) {
  const slug = useTenantSlug();
  const search = useMemo(() => searchVocabularyOptions(slug, vocabulary, mode), [slug, vocabulary, mode]);
  const resolve = useMemo(() => resolveVocabularyOptions(slug, vocabulary), [slug, vocabulary]);
  return <VocabularyPicker mode={mode} search={search} resolve={resolve} {...props} />;
}
