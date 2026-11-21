import { type BuyerRegionKey, buyerRegionKeyOf, regionKey, regionLabel } from '@crm/shared';
import { useTenantQuery } from '../../shell/tenant-query.js';
import { resolveMunicipalities } from '../municipalities/municipality-source.js';

/**
 * Rótulos das regiões de interesse gravadas ("Rio Verde — GO", "Goiás (UF)"), na
 * ordem recebida; vazio enquanto carrega. O código IBGE é hidratado pela rota de
 * municípios (ativo ou não); a UF vira rótulo na hora.
 */
export function useRegionLabels(regions: readonly BuyerRegionKey[]): string[] {
  const keys = regions.map(buyerRegionKeyOf);
  const resolved = useTenantQuery(['region-labels', [...keys].sort().join(',')], async (slug) =>
    keys.length === 0 ? [] : resolveMunicipalities(slug)(keys),
  );
  const labelByKey = new Map((resolved.data ?? []).map((region) => [regionKey(region), regionLabel(region)] as const));
  return keys.flatMap((key) => labelByKey.get(key) ?? []);
}
