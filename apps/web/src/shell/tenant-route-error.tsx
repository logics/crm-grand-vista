import { EmptyState } from '@crm/ui';
import { Navigate, useLocation, useRouteError } from 'react-router';
import { isTenantSwitch, tenantRootPath } from './tenant-path.js';
import { ResourceNotFoundError, useTenantSlug } from './tenant-query.js';
import { TextLink } from './text-link.js';

/**
 * Erro das páginas de empresa, dentro da casca. Registro que não existe na
 * empresa: vindo da troca de empresa, é o recurso da anterior que não existe
 * nesta, e a troca leva à raiz da empresa; por link ou digitação, a página diz
 * que ele não existe. Qualquer outro erro sobe.
 */
export function TenantRouteError() {
  const error = useRouteError();
  const { state } = useLocation();
  const slug = useTenantSlug();

  if (!(error instanceof ResourceNotFoundError)) throw error;
  if (isTenantSwitch(state)) return <Navigate to={tenantRootPath(slug)} replace />;

  return (
    <EmptyState
      icon="search-x"
      title="Registro não encontrado"
      description="Ele não existe nesta empresa, ou foi removido."
      action={<TextLink to={tenantRootPath(slug)}>Ir para o início da empresa</TextLink>}
    />
  );
}
