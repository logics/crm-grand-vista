// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactSections } from '../../../src/modules/contacts/contact-sections.js';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

// Seção de exemplo que uma spec futura registraria: só para comprador (a de perfil de compra é real e vive em `contact-sections`).
contactSections.register({
  key: 'buyer-wishes',
  title: 'Desejos do comprador',
  order: 20,
  roles: ['buyer'],
  component: () => <p>Quer fazenda de soja</p>,
});
contactSections.register({
  key: 'private-notes',
  title: 'Anotações da diretoria',
  order: 30,
  permission: 'contatos.excluir',
  component: () => <p>Só a diretoria</p>,
});

const contact = (overrides = {}) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Sebastião',
  legalName: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  roles: ['external_broker'],
  referralChain: [],
  createdAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

const history = {
  entries: [
    {
      changeId: 'h1',
      kind: 'updated',
      title: 'Papel adicionado',
      at: '2026-01-03T10:00:00.000Z',
      author: 'Ana Ribeiro',
      changes: [],
      children: [{ title: 'Papel adicionado: Comprador', changes: [] }],
    },
  ],
};

/** A seção da ficha pela chave com que foi registrada. */
const findSection = async (key: string) => {
  await screen.findByRole('heading', { name: 'Sebastião' });
  return waitFor(() => {
    const section = document.querySelector<HTMLElement>(`[data-section="${key}"]`);
    if (!section) throw new Error(`Seção ${key} ainda não montou.`);
    return section;
  });
};

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ficha do contato', () => {
  it('mostra a seção Dados e só pede o histórico ao clicar em Histórico', async () => {
    const api = stubFakeApi({
      session: session(),
      permissions: ['contatos.ver', 'contatos.editar'],
      records: { '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': history },
    });
    renderApp('/e/grand-vista/contacts/c1');

    expect(await screen.findByRole('heading', { name: 'Sebastião' })).toBeInTheDocument();
    const data = await findSection('data');
    expect(within(data).getByText('Corretor externo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    const historyRequests = () => api.requests.filter((request) => request.path === '/e/grand-vista/contacts/c1/history');
    expect(historyRequests()).toHaveLength(0);
    expect(screen.queryByText('Papel adicionado: Comprador')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de alterações' });
    expect(await within(dialog).findByText('Papel adicionado: Comprador')).toBeInTheDocument();
    expect(historyRequests()).toHaveLength(1);
  });

  it('quem só vê o contato abre o histórico, sem Editar nem Excluir', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: { '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': history },
    });
    renderApp('/e/grand-vista/contacts/c1');

    await findSection('data');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de alterações' });
    expect(await within(dialog).findByText('Papel adicionado: Comprador')).toBeInTheDocument();
  });

  it('a seção condicionada ao papel comprador só aparece quando o contato o tem', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: { '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': history },
    });
    renderApp('/e/grand-vista/contacts/c1');
    await findSection('data');
    expect(screen.queryByText('Desejos do comprador')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: {
        '/e/grand-vista/contacts/c2': contact({ id: 'c2', roles: ['buyer', 'external_broker'] }),
        '/e/grand-vista/contacts/c2/history': history,
      },
    });
    renderApp('/e/grand-vista/contacts/c2');

    expect(await screen.findByText('Quer fazenda de soja')).toBeInTheDocument();
  });

  it('a seção condicionada a permissão some para quem não a tem', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: { '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': history },
    });
    renderApp('/e/grand-vista/contacts/c1');

    await findSection('data');
    expect(screen.queryByText('Anotações da diretoria')).not.toBeInTheDocument();
  });
});

describe('excluir pela ficha', () => {
  /** API falsa com o DELETE do contato, que ela não conhece, respondendo `answer`. */
  const stubWithDelete = (permissions: string[], answer: () => Response) => {
    const api = stubFakeApi({
      session: session(),
      permissions: permissions as never,
      records: { '/e/grand-vista/contacts/c1': contact(), '/e/grand-vista/contacts/c1/history': history },
    });
    const base = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined;
      const method = init?.method ?? request?.method ?? 'GET';
      const path = new URL(request?.url ?? String(input), 'http://localhost').pathname;
      if (method === 'DELETE' && path === '/e/grand-vista/contacts/c1') {
        api.requests.push({ method, path, init });
        return Promise.resolve(answer());
      }
      return base(input, init);
    });
    return api;
  };

  it('pede confirmação e, recusada pela API, mostra o 409 sem sair da ficha', async () => {
    const api = stubWithDelete(
      ['contatos.ver', 'contatos.excluir'],
      () =>
        new Response(
          JSON.stringify({
            error: { code: 'conflict', message: 'Este contato está em uso em Fazendas. Remova os vínculos antes de excluir.' },
          }),
          {
            status: 409,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );
    const { pathname } = renderApp('/e/grand-vista/contacts/c1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('dialog');
    expect(api.requests.some((request) => request.method === 'DELETE')).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Este contato está em uso em Fazendas. Remova os vínculos antes de excluir.'),
    ).toBeInTheDocument();
    expect(pathname()).toBe('/e/grand-vista/contacts/c1');
    expect(screen.getByRole('heading', { name: 'Sebastião' })).toBeInTheDocument();
  });

  it('cancelar não exclui', async () => {
    const api = stubWithDelete(['contatos.ver', 'contatos.excluir'], () => new Response(null, { status: 204 }));
    renderApp('/e/grand-vista/contacts/c1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(api.requests.some((request) => request.method === 'DELETE')).toBe(false);
  });

  it('esconde Excluir de quem não tem contatos.excluir', async () => {
    stubWithDelete(['contatos.ver', 'contatos.editar'], () => new Response(null, { status: 204 }));
    renderApp('/e/grand-vista/contacts/c1');

    await screen.findByRole('button', { name: 'Editar' });
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('confirmada com 204, volta para a lista', async () => {
    stubWithDelete(['contatos.ver', 'contatos.excluir'], () => new Response(null, { status: 204 }));
    const { pathname } = renderApp('/e/grand-vista/contacts/c1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts'));
  });
});

describe('lista de contatos', () => {
  it('mostra nome, papéis e abre a ficha ao clicar', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver', 'contatos.criar'],
      records: {
        '/e/grand-vista/contacts?page=1&pageSize=25&sort=name': page([contact()]),
        '/e/grand-vista/contacts': page([contact()]),
        '/e/grand-vista/contacts/c1': contact(),
        '/e/grand-vista/contacts/c1/history': history,
      },
    });
    const { pathname } = renderApp('/e/grand-vista/contacts');
    const user = userEvent.setup();

    expect(await screen.findByRole('button', { name: 'Novo contato' })).toBeInTheDocument();
    await user.click(await screen.findByText('Sebastião'));

    expect(await screen.findByRole('heading', { name: 'Sebastião' })).toBeInTheDocument();
    expect(pathname()).toBe('/e/grand-vista/contacts/c1');
  });

  it('esconde "Novo contato" de quem não pode criar', async () => {
    stubFakeApi({
      session: session(),
      permissions: ['contatos.ver'],
      records: { '/e/grand-vista/contacts': page([contact()]) },
    });
    renderApp('/e/grand-vista/contacts');

    await screen.findByText('Sebastião');
    expect(screen.queryByRole('button', { name: 'Novo contato' })).not.toBeInTheDocument();
  });
});
