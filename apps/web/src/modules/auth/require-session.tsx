import type { Session } from '@crm/shared';
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { LoadFailedState } from '../../shell/page-state.js';
import { useSession } from './session.js';

/**
 * Rota-mãe de tudo o que exige login: sem sessão, leva ao login. As rotas
 * filhas leem a sessão por `useAuthenticatedSession`, já garantida.
 */
export function RequireSession() {
  const { data: session, isPending, isError, refetch } = useSession();

  if (isPending) return null;
  if (isError) return <LoadFailedState title="Não foi possível carregar a sessão" onRetry={() => void refetch()} />;
  if (!session) return <Navigate to="/login" replace />;

  return <Outlet context={session} />;
}

export function useAuthenticatedSession(): Session {
  return useOutletContext<Session>();
}
