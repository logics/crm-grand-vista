import { formatFieldValue, toDisplayContext, type DisplayContext, type TenantSettings } from '@crm/shared';
import { api } from '../../lib/api.js';
import { useTenantQuery } from '../../shell/tenant-query.js';

// Contexto de exibição da empresa ativa: os parâmetros são carregados uma vez
// por empresa (a chave leva o slug) e entregues à formatação de área, a mesma
// de `@crm/shared` que a API usa no histórico.

export const SETTINGS_QUERY_KEY = ['settings', 'parameters'] as const;

export async function fetchTenantSettings(slug: string): Promise<TenantSettings> {
  const response = await api.e[':tenant'].settings.$get({ param: { tenant: slug } });
  if (!response.ok) throw new Error(`Falha ao carregar os parâmetros: HTTP ${response.status}.`);
  return (await response.json()) as TenantSettings;
}

export function useTenantSettings() {
  // Parâmetros mudam raramente: uma carga por empresa, refeita só ao salvar.
  return useTenantQuery(SETTINGS_QUERY_KEY, fetchTenantSettings);
}

/** Enquanto carrega, hectare: o padrão de uma empresa sem parâmetros. */
export function useDisplayContext(): DisplayContext {
  return toDisplayContext(useTenantSettings().data);
}

/** Formata uma área em hectares (decimal canônico) na unidade da empresa. */
export function useAreaFormatter(): (hectares: string) => string {
  const context = useDisplayContext();
  return (hectares) => formatFieldValue({ type: 'area', label: 'Área' }, hectares, context) ?? '';
}
