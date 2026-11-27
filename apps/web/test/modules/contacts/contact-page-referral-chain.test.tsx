// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const contact = (referralChain: unknown[]) => ({
  id: 'c1',
  personType: 'pf',
  name: 'Pedro Almeida',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  whatsapp: null,
  relationshipOrigin: null,
  strategicNotes: null,
  classificationId: null,
  leadSourceId: null,
  roles: ['owner'],
  buyerProfile: null,
  referralChain,
  createdAt: '2026-01-02T10:00:00.000Z',
});

const chain = [
  { id: 'l1', position: 1, referrer: { kind: 'contact', id: 'u1', name: 'João Batista' }, notes: 'trouxe direto' },
  { id: 'l2', position: 2, referrer: { kind: 'user', id: 'u2', name: 'Marina Duarte', linked: true }, notes: null },
];

function open(record: unknown, permissions: string[] = ['contatos.ver', 'contatos.editar']) {
  stubFakeApi({
    session: session(),
    permissions: permissions as never,
    records: { '/e/grand-vista/contacts/c1': record, '/e/grand-vista/contacts/c1/history': { entries: [] } },
  });
  return renderApp('/e/grand-vista/contacts/c1');
}

afterEach(() => vi.unstubAllGlobals());

describe('cadeia de indicação na ficha do contato', () => {
  it('com cadeia: lista ordenada em somente leitura, depois de Dados, sem controle de edição', async () => {
    open(contact(chain));

    const list = await screen.findByRole('list', { name: 'Cadeia de indicação de Pedro Almeida' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(['1. João Batista', '2. Marina Duarte']);
    expect(items[0]).toHaveTextContent('Externo');
    expect(items[0]).toHaveTextContent('trouxe direto');
    expect(items[1]).toHaveTextContent('Interno');
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings.indexOf('Cadeia de indicação')).toBe(headings.indexOf('Dados') + 1);
  });

  it('ficha: usuário com linked: false mostra Interno e Sem acesso', async () => {
    const unlinked = [chain[0], { ...chain[1], referrer: { kind: 'user', id: 'u2', name: 'Marina Duarte', linked: false } }];
    open(contact(unlinked));

    const list = await screen.findByRole('list', { name: 'Cadeia de indicação de Pedro Almeida' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(second).toHaveAccessibleName('2. Marina Duarte');
    expect(second).toHaveTextContent('Interno');
    expect(second).toHaveTextContent('Sem acesso');
    expect(first).not.toHaveTextContent('Sem acesso');
  });

  it('vazia: o atalho abre o formulário na cadeia de indicação, com foco no seletor', async () => {
    const { pathname, hash } = open(contact([]));
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const user = userEvent.setup();

    expect(await screen.findByText('Sem cadeia de indicação')).toBeInTheDocument();
    expect(screen.getByText('Quem trouxe este contato ainda não foi registrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar indicação' }));

    await waitFor(() => expect(pathname()).toBe('/e/grand-vista/contacts/c1/edit'));
    expect(hash()).toBe('#indicacao');
    const heading = await screen.findByRole('heading', { name: 'Cadeia de indicação' });
    const card = heading.closest('[id="indicacao"]');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Indicadores' })).toHaveFocus());
    expect(card).not.toBeNull();
    expect(scroll.mock.contexts).toContain(card);
    scroll.mockRestore();
  });

  it('vazia, sem contatos.editar: o estado vazio fica sem o atalho', async () => {
    open(contact([]), ['contatos.ver']);

    expect(await screen.findByText('Sem cadeia de indicação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar indicação' })).not.toBeInTheDocument();
  });
});
