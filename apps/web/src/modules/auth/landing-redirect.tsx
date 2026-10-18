import type { Session } from '@crm/shared';
import { EmptyState } from '@crm/ui';
import { Navigate } from 'react-router';
import { landingPath } from './landing.js';
import { LogoutButton } from './logout-button.js';

/** Leva o usuário logado à empresa padrão; sem vínculo algum, diz isso e oferece a saída. */
export function LandingRedirect({ session }: { session: Session }) {
  const path = landingPath(session);
  if (path) return <Navigate to={path} replace />;

  return (
    <main className="grid min-h-dvh place-items-center p-gap-shell">
      <EmptyState
        icon="users"
        title="Nenhuma empresa vinculada"
        description="Seu usuário ainda não tem acesso a nenhuma empresa. Procure o responsável pela empresa em que você trabalha."
        action={<LogoutButton />}
      />
    </main>
  );
}
