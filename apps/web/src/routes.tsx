import { Navigate, type RouteObject } from 'react-router';
import { LandingRedirect } from './modules/auth/landing-redirect.js';
import { LoginPage } from './modules/auth/login-page.js';
import { RequireSession, useAuthenticatedSession } from './modules/auth/require-session.js';
import { TenantHome } from './shell/tenant-home.js';

function Root() {
  return <LandingRedirect session={useAuthenticatedSession()} />;
}

// Rotas do front. `/login` é a única aberta; o resto exige sessão. A empresa
// vai no caminho (`/e/:tenant/...`), como na API.
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      { index: true, element: <Root /> },
      { path: '/e/:tenant/*', element: <TenantHome /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
