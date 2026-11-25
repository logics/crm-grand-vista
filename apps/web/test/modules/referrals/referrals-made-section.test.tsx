// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const ANTONIO = '0197c000-0000-7000-8000-0000000000a1';
const ACTIVE_STATUS = {
  id: '0197c000-0000-7000-8000-0000000000c1',
  name: 'Disponível',
  active: true,
  systemMeaning: 'available',
};
const INACTIVE_STATUS = {
  id: '0197c000-0000-7000-8000-0000000000c2',
  name: 'Desativada',
  active: false,
  systemMeaning: 'inactive',
};

const contactRecord = (roles: string[]) => ({
  id: ANTONIO,
  personType: 'pf',
  name: 'Antônio',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles,
  referralChain: [],
  createdAt: '2026-01-02T10:00:00.000Z',
});

const referredContact = (id: string, name: string) => ({ ...contactRecord(['buyer']), id, name, phone: '+5564999991234' });
const referredFarm = (id: string, name: string, status = ACTIVE_STATUS) => ({
  id,
  name,
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  responsible: { id: 'u1', name: 'Ana Ribeiro' },
  commercialStatus: { id: status.id, name: status.name, systemMeaning: status.systemMeaning },
});

const page = (items: unknown[], total = items.length) => ({ items, total, page: 1, pageSize: 25 });

interface OpenOptions {
  roles?: string[];
  permissions?: PermissionCode[];
  contacts?: ReturnType<typeof page>;
  farms?: ReturnType<typeof page>;
  statusesFail?: boolean;
}

function open({
  roles = ['external_broker'],
  permissions = ['contatos.ver', 'fazendas.ver'],
  contacts = page([referredContact('c2', 'Pedro Alves')]),
  farms = page([referredFarm('f1', 'Fazenda Boa Vista'), referredFarm('f2', 'Fazenda Antiga', INACTIVE_STATUS)]),
  statusesFail = false,
}: OpenOptions = {}) {
  const api = stubFakeApi({
    session: session(),
    permissions,
    dataScopes: { fazendas: 'all' },
    records: {
      [`/e/grand-vista/contacts/${ANTONIO}`]: contactRecord(roles),
      [`/e/grand-vista/contacts/${ANTONIO}/history`]: { entries: [] },
      '/e/grand-vista/contacts': contacts,
      '/e/grand-vista/farms': farms,
      '/e/grand-vista/settings/vocabularies/commercial-statuses/options': statusesFail
        ? () => new Response(null, { status: 500 })
        : { items: [ACTIVE_STATUS, INACTIVE_STATUS] },
    },
  });
  return { api, ...renderApp(`/e/grand-vista/contacts/${ANTONIO}`) };
}

type Api = ReturnType<typeof stubFakeApi>;
const listRequests = (api: Api, path: 'contacts' | 'farms') =>
  api.requests
    .filter((request) => request.path === `/e/grand-vista/${path}`)
    .map((request) => new URLSearchParams(request.search ?? ''));
const withReferrer = (api: Api, path: 'contacts' | 'farms') =>
  listRequests(api, path).filter((params) => params.get('referrerContactId') === ANTONIO);

/** O bloco é remontado quando os dados chegam: a consulta é refeita a cada tentativa, nunca guardada. */
const block = (name: string) => within(screen.getByRole('region', { name }));
/** Espera o texto aparecer dentro do bloco (a seção carrega por partes). */
const seen = (name: string, text: string) => waitFor(() => block(name).getByText(text));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('seção "Indicações feitas" da ficha do contato (critério 19)', () => {
  it('com corretor externo e fazendas.ver mostra os dois blocos e pede as listas com o indicador e todos os status', async () => {
    const { api } = open();

    expect(await screen.findByRole('heading', { name: 'Indicações feitas' })).toBeInTheDocument();
    expect(await seen('Contatos', 'Pedro Alves')).toBeInTheDocument();
    expect(await seen('Fazendas', 'Fazenda Boa Vista')).toBeInTheDocument();
    expect(block('Fazendas').getByText('Fazenda Antiga')).toBeInTheDocument();

    expect(withReferrer(api, 'contacts').length).toBeGreaterThan(0);
    const farmParams = withReferrer(api, 'farms');
    expect(farmParams.length).toBeGreaterThan(0);
    expect(farmParams.at(-1)!.get('commercialStatusId')).toBe(`${ACTIVE_STATUS.id},${INACTIVE_STATUS.id}`);
    // o pedido de status traz também as desativadas
    const statusRequest = api.requests.find((request) => request.path.endsWith('/commercial-statuses/options'));
    expect(new URLSearchParams(statusRequest!.search).get('includeInactive')).toBe('true');
    // sem a lista de fazendas antes de ter todos os status: nunca um pedido sem commercialStatusId
    expect(withReferrer(api, 'farms').every((params) => params.has('commercialStatusId'))).toBe(true);
  });

  it('mostra a contagem de cada bloco no singular e no plural', async () => {
    open({ contacts: page([referredContact('c2', 'Pedro Alves')]) });

    expect(await seen('Contatos', '1 contato')).toBeInTheDocument();
    expect(await seen('Fazendas', '2 fazendas')).toBeInTheDocument();
  });

  it('contato sem o papel de corretor externo não mostra a seção nem pede as listas com o indicador', async () => {
    const { api } = open({ roles: ['buyer'] });

    await screen.findByRole('heading', { name: 'Dados' });
    expect(screen.queryByRole('heading', { name: 'Indicações feitas' })).not.toBeInTheDocument();
    expect(withReferrer(api, 'contacts')).toHaveLength(0);
    expect(withReferrer(api, 'farms')).toHaveLength(0);
  });

  it('sem fazendas.ver mostra só o bloco de contatos e não pede fazendas', async () => {
    const { api } = open({ permissions: ['contatos.ver'] });

    expect(await seen('Contatos', 'Pedro Alves')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Fazendas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fazendas' })).not.toBeInTheDocument();
    expect(listRequests(api, 'farms')).toHaveLength(0);
  });

  it('estado vazio por bloco, independentes', async () => {
    open({ contacts: page([]) });
    expect(await seen('Contatos', 'Nenhum contato indicado.')).toBeInTheDocument();
    expect(await seen('Fazendas', 'Fazenda Boa Vista')).toBeInTheDocument();
    cleanup();

    open({ farms: page([]) });
    expect(await seen('Fazendas', 'Nenhuma fazenda indicada.')).toBeInTheDocument();
    expect(await seen('Contatos', 'Pedro Alves')).toBeInTheDocument();
  });

  it('se os status não carregam, o bloco de fazendas mostra erro, nunca a lista sem status, e o de contatos segue', async () => {
    const { api } = open({ statusesFail: true });

    expect(await seen('Fazendas', 'Não foi possível carregar as fazendas.')).toBeInTheDocument();
    expect(await seen('Contatos', 'Pedro Alves')).toBeInTheDocument();
    expect(withReferrer(api, 'farms')).toHaveLength(0);
  });

  it('a paginação pede a página 2 só do bloco clicado', async () => {
    const { api } = open({ contacts: page([referredContact('c2', 'Pedro Alves')], 30) });
    const user = userEvent.setup();
    await seen('Contatos', 'Pedro Alves');
    await seen('Fazendas', 'Fazenda Boa Vista');
    // fazendas com 2 itens: sem paginação
    expect(block('Fazendas').queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();

    await user.click(block('Contatos').getByRole('button', { name: 'Próxima página' }));

    await waitFor(() => expect(withReferrer(api, 'contacts').at(-1)!.get('page')).toBe('2'));
    expect(withReferrer(api, 'farms').every((params) => params.get('page') === '1')).toBe(true);
  });

  it('sem coluna de posição', async () => {
    open();
    await seen('Contatos', 'Pedro Alves');
    await seen('Fazendas', 'Fazenda Boa Vista');

    expect(screen.queryByRole('columnheader', { name: /Posição/ })).not.toBeInTheDocument();
  });

  it('clicar na linha leva à ficha do contato e da fazenda', async () => {
    const { router } = open();
    const user = userEvent.setup();

    await user.click(await seen('Fazendas', 'Fazenda Boa Vista'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/e/grand-vista/farms/f1'));
  });

  it('clicar na linha do contato leva a contacts/:id', async () => {
    const { router } = open();
    const user = userEvent.setup();

    await user.click(await seen('Contatos', 'Pedro Alves'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/e/grand-vista/contacts/c2'));
  });
});
