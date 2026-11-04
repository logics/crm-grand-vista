// A semente de toda empresa: os cadastros auxiliares que já nascem preenchidos.
// Fonte única de duas aplicações — a migration que semeia as empresas que já
// existiam e o `tenant:provision` das novas. Os demais cadastros nascem vazios,
// e os parâmetros da empresa nascem com os defaults de `tenant_settings`.
import type { COMMERCIAL_STATUS_MEANINGS } from './vocabulary.js';

export interface SeedCommercialStatus {
  name: string;
  systemMeaning: keyof typeof COMMERCIAL_STATUS_MEANINGS;
}

export interface TenantSeed {
  /** Na ordem de exibição: o cadastro é de ordem manual. */
  commercialStatuses: readonly SeedCommercialStatus[];
  documentCategories: readonly string[];
  crops: readonly string[];
}

export const TENANT_SEED: TenantSeed = {
  commercialStatuses: [
    { name: 'Disponível', systemMeaning: 'available' },
    { name: 'Em negociação', systemMeaning: 'negotiating' },
    { name: 'Vendida', systemMeaning: 'sold' },
    { name: 'Suspensa', systemMeaning: 'suspended' },
  ],
  documentCategories: ['CAR', 'CCIR', 'Contratos', 'Georreferenciamento', 'Laudos', 'Licenças', 'Mapas', 'Matrículas'],
  crops: ['Algodão', 'Café', 'Cana-de-açúcar', 'Milho', 'Pecuária', 'Soja'],
};
