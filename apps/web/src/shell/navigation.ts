// Navegação lateral da empresa: cada módulo registra aqui o seu item, com a
// permissão que a página exige. O item some para quem não a tem — cortesia,
// não controle: a rota da API recusa de qualquer jeito.
import type { PermissionCode } from '@crm/shared';
import type { IconName, SidebarNavItem } from '@crm/ui';

export type NavigationEntry = {
  id: string;
  label: string;
  icon: IconName;
  /** Caminho sob a raiz da empresa, sem barra: `''` é a raiz, `'farms'` é `/e/<tenant>/farms`. */
  path: string;
  /** Rótulo do grupo; itens do mesmo grupo ficam juntos no registro. */
  section?: string;
  /** Sem permissão exigida, todo usuário da empresa vê o item. */
  permission?: PermissionCode;
};

export const NAVIGATION: NavigationEntry[] = [{ id: 'home', label: 'Início', icon: 'house', path: '' }];

/** Os itens que o usuário pode abrir, com o rótulo de grupo antes do primeiro visível de cada grupo. */
export function visibleNavigation(
  entries: readonly NavigationEntry[],
  can: (permission: PermissionCode) => boolean,
): SidebarNavItem[] {
  const items: SidebarNavItem[] = [];
  let section: string | undefined;
  for (const { id, label, icon, section: entrySection, permission } of entries) {
    if (permission && !can(permission)) continue;
    if (entrySection && entrySection !== section) items.push({ section: entrySection });
    section = entrySection;
    items.push({ id, label, icon });
  }
  return items;
}

/** O item da página aberta: o de caminho igual, ou o do módulo que a contém. */
export function activeNavigationId(entries: readonly NavigationEntry[], pathname: string): string | undefined {
  const [, , , ...rest] = pathname.split('/');
  const relative = rest.filter(Boolean).join('/');
  return entries.find(({ path }) => (path === '' ? relative === '' : relative === path || relative.startsWith(`${path}/`)))?.id;
}
