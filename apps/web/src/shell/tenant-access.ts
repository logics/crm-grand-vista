// Entrada na empresa da URL: quem decide se o usuário entra é a API, não a
// lista de empresas da sessão — o super admin entra numa empresa sem vínculo.
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { tenantQueryKey } from './tenant-query.js';

/** `open`: entra. `not_found`: slug inexistente ou sem vínculo, indistinguíveis. `blocked`: tem vínculo, mas a empresa está bloqueada. */
export type TenantAccess = 'open' | 'not_found' | 'blocked';

async function errorCode(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object' && body.error
    ? (body.error as { code?: unknown }).code
    : undefined;
}

export function useTenantAccess(slug: string) {
  return useQuery({
    queryKey: tenantQueryKey(slug, 'access'),
    queryFn: async (): Promise<TenantAccess> => {
      const response = await api.e[':tenant'].permissions.effective.$get({ param: { tenant: slug } });
      // As recusas vêm do middleware de empresa, que o tipo da rota não conhece.
      const status: number = response.status;
      if (status === 404) return 'not_found';
      if (status === 403 && (await errorCode(response)) === 'tenant_blocked') return 'blocked';
      if (!response.ok) throw new Error(`Falha ao entrar na empresa: HTTP ${status}.`);
      return 'open';
    },
  });
}
