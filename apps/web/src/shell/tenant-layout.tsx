import { SidebarNav, TopBar, useBelowBreakpoint } from '@crm/ui';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuthenticatedSession } from '../modules/auth/require-session.js';
import { AccountMenu } from './account-menu.js';
import { activeTenantName } from './active-tenant.js';
import { activeNavigationId, NAVIGATION, navigationPath, visibleNavigation } from './navigation.js';
import { LoadFailedState } from './page-state.js';
import { canIn, useTenantAccess } from './tenant-access.js';
import { useTenantSlug } from './tenant-query.js';
import { TenantUnavailable } from './tenant-unavailable.js';

// Casca da empresa, `/e/<tenant>/...`: entra só depois de a API aceitar a
// empresa da URL. Navegação lateral à esquerda — só com os itens que as
// permissões efetivas liberam —, cabeçalho com a empresa e o menu de conta
// (seletor de empresa e saída), e a página — a única parte que rola.
//
// No mobile a navegação lateral sai; a barra de abas que a substitui chega com
// os primeiros módulos, quando houver mais de uma página para alternar.
export function TenantLayout() {
  const session = useAuthenticatedSession();
  const slug = useTenantSlug();
  const access = useTenantAccess(slug);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const collapsed = useBelowBreakpoint('rail');

  if (access.isPending) return null;
  if (access.isError) return <LoadFailedState title="Não foi possível abrir a empresa" onRetry={() => void access.refetch()} />;
  if (access.data.status !== 'open') {
    return <TenantUnavailable session={session} slug={slug} reason={access.data.status} />;
  }

  const openEntry = (id: string) => {
    const path = navigationPath(NAVIGATION, id, slug);
    if (path) void navigate(path);
  };

  return (
    <div className="flex h-dvh gap-gap-shell p-gap-shell max-mobile:p-gap-shell-mobile">
      <SidebarNav
        className="max-mobile:hidden"
        collapsed={collapsed}
        items={visibleNavigation(NAVIGATION, canIn(access.data))}
        active={activeNavigationId(NAVIGATION, pathname)}
        onSelect={openEntry}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-shell max-mobile:gap-gap-shell-mobile">
        <TopBar title={activeTenantName(session, slug)} actions={<AccountMenu session={session} slug={slug} />} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {/* Remonta a página a cada empresa: nenhum estado da anterior sobrevive à troca. */}
          <Outlet key={slug} context={session} />
        </main>
      </div>
    </div>
  );
}
