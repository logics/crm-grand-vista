// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const southPost = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'Praça Sul', active: true };
const northPost = { id: '0197c000-0000-7000-8000-0000000000a2', name: 'Praça Norte', active: true };
const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };
const me = session().user;
const agriculture = { id: '0197c000-0000-7000-8000-0000000000b1', name: 'Agricultura', active: true };
const livestock = { id: '0197c000-0000-7000-8000-0000000000b2', name: 'Pecuária', active: true };

const SUGGESTION = '/e/grand-vista/settings/trading-posts/suggestion';

/** A API falsa de sempre, mais o que o formulário de fazenda consulta ao ser aberto. */
function openForm({ scope }: { scope: 'own' | 'all' }) {
  const api = stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.criar'],
    dataScopes: { fazendas: scope },
    records: {
      '/e/grand-vista/municipalities': { items: [rioVerde] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [southPost, northPost] },
      [SUGGESTION]: { tradingPost: { id: southPost.id, name: southPost.name } },
      '/e/grand-vista/users': { users: [{ ...me, profiles: [] }] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
    },
  });
  renderApp('/e/grand-vista/farms/new');
  return api;
}

const suggestionRequests = (api: ReturnType<typeof openForm>) => api.requests.filter((request) => request.path === SUGGESTION);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formulário de fazenda: praça sugerida pelo município', () => {
  it('escolher o município sugere a praça', async () => {
    openForm({ scope: 'all' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Praça/ })).toHaveTextContent('Praça Sul'));
  });

  it('escolher a praça à mão e depois trocar o município não a sobrescreve', async () => {
    const api = openForm({ scope: 'all' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: /Praça/ }));
    await user.click(await screen.findByRole('option', { name: 'Praça Norte' }));
    await user.click(await screen.findByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Município/ })).toHaveTextContent('Rio Verde'));
    expect(screen.getByRole('combobox', { name: /Praça/ })).toHaveTextContent('Praça Norte');
    expect(suggestionRequests(api)).toHaveLength(0);
  });
});

describe('formulário de fazenda: praça', () => {
  it('o seletor lista as praças cadastradas da empresa', async () => {
    openForm({ scope: 'all' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: /Praça/ }));

    expect(await screen.findByRole('option', { name: 'Praça Sul' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Praça Norte' })).toBeInTheDocument();
  });
});

describe('formulário de fazenda: corretor responsável', () => {
  it('limpar o corretor não trava o seletor: dá para escolher de novo', async () => {
    openForm({ scope: 'all' });
    const user = userEvent.setup();

    const field = await screen.findByRole('combobox', { name: /Corretor responsável/ });
    await waitFor(() => expect(field).toHaveTextContent(me.name));
    // escolher o próprio usuário já marcado o desmarca: o campo fica vazio
    await user.click(field);
    await user.click(await screen.findByRole('option', { name: new RegExp(me.name) }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Corretor responsável/ })).not.toHaveTextContent('Carregando'));
    await user.click(screen.getByRole('combobox', { name: /Corretor responsável/ }));
    await user.click(await screen.findByRole('option', { name: new RegExp(me.name) }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Corretor responsável/ })).toHaveTextContent(me.name));
  });

  it('com escopo own, o campo vem travado no próprio usuário', async () => {
    openForm({ scope: 'own' });

    const field = await screen.findByRole('textbox', { name: /Corretor responsável/ });

    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveValue(me.name);
    expect(screen.queryByRole('combobox', { name: /Corretor responsável/ })).not.toBeInTheDocument();
  });

  it('com escopo all, o campo é um seletor de usuários da empresa', async () => {
    openForm({ scope: 'all' });

    expect(await screen.findByRole('combobox', { name: /Corretor responsável/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Corretor responsável/ })).toHaveTextContent(me.name));
  });
});

const farm = {
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
  aptitudes: [{ id: agriculture.id, name: agriculture.name }],
  crops: [],
  createdAt: '2026-01-02T10:00:00.000Z',
};

/** Escritas de fazenda não são GET: o teste as intercepta e devolve a fazenda salva. */
function openWithWrites(path: string, settings: { areaDisplayUnit: 'hectare' | 'alqueire' }) {
  const writes: { method: string; path: string; body: unknown }[] = [];
  const api = stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': farm,
      '/e/grand-vista/municipalities': { items: [rioVerde] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [southPost] },
      '/e/grand-vista/settings/vocabularies/aptitudes/options': { items: [agriculture, livestock] },
      '/e/grand-vista/settings/vocabularies/crops/options': { items: [] },
      '/e/grand-vista/settings/vocabularies/commercial-statuses/options': { items: [{ ...farm.commercialStatus, active: true }] },
      '/e/grand-vista/users': { users: [{ ...me, profiles: [] }] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', ...settings },
    },
  });
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method !== 'GET') {
        writes.push({ method, path: new URL(input instanceof Request ? input.url : input).pathname, body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify(farm), { status: method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } });
      }
      return fallback(input, init);
    }),
  );
  renderApp(path);
  return { ...api, writes };
}

describe('formulário de fazenda: envio', () => {
  it('cria com o mínimo: nome, município, corretor responsável (o logado) e área total', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Boa Vista');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '1000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toMatchObject({
      method: 'POST',
      path: '/e/grand-vista/farms',
      body: { name: 'Fazenda Boa Vista', municipalityIbgeCode: rioVerde.ibgeCode, totalAreaHa: '1000', responsibleUserId: me.id },
    });
  });

  it('editar sem tocar na área, exibida em alqueire, não envia a área', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'alqueire' });
    const user = userEvent.setup();

    const name = await screen.findByRole('textbox', { name: /Nome/ });
    await user.clear(name);
    await user.type(name, 'Boa Vista II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toMatchObject({ method: 'PATCH', path: '/e/grand-vista/farms/f1', body: { name: 'Boa Vista II' } });
    expect(api.writes[0]!.body).not.toHaveProperty('totalAreaHa');
    expect(api.writes[0]!.body).not.toHaveProperty('usableAreaHa');
  });

  it('digitada em alqueire, a área é enviada em hectares', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'alqueire' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda em Alqueire');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '10');
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    // 10 alqueires goianos = 48,4 hectares
    expect(api.writes[0]!.body).toMatchObject({ totalAreaHa: '48.4' });
  });
});

describe('formulário de fazenda: técnico e comercial', () => {
  it('editar só a aptidão envia só aptitudeIds', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Aptidões' }));
    await user.click(await screen.findByRole('option', { name: /Pecuária/ }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toMatchObject({ method: 'PATCH', body: { aptitudeIds: [agriculture.id, livestock.id] } });
    expect(Object.keys(api.writes[0]!.body as object)).toEqual(['aptitudeIds']);
  });

  it('abrir e salvar sem mexer não envia nada', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await screen.findByRole('combobox', { name: 'Aptidões' });
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument());
    expect(api.writes).toHaveLength(0);
  });

  it('níveis, distância e coordenadas vão ao PATCH; coordenadas sempre em par', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Distância até a rodovia/ }), '12,5');
    await user.type(screen.getByRole('textbox', { name: /Latitude/ }), '-17.79');
    await user.type(screen.getByRole('textbox', { name: /Longitude/ }), '-50.9');
    await user.click(screen.getByRole('combobox', { name: 'Prioridade' }));
    await user.click(await screen.findByRole('option', { name: 'Alta' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toEqual({ distanceToHighwayKm: '12.5', latitude: '-17.79', longitude: '-50.9', priority: 'high' });
  });

  it('latitude sem longitude é recusada no formulário', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Latitude/ }), '-17.79');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Informe a latitude e a longitude juntas.')).toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });
});

describe('formulário de fazenda: validação', () => {
  it('enviar vazio aponta os obrigatórios e não grava', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Cadastrar fazenda' }));

    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument();
    expect(screen.getByText('Informe o município.')).toBeInTheDocument();
    expect(screen.getByText('Informe a área total.')).toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });

  it('corretor responsável limpo é campo obrigatório', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    const field = await screen.findByRole('combobox', { name: /Corretor responsável/ });
    await waitFor(() => expect(field).toHaveTextContent(me.name));
    await user.click(field);
    await user.click(await screen.findByRole('option', { name: new RegExp(me.name) }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    expect(await screen.findByText('Informe o corretor responsável.')).toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });

  it('área útil maior que a total é recusada', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Boa Vista');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '100');
    await user.type(screen.getByRole('textbox', { name: /Área útil/ }), '200');
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    expect(await screen.findByText('A área útil não pode ser maior que a área total.')).toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });
});
