// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const MARINA = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'Marina Duarte', email: 'marina@grandvista.com.br' };
const JOAO = {
  id: '0197c000-0000-7000-8000-0000000000b1',
  name: 'João Batista',
  personType: 'pf',
  taxId: null,
  roles: ['external_broker'],
};
const SEBASTIAO = {
  id: '0197c000-0000-7000-8000-0000000000b2',
  name: 'Sebastião Ferreira',
  personType: 'pf',
  taxId: null,
  roles: ['external_broker'],
};

const contact = (referralChain: unknown[] = []) => ({
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
  { id: 'l1', position: 1, referrer: { kind: 'contact', id: JOAO.id, name: JOAO.name }, notes: 'trouxe direto' },
  { id: 'l2', position: 2, referrer: { kind: 'user', id: MARINA.id, name: MARINA.name, linked: true }, notes: null },
];

/** API falsa que guarda o corpo do `POST`/`PATCH` de contato. */
function stub(record: unknown | null = null) {
  stubFakeApi({
    session: session(),
    permissions: ['contatos.ver', 'contatos.editar', 'contatos.criar'],
    records: {
      ...(record ? { '/e/grand-vista/contacts/c1': record } : {}),
      '/e/grand-vista/users': { users: [MARINA] },
      '/e/grand-vista/contacts/options': { items: [JOAO, SEBASTIAO] },
    },
  });
  const sent: { method: string; body: Record<string, unknown> }[] = [];
  const fallback = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST' || method === 'PATCH') {
        sent.push({ method, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return json(contact(), method === 'POST' ? 201 : 200);
      }
      if (String(input).includes('/contacts/duplicates')) return json({ items: [] });
      return fallback(input, init);
    }),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

const pickerName = 'Indicadores';
const chainList = () => screen.getByRole('list', { name: /Cadeia de indicação de/ });
const names = () =>
  within(chainList())
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'));

describe('cadeia de indicação no formulário do contato', () => {
  it('a seção vem logo depois de Dados, com qualquer papel marcado', async () => {
    stub();
    renderApp('/e/grand-vista/contacts/new');
    await screen.findByLabelText(/^Nome/);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings.indexOf('Cadeia de indicação')).toBe(headings.indexOf('Dados') + 1);
    expect(screen.getByText('Arraste pela alça ou use o teclado para mudar a ordem.')).toBeInTheDocument();
  });

  it('cadastro: adiciona interno e externo, reordena pelo teclado, remove um e envia na ordem da tela, sem position nem name', async () => {
    const sent = stub();
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Pedro Almeida');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));

    // O seletor acompanha o nome digitado.
    expect(screen.getByRole('combobox', { name: pickerName })).toHaveTextContent('Quem indicou Pedro Almeida?');

    // Externo: João.
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /João Batista/ }));
    // Interno: Marina.
    await user.click(screen.getByRole('button', { name: 'Interno' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /Marina Duarte/ }));
    // Externo: Sebastião.
    await user.click(screen.getByRole('button', { name: 'Externo' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /Sebastião Ferreira/ }));
    expect(names()).toEqual(['1. João Batista', '2. Marina Duarte', '3. Sebastião Ferreira']);

    // Reordena: Sebastião sobe para a primeira posição.
    screen.getByRole('button', { name: 'Mover Sebastião Ferreira' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard(' ');
    expect(names()).toEqual(['1. Sebastião Ferreira', '2. João Batista', '3. Marina Duarte']);

    // Remove a Marina e escreve uma nota no João.
    await user.click(screen.getByRole('button', { name: 'Remover Marina Duarte' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota sobre João Batista' }), 'vizinho de cerca');

    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.method).toBe('POST');
    expect(sent[0]?.body['referralChain']).toEqual([
      { referrer: { kind: 'contact', id: SEBASTIAO.id }, notes: null },
      { referrer: { kind: 'contact', id: JOAO.id }, notes: 'vizinho de cerca' },
    ]);
  });

  it('edição: o editor nasce com a cadeia gravada e, sem tocar na seção, o payload não leva referralChain', async () => {
    const sent = stub(contact(chain));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();

    await screen.findByLabelText(/^Nome/);
    expect(names()).toEqual(['1. João Batista', '2. Marina Duarte']);
    expect(screen.getByRole('textbox', { name: 'Nota sobre João Batista' })).toHaveValue('trouxe direto');

    await user.type(screen.getByLabelText(/^Nome/), ' Filho');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.method).toBe('PATCH');
    expect(sent[0]?.body).toMatchObject({ name: 'Pedro Almeida Filho' });
    expect(sent[0]?.body).not.toHaveProperty('referralChain');
  });

  it('edição: inverter a ordem envia a lista completa na nova ordem; esvaziar envia []', async () => {
    const sent = stub(contact(chain));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    await screen.findByLabelText(/^Nome/);

    screen.getByRole('button', { name: 'Mover Marina Duarte' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body['referralChain']).toEqual([
      { referrer: { kind: 'user', id: MARINA.id }, notes: null },
      { referrer: { kind: 'contact', id: JOAO.id }, notes: 'trouxe direto' },
    ]);
  });

  it('edição: remover todos os elos envia referralChain: []', async () => {
    const sent = stub(contact(chain));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    await screen.findByLabelText(/^Nome/);

    await user.click(screen.getByRole('button', { name: 'Remover João Batista' }));
    await user.click(screen.getByRole('button', { name: 'Remover Marina Duarte' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body['referralChain']).toEqual([]);
  });
});
