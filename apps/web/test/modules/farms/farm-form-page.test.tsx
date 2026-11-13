// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const southPost = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'Praça Sul', active: true };
const northPost = { id: '0197c000-0000-7000-8000-0000000000a2', name: 'Praça Norte', active: true };
const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };
const me = session().user;

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
  pricingMode: null,
  askingPrice: null,
  valuationBags: null,
  valuationBagsUnit: null,
  valuationBagsAlqueireType: null,
  valuationCrop: null,
  priceDerivatives: { pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: null },
  createdAt: '2026-01-02T10:00:00.000Z',
};

const soy = { id: '0197c000-0000-7000-8000-0000000000d1', name: 'Soja', active: true };
const inReais = { ...farm, pricingMode: 'brl', askingPrice: '80000000.00' };
const inBags = {
  ...farm,
  pricingMode: 'bags',
  valuationBags: '7000.0000',
  valuationBagsUnit: 'per_alqueire',
  valuationBagsAlqueireType: 'paulista',
  valuationCrop: { id: soy.id, name: soy.name },
};

/** Escritas de fazenda não são GET: o teste as intercepta e devolve a fazenda salva. */
function openWithWrites(path: string, settings: { areaDisplayUnit: 'hectare' | 'alqueire' }, saved: object = farm) {
  const writes: { method: string; path: string; body: unknown }[] = [];
  const api = stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
    dataScopes: { fazendas: 'all' },
    records: {
      '/e/grand-vista/farms/f1': saved,
      '/e/grand-vista/settings/vocabularies/crops/options': { items: [soy] },
      '/e/grand-vista/municipalities': { items: [rioVerde] },
      '/e/grand-vista/settings/vocabularies/trading-posts/options': { items: [southPost] },
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

describe('formulário de fazenda: precificação', () => {
  const pickMode = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(await screen.findByRole('combobox', { name: 'Modo de precificação' }));
    await user.click(await screen.findByRole('option', { name }));
  };

  it('editar fazenda avaliada em sacas por alqueire sem tocar em área nem preço, exibida em alqueire, só envia o nome', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'alqueire' }, inBags);
    const user = userEvent.setup();

    const name = await screen.findByRole('textbox', { name: /Nome/ });
    await user.clear(name);
    await user.type(name, 'Boa Vista II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toEqual({ name: 'Boa Vista II' });
  });

  it('sem preço, o formulário não mostra campo de preço', async () => {
    openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' });

    expect(await screen.findByRole('combobox', { name: 'Modo de precificação' })).toHaveTextContent('Sem preço');
    expect(screen.queryByRole('textbox', { name: /Preço pedido/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Avaliação em sacas/ })).not.toBeInTheDocument();
  });

  it('trocar de modo sem valor preenchido não pede confirmação', async () => {
    openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await pickMode(user, 'Em reais');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: /Preço pedido/ })).toBeInTheDocument();
  });

  it('trocar de modo com valor preenchido pede confirmação; cancelar mantém o modo e o valor', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' }, inReais);
    const user = userEvent.setup();

    await screen.findByDisplayValue('80.000.000,00');
    await pickMode(user, 'Em sacas');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Trocar o modo de precificação?');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('combobox', { name: 'Modo de precificação' })).toHaveTextContent('Em reais');
    expect(screen.getByDisplayValue('80.000.000,00')).toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });

  it('confirmar a troca de reais para sacas limpa o preço pedido e envia o bloco novo inteiro', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' }, inReais);
    const user = userEvent.setup();

    await screen.findByDisplayValue('80.000.000,00');
    await pickMode(user, 'Em sacas');
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Trocar modo' }));

    await user.type(await screen.findByRole('textbox', { name: /Avaliação em sacas/ }), '7000');
    await user.click(screen.getByRole('combobox', { name: 'Unidade da avaliação' }));
    await user.click(await screen.findByRole('option', { name: 'Por alqueire' }));
    await user.click(screen.getByRole('combobox', { name: /Cultura de referência/ }));
    await user.click(await screen.findByRole('option', { name: 'Soja' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toEqual({
      pricingMode: 'bags',
      askingPrice: null,
      valuationBags: '7000',
      valuationBagsUnit: 'per_alqueire',
      valuationBagsAlqueireType: 'goiano',
      valuationCropId: soy.id,
    });
  });

  it('por alqueire pede o tipo, pré-preenchido com o padrão da empresa e editável', async () => {
    openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await pickMode(user, 'Em sacas');
    expect(screen.queryByRole('combobox', { name: 'Tipo de alqueire da avaliação' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Unidade da avaliação' }));
    await user.click(await screen.findByRole('option', { name: 'Por alqueire' }));

    const type = await screen.findByRole('combobox', { name: 'Tipo de alqueire da avaliação' });
    await waitFor(() => expect(type).toHaveTextContent('Goiano'));
    await user.click(type);
    await user.click(await screen.findByRole('option', { name: 'Paulista' }));
    expect(screen.getByRole('combobox', { name: 'Tipo de alqueire da avaliação' })).toHaveTextContent('Paulista');
  });

  it('voltar a "Sem preço" com valor confirma e envia só o modo nulo', async () => {
    const api = openWithWrites('/e/grand-vista/farms/f1/edit', { areaDisplayUnit: 'hectare' }, inReais);
    const user = userEvent.setup();

    await screen.findByDisplayValue('80.000.000,00');
    await pickMode(user, 'Sem preço');
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Trocar modo' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toEqual({
      pricingMode: null,
      askingPrice: null,
      valuationBags: null,
      valuationBagsUnit: null,
      valuationBagsAlqueireType: null,
      valuationCropId: null,
    });
  });

  it('cria em reais enviando o preço pedido e mais nada de preço', async () => {
    const api = openWithWrites('/e/grand-vista/farms/new', { areaDisplayUnit: 'hectare' });
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Boa Vista');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '1000');
    await pickMode(user, 'Em reais');
    await user.type(await screen.findByRole('textbox', { name: /Preço pedido/ }), '8000000000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toMatchObject({ pricingMode: 'brl', askingPrice: '80000000' });
    expect(api.writes[0]!.body).not.toHaveProperty('valuationBags');
  });
});
