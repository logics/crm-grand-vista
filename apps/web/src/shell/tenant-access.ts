// Entrada na empresa da URL: quem decide se o usuário entra é a API, não a
// lista de empresas da sessão — o super admin entra numa empresa sem vínculo.
// A mesma resposta traz as permissões efetivas, que a casca usa para esconder
// item de menu e botão que levariam a 403.
import type { PermissionCode } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { tenantQueryKey, useTenantSlug } from './tenant-query.js';

/** `not_found`: slug inexistente ou sem vínculo, indistinguíveis. `blocked`: tem vínculo, mas a empresa está bloqueada. */
export type TenantRefusal = 'not_found' | 'blocked';

/** `open`: entra, com as permissões efetivas na empresa. */
export type TenantAccess = { status: 'open'; permissions: ReadonlySet<PermissionCode> } | { status: TenantRefusal };

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
      if (status === 404) return { status: 'not_found' };
      if (status === 403 && (await errorCode(response)) === 'tenant_blocked') return { status: 'blocked' };
      if (!response.ok) throw new Error(`Falha ao entrar na empresa: HTTP ${status}.`);
      const { permissions } = await response.json();
      return { status: 'open', permissions: new Set(permissions) };
    },
  });
}

/** Se o acesso aberto concede a permissão; recusa não concede nada. */
export const canIn =
  (access: TenantAccess | undefined) =>
  (permission: PermissionCode): boolean =>
    access?.status === 'open' && access.permissions.has(permission);

/**
 * Se o usuário tem a permissão na empresa ativa, para esconder o botão ou o
 * item de menu que levaria a 403. Cortesia, não controle: a rota da API recusa
 * de qualquer jeito. Só vale sob `TenantLayout`, que já carregou o acesso.
 */
export function useCan(permission: PermissionCode): boolean {
  return canIn(useTenantAccess(useTenantSlug()).data)(permission);
}
