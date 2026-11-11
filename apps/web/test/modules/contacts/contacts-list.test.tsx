// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { belowQuery } from '@crm/ui';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const classA = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'A', active: true };
const classB = { id: '0197c000-0000-7000-8000-0000000000a2', name: 'B', active: true };
const referral = { id: '0197c000-0000-7000-8000-0000000000b1', name: 'Indicação', active: true };

const contact = (overrides = {}) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Sebastião Prado',
  legalName: null,
  taxId: '52998224725',
  phone: '+5564999991234',
  whatsapp: '+5564999991234',
  email: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: classA.id,
  leadSourceId: referral.id,
  roles: ['buyer'],
  createdAt: '2026-01-02T15:00:00.000Z',
  ...overrides,
});

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

const open = (search = '', { items = [contact()], permissions = ['contatos.ver', 'contatos.criar'] as PermissionCode[] } = {}) => {
  const api = stubFakeApi({
    session: session(),
    permissions,
    records: {
      '/e/grand-vista/contacts': page(items),
      '/e/grand-vista/settings/vocabularies/contact-classifications/options': { items: [classA, classB] },
      '/e/grand-vista/settings/vocabularies/lead-sources/options': { items: [referral] },
    },
  });
  const app = renderApp(`/e/grand-vista/contacts${search}`);
  return { api, ...app };
};

/** Parâmetros do último pedido de página à API de contatos. */
const lastListParams = (api: ReturnType<typeof stubFakeApi>) => {
  const request = api.requests.filter((r) => r.path === '/e/grand-vista/contacts').at(-1);
  return request ? new URLSearchParams(request.search ?? '') : undefined;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lista de contatos: filtros pela URL', () => {
  it('o link com os filtros reabre a mesma lista: a API recebe tudo e os controles mostram', async () => {
    const { api } = open(
      `?q=rio%20verde&role=buyer,owner&personType=pf&classificationId=${classA.id}&leadSourceId=${referral.id}&createdFrom=2026-01-01&createdTo=2026-01-31&sort=-createdAt`,
    );

    await screen.findByRole('table');
    expect(Object.fromEntries(lastListParams(api)!)).toMatchObject({
      q: 'rio verde',
      role: 'buyer,owner',
      personType: 'pf',
      classificationId: classA.id,
      leadSourceId: referral.id,
      createdFrom: '2026-01-01',
      createdTo: '2026-01-31',
      sort: '-createdAt',
    });
    expect(screen.getByRole('searchbox')).toHaveValue('rio verde');
    expect(await screen.findByRole('combobox', { name: 'Papéis' })).toHaveTextContent(/Comprador.*Proprietário/s);
    expect(screen.getByRole('combobox', { name: 'Tipo de pessoa' })).toHaveTextContent('PF');
    expect(await screen.findByRole('combobox', { name: /Classificação/ })).toHaveTextContent('A');
    expect(await screen.findByRole('combobox', { name: /Origem do lead/ })).toHaveTextContent('Indicação');
    expect(screen.getByLabelText('Data inicial')).toHaveValue('01/01/2026');
    expect(screen.getByLabelText('Data final')).toHaveValue('31/01/2026');
  });

  it('escolher a classificação escreve na URL, pede a página à API e volta à primeira', async () => {
    const { api, router } = open('?page=1&role=buyer');
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(await screen.findByRole('combobox', { name: /Classificação/ }));
    await user.click(await screen.findByRole('option', { name: 'B' }));

    await waitFor(() => expect(router.state.location.search).toContain(`classificationId=${classB.id}`));
    expect(new URLSearchParams(router.state.location.search).get('role')).toBe('buyer');
    await waitFor(() => expect(lastListParams(api)?.get('classificationId')).toBe(classB.id));
  });

  it('escolher o papel de compradores filtra por role=buyer', async () => {
    const { api, router } = open();
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('combobox', { name: 'Papéis' }));
    await user.click(await screen.findByRole('option', { name: 'Comprador' }));

    await waitFor(() => expect(router.state.location.search).toBe('?role=buyer'));
    await waitFor(() => expect(lastListParams(api)?.get('role')).toBe('buyer'));
  });

  it('parâmetro inválido na URL é ignorado; os válidos continuam', async () => {
    const { api } = open('?role=comprador&personType=pj&createdFrom=ontem');

    await screen.findByRole('table');
    const params = lastListParams(api)!;
    expect(params.get('personType')).toBe('pj');
    expect(params.has('role')).toBe(false);
    expect(params.has('createdFrom')).toBe(false);
  });

  it('sem resultado com filtro, oferece limpar busca e filtros', async () => {
    const { router } = open('?personType=pj', { items: [] });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Limpar busca e filtros' }));

    await waitFor(() => expect(router.state.location.search).toBe(''));
  });
});

describe('lista de contatos: colunas', () => {
  it('mostra nome, papéis, documento abreviado, telefone, classificação, cadastro e WhatsApp', async () => {
    open();

    const row = within(await screen.findByRole('row', { name: /Sebastião Prado/ }));
    expect(row.getByText('Comprador')).toBeInTheDocument();
    expect(row.getByText('***.982.247-**')).toBeInTheDocument();
    expect(row.getByText(/99999-1234/)).toBeInTheDocument();
    expect(await row.findByText('A')).toBeInTheDocument();
    expect(row.getByText('02/01/2026')).toBeInTheDocument();
    expect(row.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me/5564999991234'));
    expect(row.queryByRole('link', { name: /Ligar|e-mail/i })).not.toBeInTheDocument();
  });

  it('pessoa jurídica mostra a razão social abaixo do nome', async () => {
    open('', { items: [contact({ id: 'c2', personType: 'pj', name: 'Fazenda Boa Vista', legalName: 'Boa Vista Agropecuária Ltda', taxId: '34028316000103' })] });

    const row = within(await screen.findByRole('row', { name: /Fazenda Boa Vista/ }));
    expect(row.getByText('Boa Vista Agropecuária Ltda')).toBeInTheDocument();
    expect(row.getByText('34.028.316/0001-03')).toBeInTheDocument();
  });

  it('a data de cadastro é o dia de Brasília, o mesmo do filtro', async () => {
    // 01:00 UTC do dia 2 ainda é noite do dia 1 em Brasília
    open('', { items: [contact({ createdAt: '2026-01-02T01:00:00.000Z' })] });

    expect(within(await screen.findByRole('row', { name: /Sebastião Prado/ })).getByText('01/01/2026')).toBeInTheDocument();
  });

  it('ordena por nome e por data de cadastro ao clicar no cabeçalho', async () => {
    const { router } = open();
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /Cadastrado em/ }));

    await waitFor(() => expect(router.state.location.search).toContain('sort=createdAt'));
  });

  it('"Novo contato" só com contatos.criar', async () => {
    open('', { permissions: ['contatos.ver'] });
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Novo contato' })).not.toBeInTheDocument();
  });

  it('com contatos.criar, o botão leva ao cadastro', async () => {
    const { router } = open();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Novo contato' }));

    expect(router.state.location.pathname).toBe('/e/grand-vista/contacts/new');
  });
});

describe('lista de contatos no mobile', () => {
  it('o cartão traz nome, papéis, telefone e o atalho de WhatsApp', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === belowQuery('mobile') || query === belowQuery('rail'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    open();

    const card = within(await screen.findByRole('list', { name: 'Resultados' }));
    expect(card.getByText('Sebastião Prado')).toBeInTheDocument();
    expect(card.getByText('Comprador')).toBeInTheDocument();
    expect(card.getByText(/99999-1234/)).toBeInTheDocument();
    expect(card.getByRole('link', { name: /WhatsApp/ })).toBeInTheDocument();
  });
});
