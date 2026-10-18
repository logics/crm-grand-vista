import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppProviders, createQueryClient } from '../../src/app.js';
import { routes, TENANT_PAGES_ROUTE_ID } from '../../src/routes.js';

interface RenderAppOptions {
  /**
   * Páginas de empresa só do teste, montadas onde as de produção montam
   * (sob a casca da empresa e o tratamento de erro dela).
   */
  tenantPages?: RouteObject[];
}

function withTenantPages(tree: RouteObject[], pages: RouteObject[]): RouteObject[] {
  return tree.map((route) =>
    route.id === TENANT_PAGES_ROUTE_ID
      ? { ...route, children: [...pages, ...(route.children ?? [])] }
      : { ...route, children: route.children && withTenantPages(route.children, pages) },
  ) as RouteObject[];
}

/** Monta a aplicação inteira, com as rotas de produção, a partir de um caminho. */
export function renderApp(path: string, { tenantPages = [] }: RenderAppOptions = {}) {
  const router = createMemoryRouter(withTenantPages(routes, tenantPages), { initialEntries: [path] });
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, pathname: () => router.state.location.pathname };
}
