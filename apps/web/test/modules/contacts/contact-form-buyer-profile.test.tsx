// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const investor = { id: '0197c000-0000-7000-8000-0000000000c1', name: 'Investidor', active: true };

const contact = (overrides = {}) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Sebastião',
  legalName: null,
  taxId: null,
  phone: null,
  whatsapp: null,
  email: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles: ['owner'],
  buyerProfile: null,
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const profile = (overrides = {}) => ({
  purchaseProfileId: investor.id,
  qualificationLevel: 'hot',
  urgency: 'high',
  avgTicket: '8000000.00',
  maxTicket: '12000000.00',
  minAreaHa: '500.0000',
  maxAreaHa: '1500.0000',
  ...overrides,
});

const open = (record: unknown) => {
  const api = stubFakeApi({
    session: session(),
    permissions: ['contatos.ver', 'contatos.editar'],
    records: {
      '/e/grand-vista/contacts/c1': record,
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
      '/e/grand-vista/settings/vocabularies/purchase-profiles/options': { items: [investor] },
    },
  });
  renderApp('/e/grand-vista/contacts/c1/edit');
  return api;
};

const patchBody = async (api: ReturnType<typeof open>) => {
  await waitFor(() => expect(api.requests.some((request) => request.method === 'PATCH')).toBe(true));
  return JSON.parse(String(api.requests.find((request) => request.method === 'PATCH')?.init?.body)) as Record<string, unknown>;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formulário do contato: perfil de compra', () => {
  it('a seção aparece ao marcar Comprador e some ao desmarcar, sem perguntar quando está vazia', async () => {
    open(contact());
    const user = userEvent.setup();

    await screen.findByRole('checkbox', { name: 'Comprador' });
    expect(screen.queryByRole('region', { name: 'Perfil de compra' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    expect(await screen.findByRole('region', { name: 'Perfil de compra' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Grau de qualificação' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Urgência da compra' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Ticket médio/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Área mínima/ })).toBeInTheDocument();
    // Dados financeiros não têm lugar nesta tela.
    expect(screen.queryByText(/Patrimônio estimado|Capacidade de investimento/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Perfil de compra' })).not.toBeInTheDocument();
  });

  it('preencher e salvar leva buyerProfile com as colunas, sem chaves financeiras', async () => {
    const api = open(contact());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));
    await user.click(await screen.findByRole('combobox', { name: 'Grau de qualificação' }));
    await user.click(await screen.findByRole('option', { name: 'Quente' }));
    await user.click(screen.getByRole('combobox', { name: 'Urgência da compra' }));
    await user.click(await screen.findByRole('option', { name: 'Alta' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const body = await patchBody(api);
    expect(body).toMatchObject({ roles: ['buyer', 'owner'], buyerProfile: { qualificationLevel: 'hot', urgency: 'high' } });
    expect(JSON.stringify(body)).not.toMatch(/estimatedNetWorth|investmentCapacity/);
  });

  it('mostra o perfil gravado no formulário de edição', async () => {
    open(contact({ roles: ['buyer'], buyerProfile: profile() }));

    expect(await screen.findByRole('combobox', { name: 'Grau de qualificação' })).toHaveTextContent('Quente');
    expect(screen.getByRole('combobox', { name: 'Urgência da compra' })).toHaveTextContent('Alta');
    expect(screen.getByRole('textbox', { name: /Ticket máximo/ })).toHaveValue('12.000.000,00');
  });

  it('desmarcar com algo preenchido pede confirmação; cancelar mantém a seção', async () => {
    open(contact({ roles: ['buyer'], buyerProfile: profile() }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));

    const dialog = await screen.findByRole('alertdialog').catch(() => screen.findByRole('dialog'));
    expect(dialog).toHaveTextContent('A classificação e o perfil de compra deste contato serão apagados');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('checkbox', { name: 'Comprador' })).toBeChecked();
    expect(screen.getByRole('region', { name: 'Perfil de compra' })).toBeInTheDocument();
  });

  it('confirmar tira a seção e o save leva buyerProfile nulo', async () => {
    const api = open(contact({ roles: ['buyer', 'owner'], buyerProfile: profile() }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));
    await user.click(await screen.findByRole('button', { name: 'Retirar papel' }));

    expect(screen.queryByRole('region', { name: 'Perfil de compra' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await patchBody(api)).toMatchObject({ roles: ['owner'], buyerProfile: null });
  });

  it('remarcar antes de salvar traz a seção vazia', async () => {
    open(contact({ roles: ['buyer', 'owner'], buyerProfile: profile() }));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Comprador' }));
    await user.click(await screen.findByRole('button', { name: 'Retirar papel' }));
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));

    expect(await screen.findByRole('combobox', { name: 'Grau de qualificação' })).toHaveTextContent('Não informado');
    expect(screen.getByRole('textbox', { name: /Ticket máximo/ })).toHaveValue('');
  });

  it('contato que nunca foi comprador não manda buyerProfile', async () => {
    const api = open(contact());
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Origem do relacionamento/ }), 'Evento');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(Object.keys(await patchBody(api))).not.toContain('buyerProfile');
  });
});
