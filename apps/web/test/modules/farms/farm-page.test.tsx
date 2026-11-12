// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const farm = (systemMeaning: string, statusName: string) => ({
  id: 'f1',
  name: 'Fazenda Boa Vista',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  responsible: { id: 'u1', name: 'Ana Ribeiro' },
  tradingPost: null,
  commercialStatus: { id: 's1', name: statusName, systemMeaning },
  totalAreaHa: '48.4000',
  usableAreaHa: null,
  createdAt: '2026-01-02T10:00:00.000Z',
});

const emptyHistory = { entries: [] };

afterEach(() => {
  vi.unstubAllGlobals();
});

/** API falsa com o DELETE da fazenda, que ela não conhece, respondendo `answer`. */
function open(meaning: 'inactive' | 'available', permissions: string[], answer: () => Response = () => new Response(null, { status: 204 })) {
  const api = stubFakeApi({
    session: session(),
    permissions: permissions as never,
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': farm(meaning, meaning === 'inactive' ? 'Desativada' : 'Disponível'),
      '/e/grand-vista/farms/f1/history': emptyHistory,
      '/e/grand-vista/farms': { items: [], total: 0, page: 1, pageSize: 25 },
    },
  });
  const base = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const method = init?.method ?? request?.method ?? 'GET';
    const path = new URL(request?.url ?? String(input), 'http://localhost').pathname;
    if (method === 'DELETE' && path === '/e/grand-vista/farms/f1') {
      api.requests.push({ method, path, init });
      return Promise.resolve(answer());
    }
    return base(input, init);
  });
  return { api, ...renderApp('/e/grand-vista/farms/f1') };
}

const deletes = (api: { requests: { method: string }[] }) => api.requests.filter((request) => request.method === 'DELETE');

describe('excluir pela ficha da fazenda', () => {
  it('excluir só habilita com o nome exato digitado e, confirmado, volta para a lista', async () => {
    const { api, pathname } = open('inactive', ['fazendas.ver', 'fazendas.excluir']);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Excluir' });
    const field = within(dialog).getByLabelText('Digite o nome da fazenda para confirmar');

    expect(confirm).toBeDisabled();
    await user.type(field, 'Fazenda Boa');
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, 'fazenda boa vista');
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, 'Fazenda Boa Vista');
    expect(confirm).toBeEnabled();
    expect(deletes(api)).toHaveLength(0);

    await user.click(confirm);

    await vi.waitFor(() => expect(pathname()).toBe('/e/grand-vista/farms'));
    expect(deletes(api)).toHaveLength(1);
  });

  it('fazenda não desativada mostra a explicação em vez do diálogo', async () => {
    const { api } = open('available', ['fazendas.ver', 'fazendas.excluir']);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Desative a fazenda antes de excluir.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Entendi' }));
    expect(deletes(api)).toHaveLength(0);
  });

  it('recusada pela API, mostra o 409 sem sair da ficha', async () => {
    const { pathname } = open(
      'inactive',
      ['fazendas.ver', 'fazendas.excluir'],
      () =>
        new Response(JSON.stringify({ error: { code: 'conflict', message: 'Desative a fazenda antes de excluir.' } }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Fazenda Boa Vista');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Desative a fazenda antes de excluir.')).toBeInTheDocument();
    expect(pathname()).toBe('/e/grand-vista/farms/f1');
  });

  it('sem fazendas.excluir não mostra o botão Excluir', async () => {
    open('inactive', ['fazendas.ver', 'fazendas.editar']);

    await screen.findByRole('button', { name: 'Editar' });
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });
});
