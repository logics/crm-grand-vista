// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const farm = (overrides = {}) => ({
  id: 'f1',
  name: 'Fazenda Boa Vista',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  responsible: { id: 'u1', name: 'Ana Ribeiro' },
  tradingPost: null,
  commercialStatus: { id: 's1', name: 'Disponível' },
  totalAreaHa: '1000.0000',
  usableAreaHa: '800.0000',
  pricingMode: null,
  askingPrice: null,
  valuationBags: null,
  valuationBagsUnit: null,
  valuationBagsAlqueireType: null,
  valuationCrop: null,
  priceDerivatives: { pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: null },
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const open = async (record: object) => {
  stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver'],
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': record,
      '/e/grand-vista/farms/f1/history': { entries: [], nextCursor: null },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
    },
  });
  renderApp('/e/grand-vista/farms/f1');
  await screen.findByRole('heading', { name: 'Fazenda Boa Vista' });
  return waitFor(() => {
    const section = document.querySelector<HTMLElement>('[data-section="data"]');
    if (!section) throw new Error('Seção Dados ainda não montou.');
    return section;
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ficha da fazenda: preço', () => {
  it('em reais: preço pedido, valor por hectare e por hectare útil', async () => {
    const data = await open(
      farm({
        pricingMode: 'brl',
        askingPrice: '80000000.00',
        priceDerivatives: { pricePerHectare: '80000', pricePerUsableHectare: '100000', bagsPerHectare: null },
      }),
    );

    expect(within(data).getByText('R$ 80.000.000,00')).toBeInTheDocument();
    expect(within(data).getByText('Valor por hectare')).toBeInTheDocument();
    expect(within(data).getByText('R$ 80.000,00')).toBeInTheDocument();
    expect(within(data).getByText('Valor por hectare útil')).toBeInTheDocument();
    expect(within(data).getByText('R$ 100.000,00')).toBeInTheDocument();
  });

  it('em sacas: avaliação com o tipo de alqueire, cultura e sacas por hectare, sem valor em reais', async () => {
    const data = await open(
      farm({
        pricingMode: 'bags',
        valuationBags: '7000.0000',
        valuationBagsUnit: 'per_alqueire',
        valuationBagsAlqueireType: 'goiano',
        valuationCrop: { id: 'c1', name: 'Soja' },
        priceDerivatives: { pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: '1446.281' },
      }),
    );

    expect(within(data).getByText('7.000 sacas por alqueire goiano')).toBeInTheDocument();
    expect(within(data).getByText('Soja')).toBeInTheDocument();
    expect(within(data).getByText('Sacas por hectare')).toBeInTheDocument();
    expect(within(data).getByText('1.446,28 sacas')).toBeInTheDocument();
    expect(within(data).queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it('sem preço: "Preço não informado"', async () => {
    const data = await open(farm());

    expect(within(data).getByText('Preço não informado')).toBeInTheDocument();
  });
});
