// Caminhos de empresa no front: `/e/<tenant>/...`, como na API.

/** Parâmetro de rota que carrega o slug. */
export const TENANT_PARAM = 'tenant';

/** A raiz da empresa. */
export function tenantRootPath(slug: string): string {
  return `/e/${encodeURIComponent(slug)}`;
}

/** Uma página da empresa, pelo caminho sob a raiz (`'farms'`); `''` é a raiz. */
export function tenantPath(slug: string, path: string): string {
  return path ? `${tenantRootPath(slug)}/${path}` : tenantRootPath(slug);
}

const TENANT_SEGMENT = /^\/e\/[^/]+/;

/**
 * O mesmo recurso sob a outra empresa: troca só o segmento do slug. Se o
 * recurso não existir lá, quem diz é a API, e a página leva à raiz da empresa
 * (`TenantRouteError`). Busca e âncora ficam para trás: filtro que cita id de
 * registro da empresa anterior não vale na outra.
 */
export function switchTenantPath(pathname: string, toSlug: string): string {
  const root = tenantRootPath(toSlug);
  return TENANT_SEGMENT.test(pathname) ? pathname.replace(TENANT_SEGMENT, root) : root;
}

/** Estado de navegação da troca de empresa: diz à página de destino de onde se veio. */
export const tenantSwitchState = { tenantSwitch: true } as const;

export function isTenantSwitch(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'tenantSwitch' in state && state.tenantSwitch === true;
}
