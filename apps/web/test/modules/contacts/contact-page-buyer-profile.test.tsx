// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, within } from '@testing-library/react';
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
  roles: ['buyer'],
  buyerProfile: null,
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const profile = {
  purchaseProfileId: investor.id,
  qualificationLevel: 'hot',
  urgency: 'high',
  avgTicket: '8000000.00',
  maxTicket: '12000000.00',
  minAreaHa: '500.0000',
  maxAreaHa: '1500.0000',
};

const view = (record: unknown, permissions: string[] = ['contatos.ver'], areaDisplayUnit = 'hectare') => {
  stubFakeApi({
    session: session(),
    permissions: permissions as never,
    records: {
      '/e/grand-vista/contacts/c1': record,
      '/e/grand-vista/contacts/c1/history': { entries: [] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit },
      '/e/grand-vista/settings/vocabularies/purchase-profiles/options': { items: [investor] },
    },
  });
  renderApp('/e/grand-vista/contacts/c1');
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ficha do contato: perfil de compra', () => {
  it('mostra o perfil do comprador, com as áreas na unidade de exibição', async () => {
    view(contact({ buyerProfile: profile }));

    const section = (
      await screen.findByText('Perfil de compra', { selector: 'h2, h3, [data-slot="card-title"], span, div' })
    ).closest('[data-section]') as HTMLElement;
    expect(section).not.toBeNull();
    expect(await within(section).findByText('Investidor')).toBeInTheDocument();
    expect(within(section).getByText('Quente')).toBeInTheDocument();
    expect(within(section).getByText('Alta')).toBeInTheDocument();
    expect(within(section).getByText('R$ 8.000.000,00')).toBeInTheDocument();
    expect(within(section).getByText('R$ 12.000.000,00')).toBeInTheDocument();
    expect(within(section).getByText('500 ha')).toBeInTheDocument();
    expect(within(section).getByText('1.500 ha')).toBeInTheDocument();
    expect(within(section).queryByText(/Patrimônio|Capacidade/)).not.toBeInTheDocument();
  });

  it('mostra as áreas em alqueires quando a empresa usa alqueire', async () => {
    view(contact({ buyerProfile: profile }), ['contatos.ver'], 'alqueire');

    const section = (await screen.findAllByText('Perfil de compra'))[0]!.closest('[data-section]') as HTMLElement;
    expect(await within(section).findAllByText(/alq/)).toHaveLength(2);
    expect(within(section).queryByText('500 ha')).not.toBeInTheDocument();
  });

  it('não existe para quem não é comprador', async () => {
    view(contact({ roles: ['owner'] }));

    expect(await screen.findByText('Dados')).toBeInTheDocument();
    expect(screen.queryByText('Perfil de compra')).not.toBeInTheDocument();
  });

  it('sem perfil, o estado vazio leva ao formulário (com contatos.editar)', async () => {
    view(contact(), ['contatos.ver', 'contatos.editar']);
    const user = userEvent.setup();

    expect(await screen.findByText('Sem perfil de compra')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preencher perfil de compra' }));

    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  it('sem contatos.editar o estado vazio não oferece o atalho', async () => {
    view(contact());

    expect(await screen.findByText('Sem perfil de compra')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preencher perfil de compra' })).not.toBeInTheDocument();
  });
});
