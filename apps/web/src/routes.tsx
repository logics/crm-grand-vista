import { Navigate, type RouteObject } from 'react-router';
import { LandingRedirect } from './modules/auth/landing-redirect.js';
import { LoginPage } from './modules/auth/login-page.js';
import { RequireSession, useAuthenticatedSession } from './modules/auth/require-session.js';
import { TenantHome } from './shell/tenant-home.js';
import { TenantLayout } from './shell/tenant-layout.js';
import { TENANT_PARAM } from './shell/tenant-path.js';
import { TenantRouteError } from './shell/tenant-route-error.js';

/** A raiz `/`: leva quem está logado à empresa padrão. */
function SessionLanding() {
  return <LandingRedirect session={useAuthenticatedSession()} />;
}

/** Rota que recebe as páginas de empresa: cada módulo registra as suas aqui. */
export const TENANT_PAGES_ROUTE_ID = 'tenant-pages';

// Rotas do front. `/login` é a única aberta; o resto exige sessão. A empresa
// vai no caminho (`/e/:tenant/...`), como na API.
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      { index: true, element: <SessionLanding /> },
      {
        path: `/e/:${TENANT_PARAM}`,
        element: <TenantLayout />,
        children: [
          {
            id: TENANT_PAGES_ROUTE_ID,
            errorElement: <TenantRouteError />,
            children: [
              { index: true, element: <TenantHome /> },
              // Página que o front não tem leva à raiz da empresa.
              { path: '*', element: <Navigate to="." replace /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
