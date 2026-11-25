// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { belowQuery } from '@crm/ui';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
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

const open = (
  search = '',
  { items = [contact()], permissions = ['contatos.ver', 'contatos.criar'] as PermissionCode[] } = {},
) => {
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
    open('', {
      items: [
        contact({
          id: 'c2',
          personType: 'pj',
          name: 'Fazenda Boa Vista',
          legalName: 'Boa Vista Agropecuária Ltda',
          taxId: '34028316000103',
        }),
      ],
    });

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

describe('lista de contatos: filtros do perfil de compra', () => {
  const investor = { id: '0197c000-0000-7000-8000-0000000000d1', name: 'Investidor', active: true };
  const soy = { id: '0197c000-0000-7000-8000-0000000000e1', name: 'Soja', active: true };
  const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };

  const openWithProfile = (search = '') => {
    const api = stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: {
        '/e/grand-vista/contacts': page([contact()]),
        '/e/grand-vista/settings/vocabularies/contact-classifications/options': { items: [classA] },
        '/e/grand-vista/settings/vocabularies/lead-sources/options': { items: [referral] },
        '/e/grand-vista/settings/vocabularies/purchase-profiles/options': { items: [investor] },
        '/e/grand-vista/settings/vocabularies/crops/options': { items: [soy] },
        '/e/grand-vista/municipalities': { items: [rioVerde, { uf: 'GO' }] },
      },
    });
    return { api, ...renderApp(`/e/grand-vista/contacts${search}`) };
  };

  it('o link reabre os filtros: a API recebe tudo e os controles mostram', async () => {
    const { api } = openWithProfile(
      `?purchaseProfileId=${investor.id}&qualificationLevel=hot,qualified&urgency=high&cropId=${soy.id}&region=5218805,GO`,
    );

    await screen.findByRole('table');
    await waitFor(() => expect(lastListParams(api)?.get('region')).toBe('5218805,GO'));
    expect(Object.fromEntries(lastListParams(api)!)).toMatchObject({
      purchaseProfileId: investor.id,
      qualificationLevel: 'hot,qualified',
      urgency: 'high',
      cropId: soy.id,
      region: '5218805,GO',
    });
    expect(await screen.findByRole('combobox', { name: 'Grau de qualificação' })).toHaveTextContent(/Quente.*Qualificado/s);
    expect(screen.getByRole('combobox', { name: 'Urgência da compra' })).toHaveTextContent('Alta');
    expect(await screen.findByRole('combobox', { name: 'Perfil de compra' })).toHaveTextContent('Investidor');
    expect(await screen.findByRole('combobox', { name: 'Cultura de interesse' })).toHaveTextContent('Soja');
    expect(await screen.findByRole('combobox', { name: 'Região de interesse' })).toHaveTextContent(/Rio Verde — GO.*Goiás/s);
  });

  it('escolher grau e região escreve na URL e envia à API', async () => {
    const { api, router } = openWithProfile('?role=buyer');
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('combobox', { name: 'Grau de qualificação' }));
    await user.click(await screen.findByRole('option', { name: 'Quente' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('qualificationLevel')).toBe('hot'));
    expect(new URLSearchParams(router.state.location.search).get('role')).toBe('buyer');
    await waitFor(() => expect(lastListParams(api)?.get('qualificationLevel')).toBe('hot'));
  });

  it('Rio Verde e a UF Goiás viram region=5218805,GO na URL e no pedido', async () => {
    const { api, router } = openWithProfile();
    const user = userEvent.setup();
    await screen.findByRole('table');

    const picker = screen.getByRole('combobox', { name: 'Região de interesse' });
    await user.click(picker);
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.click(await screen.findByRole('option', { name: /Goiás/ }));

    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('region')).toBe('5218805,GO'));
    await waitFor(() => expect(lastListParams(api)?.get('region')).toBe('5218805,GO'));
  });
});

describe('lista de contatos: grupos, contagem e limpar', () => {
  const stubMobile = () =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === belowQuery('mobile') || query === belowQuery('rail'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it('os filtros ficam em dois grupos rotulados, com o perfil de compra no segundo', async () => {
    open();
    await screen.findByRole('table');

    const contactGroup = within(screen.getByRole('group', { name: 'Filtros do contato' }));
    for (const name of ['Papéis', 'Tipo de pessoa', 'Classificação', 'Origem do lead']) {
      expect(contactGroup.getByRole('combobox', { name })).toBeInTheDocument();
    }
    expect(contactGroup.getByRole('group', { name: 'Cadastrado em' })).toBeInTheDocument();
    const profileGroup = within(screen.getByRole('group', { name: 'Perfil de compra' }));
    for (const name of [
      'Perfil de compra',
      'Grau de qualificação',
      'Urgência da compra',
      'Cultura de interesse',
      'Região de interesse',
    ]) {
      expect(profileGroup.getByRole('combobox', { name })).toBeInTheDocument();
    }
  });

  it('com filtros, "Limpar busca e filtros" mostra a contagem e limpa a URL e o pedido', async () => {
    const { api, router } = open('?role=buyer&region=GO&createdFrom=2026-01-01&createdTo=2026-01-31&sort=-createdAt');
    const user = userEvent.setup();
    await screen.findByRole('table');

    const clear = screen.getByRole('button', { name: /Limpar busca e filtros/ });
    expect(clear).toHaveTextContent('3');
    await user.click(clear);

    await waitFor(() => expect(router.state.location.search).toBe('?sort=-createdAt'));
    await waitFor(() => expect(lastListParams(api)?.has('role')).toBe(false));
    expect(lastListParams(api)?.has('region')).toBe(false);
    expect(lastListParams(api)?.has('createdFrom')).toBe(false);
    expect(lastListParams(api)?.has('createdTo')).toBe(false);
    expect(screen.queryByRole('button', { name: /Limpar busca e filtros/ })).toBeNull();
    // o foco não se perde com o botão: vai ao campo de busca
    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
  });

  it('"Limpar" não envia a busca: é botão, não submit', async () => {
    const { api } = open('?q=rio');
    const user = userEvent.setup();
    await screen.findByRole('table');
    const clear = screen.getByRole('button', { name: /Limpar busca e filtros/ });
    expect(clear).toHaveAttribute('type', 'button');
    const before = api.requests.filter((r) => r.path === '/e/grand-vista/contacts').length;
    await user.click(clear);
    await waitFor(() => expect(lastListParams(api)?.has('q')).toBe(false));
    const after = api.requests.filter((r) => r.path === '/e/grand-vista/contacts');
    // um único pedido novo, já sem a busca (um submit enviaria também o termo antigo)
    expect(after.length).toBe(before + 1);
  });

  it('sem filtro não há botão de limpar; só com busca, ele aparece sem contagem', async () => {
    open();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Limpar busca e filtros/ })).toBeNull();
    cleanup();

    open('?q=rio');
    await screen.findByRole('table');
    const clear = screen.getByRole('button', { name: /Limpar busca e filtros/ });
    expect(clear).toHaveTextContent(/^Limpar busca e filtros$/);
  });

  // jsdom não mede layout: a regressão (grupo de 456px num formulário de 366px, campos cortados à direita) é
  // guardada pelas classes que a evitam. Sem `min-w-0` o grupo e os campos não encolhem abaixo do conteúdo
  // do seletor de período e a área principal passa a rolar na horizontal.
  it('no mobile, o grupo e os campos podem encolher abaixo do conteúdo e ocupam a largura toda', async () => {
    stubMobile();
    open();
    await screen.findByRole('list', { name: 'Resultados' });

    const group = screen.getByRole('group', { name: 'Filtros do contato' });
    expect(group).toHaveClass('min-w-0', 'basis-full');
    for (const field of group.querySelectorAll('[data-slot="field"]')) {
      expect(field).toHaveClass('max-mobile:w-full', 'max-mobile:min-w-0');
    }
    expect(group.querySelectorAll('[data-slot="field"]')).toHaveLength(7);
  });

  it('no mobile, o grupo do perfil começa fechado e abre pelo botão', async () => {
    stubMobile();
    open();
    await screen.findByRole('list', { name: 'Resultados' });

    const toggle = screen.getByRole('button', { name: 'Perfil de compra' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox', { name: 'Região de interesse' })).toBeNull();

    await userEvent.setup().click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: 'Região de interesse' })).toBeInTheDocument();
  });

  it('no mobile, a URL com filtro do perfil abre o grupo e a contagem aparece no botão', async () => {
    stubMobile();
    open('?region=GO&cropId=0197c000-0000-7000-8000-0000000000e1');
    await screen.findByRole('list', { name: 'Resultados' });

    const toggle = screen.getByRole('button', { name: /Perfil de compra/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('2');
    expect(screen.getByRole('combobox', { name: 'Região de interesse' })).toBeInTheDocument();
  });

  it('no mobile, a URL que passa a trazer filtro do perfil abre o grupo, e sem filtro ele não fecha sozinho', async () => {
    stubMobile();
    const { router } = open();
    await screen.findByRole('list', { name: 'Resultados' });
    const toggle = screen.getByRole('button', { name: /Perfil de compra/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await act(() => router.navigate('/e/grand-vista/contacts?region=GO'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Perfil de compra/ })).toHaveAttribute('aria-expanded', 'true'),
    );

    await act(() => router.navigate('/e/grand-vista/contacts'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Limpar busca e filtros/ })).toBeNull());
    expect(screen.getByRole('button', { name: /Perfil de compra/ })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('lista de contatos: filtro "Indicado por" (critério 20)', () => {
  const antonio = {
    id: '0197c000-0000-7000-8000-0000000000f1',
    name: 'Antônio Lima',
    personType: 'pf',
    taxId: null,
    roles: ['external_broker'],
  };
  const joao = {
    id: '0197c000-0000-7000-8000-0000000000f2',
    name: 'João Reis',
    personType: 'pf',
    taxId: null,
    roles: ['external_broker'],
  };
  const carlos = {
    id: '0197c000-0000-7000-8000-0000000000f3',
    name: 'Carlos Menezes',
    email: 'carlos@example.com',
    profiles: [],
  };

  const openWithReferrers = (search = '') => {
    const api = stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: {
        '/e/grand-vista/contacts': page([contact()]),
        '/e/grand-vista/contacts/options': { items: [antonio, joao] },
        '/e/grand-vista/users': { users: [carlos] },
        '/e/grand-vista/settings/vocabularies/contact-classifications/options': { items: [classA] },
        '/e/grand-vista/settings/vocabularies/lead-sources/options': { items: [referral] },
      },
    });
    return { api, ...renderApp(`/e/grand-vista/contacts${search}`) };
  };

  it('o link reabre a lista: a API recebe os dois parâmetros e os controles mostram os nomes', async () => {
    const { api } = openWithReferrers(`?referrerContactId=${antonio.id},${joao.id}&referrerUserId=${carlos.id}`);

    await screen.findByRole('table');
    await waitFor(() => expect(lastListParams(api)?.get('referrerContactId')).toBe(`${antonio.id},${joao.id}`));
    expect(lastListParams(api)?.get('referrerUserId')).toBe(carlos.id);
    expect(await screen.findByRole('combobox', { name: 'Indicado por (contato)' })).toHaveTextContent(/Antônio Lima.*João Reis/s);
    expect(await screen.findByRole('combobox', { name: 'Indicado por (interno)' })).toHaveTextContent('Carlos Menezes');
  });

  it('escolher um contato e um usuário escreve na URL, envia à API e volta à primeira página', async () => {
    const { api, router } = openWithReferrers('?page=2');
    const user = userEvent.setup();
    await screen.findByRole('table');

    await user.click(screen.getByRole('combobox', { name: 'Indicado por (contato)' }));
    await user.click(await screen.findByRole('option', { name: /Antônio Lima/ }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('combobox', { name: 'Indicado por (interno)' }));
    await user.click(await screen.findByRole('option', { name: /Carlos Menezes/ }));
    await user.keyboard('{Escape}');

    await waitFor(() => {
      const search = new URLSearchParams(router.state.location.search);
      expect(search.get('referrerContactId')).toBe(antonio.id);
      expect(search.get('referrerUserId')).toBe(carlos.id);
      expect(search.has('page')).toBe(false);
    });
    await waitFor(() => expect(lastListParams(api)?.get('referrerUserId')).toBe(carlos.id));
    expect(lastListParams(api)?.get('referrerContactId')).toBe(antonio.id);
    expect(lastListParams(api)?.get('page')).toBe('1');
  });

  it('o contador de "Limpar busca e filtros" soma os dois filtros e limpar zera os dois', async () => {
    const { api, router } = openWithReferrers(`?referrerContactId=${antonio.id}&referrerUserId=${carlos.id}`);
    const user = userEvent.setup();
    await screen.findByRole('table');

    const clear = await screen.findByRole('button', { name: /Limpar busca e filtros/ });
    expect(clear).toHaveTextContent('2');
    await user.click(clear);

    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(lastListParams(api)?.has('referrerContactId')).toBe(false));
    expect(lastListParams(api)?.has('referrerUserId')).toBe(false);
  });
});
