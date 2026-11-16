import { FarmPicker, type FarmPickerProps } from '@crm/ui';
import { useMemo } from 'react';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { resolveFarmOptions, searchFarmOptions } from './farms-api.js';

// Seletor de fazenda já ligado à API da empresa ativa, como o `ContactField` é
// para contatos: nenhum módulo escreve a sua busca de fazenda. A busca vem de
// `GET /farms/options` (sem desativadas, no escopo de quem busca); os ids
// gravados são hidratados com elas. Sem ação de cadastrar.

/** `Omit` que preserva a união entre seleção única e múltipla. */
type WithoutSource<P> = P extends unknown ? Omit<P, 'search' | 'resolve' | 'onCreate' | 'createLabel'> : never;

export type FarmFieldProps = WithoutSource<FarmPickerProps>;

export function FarmField(props: FarmFieldProps) {
  const slug = useTenantSlug();
  const search = useMemo(() => searchFarmOptions(slug), [slug]);
  const resolve = useMemo(() => resolveFarmOptions(slug), [slug]);
  return <FarmPicker {...props} search={search} resolve={resolve} />;
}
