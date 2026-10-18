import { TopBar } from '@crm/ui';
import { useParams } from 'react-router';
import { LogoutButton } from '../modules/auth/logout-button.js';
import { useAuthenticatedSession } from '../modules/auth/require-session.js';

// Raiz da empresa, `/e/<tenant>/`: por ora, só o cabeçalho com a empresa, o
// usuário e a saída. O shell completo (navegação, seletor de empresa, tela de
// empresa inacessível) vem com as issues #20 e #36.
export function TenantHome() {
  const session = useAuthenticatedSession();
  const { tenant: slug } = useParams();
  const tenant = session.tenants.find((item) => item.slug === slug);

  return (
    <div className="p-gap-shell max-mobile:p-gap-shell-mobile">
      <TopBar
        breadcrumb={session.user.name}
        title={tenant?.name ?? slug}
        actions={<LogoutButton size="sm" />}
      />
    </div>
  );
}
