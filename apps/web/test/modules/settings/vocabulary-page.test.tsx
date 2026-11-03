// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const LIST_PATH = '/e/grand-vista/settings/vocabularies/crops';

const page = (items: { id: string; name: string; active: boolean }[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A API falsa de sempre, mais a escrita de cultura que ela não conhece: o teste dá a resposta. */
function stubCrops(write: () => Response) {
  const api = stubFakeApi({
    session: session(),
    permissions: ['configuracoes.gerenciar'],
    records: { [LIST_PATH]: page([{ id: '1', name: 'Soja', active: true }]) },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'POST' ? write() : fallback(input, init),
    ),
  );
  return api;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cadastro auxiliar de culturas', () => {
  it('lista as entradas e leva do menu de Configurações ao cadastro', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['configuracoes.gerenciar'],
      records: { [LIST_PATH]: page([{ id: '1', name: 'Soja', active: true }]) },
    });
    renderApp('/e/grand-vista');

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Configurações' }));

    expect(await screen.findByRole('heading', { name: 'Culturas' })).toBeInTheDocument();
    expect(await screen.findByText('Soja')).toBeInTheDocument();
  });

  it('esconde o menu Configurações de quem não tem a permissão', async () => {
    stubFakeApi({ session: session() });
    renderApp('/e/grand-vista');

    await screen.findByRole('navigation');
    expect(screen.queryByRole('button', { name: 'Configurações' })).not.toBeInTheDocument();
  });

  it('mostra o 409 no diálogo sem fechá-lo', async () => {
    stubCrops(() =>
      json({ error: { code: 'conflict', message: 'Já existe uma entrada inativa com esse nome; reative-a.' } }, 409),
    );
    renderApp(LIST_PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Nova cultura' }));
    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Soja');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Já existe uma entrada inativa com esse nome; reative-a.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha o diálogo quando a criação passa', async () => {
    stubCrops(() => json({ id: '2', name: 'Milho', active: true }, 201));
    renderApp(LIST_PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Nova cultura' }));
    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Milho');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
