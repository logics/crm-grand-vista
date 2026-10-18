import type { Session } from '@crm/shared';
import { Button } from '@crm/ui';
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { PageState } from '../../shell/page-state.js';
import { useSession } from './session.js';

/**
 * Rota-mãe de tudo o que exige login: sem sessão, leva ao login. As rotas
 * filhas leem a sessão por `useAuthenticatedSession`, já garantida.
 */
export function RequireSession() {
  const { data: session, isPending, isError, refetch } = useSession();

  if (isPending) return null;
  if (isError) {
    return (
      <PageState
        icon="alert-triangle"
        title="Não foi possível carregar a sessão"
        description="Verifique a conexão e tente de novo."
        action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
      />
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  return <Outlet context={session} />;
}

export function useAuthenticatedSession(): Session {
  return useOutletContext<Session>();
}
