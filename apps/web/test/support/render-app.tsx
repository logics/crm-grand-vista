import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from '../../src/app.js';
import { routes } from '../../src/routes.js';

/** Monta a aplicação inteira, com as rotas de produção, a partir de um caminho. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, pathname: () => router.state.location.pathname };
}
