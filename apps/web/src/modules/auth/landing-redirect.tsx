import type { Session } from '@crm/shared';
import { Navigate } from 'react-router';
import { PageState } from '../../shell/page-state.js';
import { landingPath } from './landing.js';
import { LogoutButton } from './logout-button.js';

/** Leva o usuário logado à empresa padrão; sem vínculo algum, diz isso e oferece a saída. */
export function LandingRedirect({ session }: { session: Session }) {
  const path = landingPath(session);
  if (path) return <Navigate to={path} replace />;

  return (
    <PageState
      icon="users"
      title="Nenhuma empresa vinculada"
      description="Este usuário ainda não tem acesso a nenhuma empresa. O acesso é liberado pelo responsável pela empresa."
      action={<LogoutButton />}
    />
  );
}
