// @vitest-environment jsdom
import '../../support/dom.js';
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const me = session().user;
const status = { id: '0197c000-0000-7000-8000-0000000000c1', name: 'Disponível', active: true };

const farm = {
  id: 'f1',
  name: 'Fazenda Boa Vista',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  responsible: { id: me.id, name: me.name },
  tradingPost: null,
  commercialStatus: { id: status.id, name: status.name },
  totalAreaHa: '48.4000',
  usableAreaHa: null,
  salesPotential: null,
  priority: null,
  waterAvailability: null,
  irrigationPotential: null,
  productivePotential: null,
  distanceToHighwayKm: null,
  distanceToWarehouseKm: null,
  documentStatus: null,
  documentNotes: null,
  soil: null,
  topography: null,
  water: null,
  historicalProductivity: null,
  infrastructure: null,
  technicalSummary: null,
  differentials: null,
  latitude: null,
  longitude: null,
  aptitudes: [],
  crops: [],
  createdAt: '2026-01-02T10:00:00.000Z',
};

/** API falsa com `PATCH` de fazenda que salva. */
function stubFarm() {
  stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.editar', 'fazendas.criar'],
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': farm,
      '/e/grand-vista/municipalities': { items: [{ ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true }] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [] },
      '/e/grand-vista/settings/vocabularies/aptitudes/options': { items: [] },
      '/e/grand-vista/settings/vocabularies/crops/options': { items: [] },
      '/e/grand-vista/settings/vocabularies/commercial-statuses/options': { items: [status] },
      '/e/grand-vista/users': { users: [{ ...me, profiles: [] }] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
    },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'PATCH') return json({ ...farm, name: 'Fazenda Boa Vista II' });
      return fallback(input, init);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const leave = (router: { navigate: (to: string) => Promise<void> }) => act(() => void router.navigate('/e/grand-vista/farms'));

describe('aviso de alteração não salva no formulário de fazenda', () => {
  it('formulário sujo: sair abre "Sair sem salvar?" e cancelar mantém o digitado', async () => {
    stubFarm();
    const { router, pathname } = renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /^Nome/ }), ' II');
    await leave(router);

    expect(await screen.findByRole('dialog', { name: 'Sair sem salvar?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(pathname()).toBe('/e/grand-vista/farms/f1/edit');
    expect(screen.getByRole('textbox', { name: /^Nome/ })).toHaveValue('Fazenda Boa Vista II');
  });

  it('formulário limpo sai sem perguntar', async () => {
    stubFarm();
    const { router, pathname } = renderApp('/e/grand-vista/farms/f1/edit');
    await screen.findByRole('textbox', { name: /^Nome/ });

    await leave(router);

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/farms'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });

  it('depois do save bem-sucedido, o redirecionamento não abre o aviso', async () => {
    stubFarm();
    const { pathname } = renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /^Nome/ }), ' II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/farms/f1'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
  });
});
