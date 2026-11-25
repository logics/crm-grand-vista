// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

// Dados financeiros do comprador (`contatos.ver_dados_financeiros`): com a
// permissão aparecem na ficha e no formulário e vão no payload; sem ela não
// existe rótulo, campo nem aviso, e o payload do save não leva as duas chaves.

const FINANCIAL_LABELS = /Patrimônio estimado|Capacidade de investimento/;

const contact = (buyerProfile: Record<string, unknown>) => ({
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
  buyerProfile,
  referralChain: [],
  createdAt: '2026-01-02T10:00:00.000Z',
});

// O que o servidor devolve a quem tem a permissão e a quem não tem.
const base = {
  purchaseProfileId: null,
  qualificationLevel: 'hot',
  urgency: 'high',
  avgTicket: '8000000.00',
  maxTicket: null,
  minAreaHa: null,
  maxAreaHa: null,
};
const withFinancial = { ...base, estimatedNetWorth: '50000000.00', investmentCapacity: '9000000.00' };

const history = {
  entries: [
    {
      changeId: 'h1',
      at: '2026-07-24T17:30:00.000Z',
      author: 'Ana Gestora',
      kind: 'updated',
      title: 'Perfil de compra alterado',
      changes: [],
      children: [
        {
          title: 'Perfil de compra alterado',
          changes: [
            { field: 'Patrimônio estimado', from: null, to: null, restricted: 'Requer permissão para ver esta alteração' },
          ],
        },
      ],
    },
  ],
};

const stub = (record: unknown, permissions: string[]) =>
  stubFakeApi({
    session: session(),
    permissions: permissions as never,
    records: {
      '/e/grand-vista/contacts/c1': record,
      '/e/grand-vista/contacts/c1/history': history,
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
      '/e/grand-vista/settings/vocabularies/purchase-profiles/options': { items: [] },
    },
  });

const patchBody = async (api: ReturnType<typeof stub>) => {
  await waitFor(() => expect(api.requests.some((request) => request.method === 'PATCH')).toBe(true));
  return JSON.parse(String(api.requests.find((request) => request.method === 'PATCH')?.init?.body)) as {
    buyerProfile: Record<string, unknown>;
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dados financeiros do comprador na ficha', () => {
  it('com a permissão: as duas linhas aparecem com os valores', async () => {
    stub(contact(withFinancial), ['contatos.ver', 'contatos.ver_dados_financeiros']);
    renderApp('/e/grand-vista/contacts/c1');

    expect(await screen.findByText('Patrimônio estimado')).toBeInTheDocument();
    expect(screen.getByText('R$ 50.000.000,00')).toBeInTheDocument();
    expect(screen.getByText('Capacidade de investimento')).toBeInTheDocument();
    expect(screen.getByText('R$ 9.000.000,00')).toBeInTheDocument();
  });

  it('sem a permissão: nem rótulo nem aviso', async () => {
    stub(contact(base), ['contatos.ver']);
    renderApp('/e/grand-vista/contacts/c1');

    expect(await screen.findByText('Ticket médio')).toBeInTheDocument();
    expect(screen.queryByText(FINANCIAL_LABELS)).not.toBeInTheDocument();
    expect(screen.queryByText(/permissão/i)).not.toBeInTheDocument();
  });

  it('o histórico de quem não tem a permissão mostra a alteração mascarada, sem valores', async () => {
    stub(contact(base), ['contatos.ver']);
    renderApp('/e/grand-vista/contacts/c1');

    await userEvent.click(await screen.findByRole('button', { name: 'Histórico' }));
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de alterações' });
    expect(await within(dialog).findByText('Patrimônio estimado')).toBeInTheDocument();
    expect(within(dialog).getByText('Requer permissão para ver esta alteração')).toBeInTheDocument();
  });
});

describe('dados financeiros do comprador no formulário', () => {
  it('com a permissão: os dois campos aparecem preenchidos e o payload os leva', async () => {
    const api = stub(contact(withFinancial), ['contatos.ver', 'contatos.editar', 'contatos.ver_dados_financeiros']);
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    expect(await screen.findByRole('textbox', { name: /Patrimônio estimado/ })).toHaveValue('50.000.000,00');
    expect(screen.getByRole('textbox', { name: /Capacidade de investimento/ })).toHaveValue('9.000.000,00');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect((await patchBody(api)).buyerProfile).toMatchObject({
      estimatedNetWorth: '50000000.00',
      investmentCapacity: '9000000.00',
    });
  });

  it('sem a permissão: nenhum campo financeiro e o payload não leva as duas chaves', async () => {
    const api = stub(contact(base), ['contatos.ver', 'contatos.editar']);
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    expect(await screen.findByRole('combobox', { name: 'Grau de qualificação' })).toBeInTheDocument();
    expect(screen.queryByText(FINANCIAL_LABELS)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: FINANCIAL_LABELS })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const body = await patchBody(api);
    expect(body.buyerProfile).toMatchObject({ qualificationLevel: 'hot', urgency: 'high' });
    expect(JSON.stringify(body)).not.toMatch(/estimatedNetWorth|investmentCapacity/);
  });
});
