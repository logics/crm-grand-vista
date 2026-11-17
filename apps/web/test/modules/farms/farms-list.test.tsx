// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { belowQuery } from '@crm/ui';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { primaryOwnerLabel } from '../../../src/modules/farms/farms-page.js';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const owner = (name: string, isPrimary: boolean) => ({ contactId: name, name, isPrimary });

const pecuaria = { id: '0197c000-0000-7000-8000-0000000000b1', name: 'Pecuária', active: true };
const agricultura = { id: '0197c000-0000-7000-8000-0000000000b2', name: 'Agricultura', active: true };

const farm = (overrides = {}) => ({
  id: 'f1',
  name: 'Fazenda Santa Rita',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  responsible: { id: 'u1', name: 'Ana Ribeiro' },
  tradingPost: null,
  commercialStatus: { id: 's1', name: 'Disponível', systemMeaning: 'available' },
  totalAreaHa: '1000.0000',
  usableAreaHa: null,
  salesPotential: 'high',
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
  pricingMode: 'brl',
  askingPrice: '12000000.00',
  valuationBags: null,
  valuationBagsUnit: null,
  valuationBagsAlqueireType: null,
  valuationCrop: null,
  aptitudes: [],
  crops: [],
  owners: [owner('Maria', true)],
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

const open = (
  search = '',
  { items = [farm()], permissions = ['fazendas.ver'] as PermissionCode[] } = {},
  scope: 'all' | 'own' = 'own',
) => {
  const api = stubFakeApi({
    session: session(),
    permissions,
    dataScopes: { fazendas: scope },
    records: {
      '/e/grand-vista/farms': page(items),
      '/e/grand-vista/municipalities': { items: [{ ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true }] },
      '/e/grand-vista/settings/vocabularies/aptitudes/options': { items: [pecuaria, agricultura] },
      '/e/grand-vista/settings/vocabularies/commercial-statuses/options': { items: [] },
    },
  });
  const app = renderApp(`/e/grand-vista/farms${search}`);
  return { api, ...app };
};

/** Parâmetros do último pedido de página à API de fazendas. */
const lastListParams = (api: ReturnType<typeof stubFakeApi>) => {
  const request = api.requests.filter((r) => r.path === '/e/grand-vista/farms').at(-1);
  return request ? new URLSearchParams(request.search ?? '') : undefined;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lista de fazendas: proprietário principal', () => {
  it('mostra o principal com +N quando há mais proprietários', () => {
    expect(primaryOwnerLabel([owner('João', false), owner('Maria', true), owner('Pedro', false)])).toBe('Maria +2');
  });

  it('mostra só o nome com um proprietário e traço sem nenhum', () => {
    expect(primaryOwnerLabel([owner('Maria', true)])).toBe('Maria');
    expect(primaryOwnerLabel([])).toBe('—');
  });
});

describe('lista de fazendas: filtros pela URL (critério 24)', () => {
  it('o link com UF e aptidão reabre a lista: a API recebe os parâmetros e os controles mostram', async () => {
    const { api } = open(`?region=GO&aptitudeId=${pecuaria.id}&areaMin=500&noPrice=true&q=sant&sort=-askingPrice`);

    await screen.findByRole('table');
    expect(Object.fromEntries(lastListParams(api)!)).toMatchObject({
      region: 'GO',
      aptitudeId: pecuaria.id,
      areaMin: '500',
      noPrice: 'true',
      q: 'sant',
      sort: '-askingPrice',
    });
    expect(screen.getByRole('searchbox')).toHaveValue('sant');
    expect(await screen.findByRole('combobox', { name: 'Região' })).toHaveTextContent(/Goiás|GO/);
  });

  it('escolher a aptidão escreve na URL, mantém os outros filtros e volta à página 1', async () => {
    const { api, router } = open('?page=2&region=GO');
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    await user.click(await screen.findByRole('combobox', { name: 'Aptidão' }));
    await user.click(await screen.findByRole('option', { name: 'Agricultura' }));

    await waitFor(() => expect(router.state.location.search).toContain(`aptitudeId=${agricultura.id}`));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('region')).toBe('GO');
    expect(params.has('page')).toBe(false);
    await waitFor(() => expect(lastListParams(api)?.get('aptitudeId')).toBe(agricultura.id));
  });

  it('"sem preço" desativa o valor, e o valor desativa "sem preço"', async () => {
    const { router } = open();
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('checkbox', { name: 'Sem preço' }));
    await waitFor(() => expect(router.state.location.search).toBe('?noPrice=true'));
    expect(screen.getByLabelText(/Preço pedido mín\./)).toBeDisabled();
    expect(screen.getByLabelText(/Preço pedido máx\./)).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Sem preço' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await user.type(screen.getByLabelText(/Preço pedido máx\./), '5');
    await waitFor(() => expect(router.state.location.search).toContain('priceMax='));
    expect(screen.getByRole('checkbox', { name: 'Sem preço' })).toBeDisabled();
  });

  it('o link com noPrice e priceMin derruba só o noPrice', async () => {
    const { api } = open('?noPrice=true&priceMin=100');

    await screen.findByRole('table');
    const params = lastListParams(api)!;
    expect(params.get('priceMin')).toBe('100');
    expect(params.has('noPrice')).toBe(false);
  });

  it('limpar filtros volta a todos menos desativadas: a API não recebe commercialStatusId', async () => {
    const { api, router } = open('?commercialStatusId=0197c000-0000-7000-8000-0000000000c1&region=GO', { items: [] });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Limpar busca e filtros' }));

    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(lastListParams(api)?.has('commercialStatusId')).toBe(false));
    expect(lastListParams(api)?.has('region')).toBe(false);
  });

  it('corretor responsável só aparece nos filtros com escopo all', async () => {
    open('', {}, 'own');
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    await screen.findByRole('combobox', { name: 'Aptidão' });
    expect(screen.queryByRole('combobox', { name: 'Corretor responsável' })).not.toBeInTheDocument();
  });

  it('com escopo all, o filtro de corretor responsável aparece', async () => {
    open('', {}, 'all');
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));

    expect(await screen.findByRole('combobox', { name: 'Corretor responsável' })).toBeInTheDocument();
  });
});

describe('lista de fazendas: colunas', () => {
  it('mostra preço em reais, avaliação em sacas e "Preço não informado", potencial e prioridade', async () => {
    open('', {
      items: [
        farm(),
        farm({
          id: 'f2',
          name: 'Fazenda Em Sacas',
          pricingMode: 'bags',
          askingPrice: null,
          valuationBags: '1000',
          valuationBagsUnit: 'per_hectare',
          valuationCrop: { id: 'c1', name: 'Soja' },
          priority: 'medium',
        }),
        farm({ id: 'f3', name: 'Fazenda Sem Preço', pricingMode: null, askingPrice: null, salesPotential: null }),
      ],
    });

    const reais = within(await screen.findByRole('row', { name: /Fazenda Santa Rita/ }));
    expect(reais.getByText(/R\$\s*12\.000\.000,00/)).toBeInTheDocument();
    expect(reais.getByText('Alta')).toBeInTheDocument();
    const sacas = within(screen.getByRole('row', { name: /Fazenda Em Sacas/ }));
    expect(sacas.getByText(/1\.000 sacas por hectare · Soja/)).toBeInTheDocument();
    expect(sacas.getByText('Média')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Fazenda Sem Preço/ })).getByText('Preço não informado')).toBeInTheDocument();
  });
});

describe('lista de fazendas no mobile', () => {
  it('o cartão é o FarmCard com nome, município, preço e área', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === belowQuery('mobile') || query === belowQuery('rail'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    open();

    const card = within(await screen.findByRole('list', { name: 'Resultados' }));
    expect(card.getByText('Fazenda Santa Rita')).toBeInTheDocument();
    expect(card.getByText(/Rio Verde/)).toBeInTheDocument();
    expect(card.getByText(/R\$\s*12\.000\.000,00/)).toBeInTheDocument();
    expect(card.queryByText('por hectare')).not.toBeInTheDocument();
  });
});
