// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };
const me = session().user;

const saved = {
  id: 'f1',
  name: 'Fazenda Boa Vista',
  municipality: { ibgeCode: rioVerde.ibgeCode, name: rioVerde.name, uf: rioVerde.uf },
  responsible: { id: me.id, name: me.name },
  tradingPost: null,
  commercialStatus: { id: '0197c000-0000-7000-8000-0000000000c1', name: 'Disponível' },
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
  owners: [],
  createdAt: '2026-01-02T10:00:00.000Z',
};

const existing = {
  id: 'f9',
  name: 'Fazenda Boa Vista',
  municipality: saved.municipality,
  reasons: ['name_municipality'],
};

/** API falsa com a consulta de duplicatas e a escrita de fazendas: guarda o que o formulário envia. */
function stubDuplicates(duplicates: () => Response) {
  const api = stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': saved,
      '/e/grand-vista/municipalities': { items: [rioVerde] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [] },
      '/e/grand-vista/users': { users: [{ ...me, profiles: [] }] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
    },
  });
  const fallback = globalThis.fetch;
  const calls = { duplicates: [] as URL[], writes: [] as { method: string; body: Record<string, unknown> }[] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/farms/duplicates')) {
        calls.duplicates.push(url);
        return duplicates();
      }
      if (method === 'POST' || method === 'PATCH') {
        calls.writes.push({ method, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return json(saved, method === 'POST' ? 201 : 200);
      }
      return fallback(input, init);
    }),
  );
  return { ...api, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillNewFarm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Boa Vista');
  await user.click(screen.getByRole('combobox', { name: /Município/ }));
  await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
  await user.type(screen.getByRole('textbox', { name: /Área total/ }), '1000');
  await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));
}

describe('aviso de duplicata no formulário de fazenda', () => {
  it('mostra o aviso do Design System com o motivo e o link, não salva, e "Salvar mesmo assim" salva sem perder o digitado', async () => {
    const { calls } = stubDuplicates(() => json({ items: [existing] }));
    renderApp('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await fillNewFarm(user);

    const alert = await screen.findByRole('alert', { name: 'Possível fazenda duplicada' });
    expect(alert).toHaveAttribute('data-slot', 'duplicate-warning');
    const link = within(alert).getByRole('link', { name: 'Fazenda Boa Vista' });
    expect(link).toHaveAttribute('href', '/e/grand-vista/farms/f9');
    expect(within(alert).getByText('mesmo nome no mesmo município')).toBeInTheDocument();
    expect(calls.writes).toEqual([]);
    expect(calls.duplicates[0]!.searchParams.get('name')).toBe('Fazenda Boa Vista');
    expect(calls.duplicates[0]!.searchParams.get('municipalityIbgeCode')).toBe(rioVerde.ibgeCode);
    expect(calls.duplicates[0]!.searchParams.has('excludeId')).toBe(false);
    expect(screen.getByRole('textbox', { name: /Nome/ })).toHaveValue('Fazenda Boa Vista');

    await user.click(screen.getByRole('button', { name: 'Salvar mesmo assim' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(calls.writes[0]).toMatchObject({ method: 'POST', body: { name: 'Fazenda Boa Vista', municipalityIbgeCode: rioVerde.ibgeCode } });
    expect(calls.duplicates).toHaveLength(1);
  });

  it('sem coincidência, salva direto', async () => {
    const { calls } = stubDuplicates(() => json({ items: [] }));
    renderApp('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await fillNewFarm(user);

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Salvar mesmo assim' })).not.toBeInTheDocument();
  });

  it('na edição, a própria fazenda fica fora da consulta', async () => {
    const { calls } = stubDuplicates(() => json({ items: [] }));
    renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();

    const name = await screen.findByRole('textbox', { name: /Nome/ });
    await user.clear(name);
    await user.type(name, 'Boa Vista II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
    expect(calls.duplicates[0]!.searchParams.get('excludeId')).toBe('f1');
  });

  it('se a consulta falha, o cadastro segue', async () => {
    const { calls } = stubDuplicates(() => json({}, 500));
    renderApp('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await fillNewFarm(user);

    await vi.waitFor(() => expect(calls.writes).toHaveLength(1));
  });
});
