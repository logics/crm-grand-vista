import { TopBar } from '@crm/ui';
import { Outlet } from 'react-router';
import { LogoutButton } from '../modules/auth/logout-button.js';
import { useAuthenticatedSession } from '../modules/auth/require-session.js';
import { LoadFailedState } from './page-state.js';
import { useTenantAccess } from './tenant-access.js';
import { useTenantSlug } from './tenant-query.js';
import { TenantSwitcher } from './tenant-switcher.js';
import { TenantUnavailable } from './tenant-unavailable.js';

// Casca da empresa, `/e/<tenant>/...`: entra só depois de a API aceitar a
// empresa da URL. Por ora, o cabeçalho com a empresa, o seletor de empresa e a
// saída; a navegação completa vem com a issue #20.
export function TenantLayout() {
  const session = useAuthenticatedSession();
  const slug = useTenantSlug();
  const access = useTenantAccess(slug);

  if (access.isPending) return null;
  if (access.isError) return <LoadFailedState title="Não foi possível abrir a empresa" onRetry={() => void access.refetch()} />;
  if (access.data !== 'open') return <TenantUnavailable session={session} slug={slug} reason={access.data} />;

  const tenant = session.tenants.find((item) => item.slug === slug);

  return (
    <div className="flex flex-col gap-gap-shell p-gap-shell max-mobile:p-gap-shell-mobile">
      <TopBar
        breadcrumb={session.user.name}
        title={tenant?.name ?? slug}
        actions={
          <>
            <TenantSwitcher session={session} slug={slug} />
            <LogoutButton size="sm" />
          </>
        }
      />
      {/* Remonta a página a cada empresa: nenhum estado da anterior sobrevive à troca. */}
      <Outlet key={slug} context={session} />
    </div>
  );
}
