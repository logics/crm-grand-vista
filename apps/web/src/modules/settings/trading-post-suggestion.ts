import { tradingPostSuggestionSchema, type TradingPostSuggestion } from '@crm/shared';
import { api } from '../../lib/api.js';

/**
 * A praça ativa que atende o município (código IBGE), pela leitura de apoio do
 * módulo de configurações. A sugestão é só do front: quem grava é o formulário
 * que a usa, e a API grava o que recebe.
 */
export async function fetchTradingPostSuggestion(slug: string, municipality: string): Promise<TradingPostSuggestion> {
  const response = await api.e[':tenant'].settings['trading-posts'].suggestion.$get({
    param: { tenant: slug },
    query: { municipality },
  });
  if (!response.ok) throw new Error(`Falha ao buscar a praça do município: HTTP ${response.status}.`);
  return tradingPostSuggestionSchema.parse(await response.json());
}
