// @vitest-environment jsdom
import '../../support/dom.js';
import type { PermissionCode } from '@crm/shared';
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

/** Contato que o cadastro rápido do diálogo cria: o `POST` com este nome é o do diálogo, não o do formulário. */
const SEBASTIAO_NOVO = {
  ...SEBASTIAO,
  id: '0197c000-0000-7000-8000-0000000000b3',
  name: 'Sebastião Novo',
};

/** API falsa que guarda o corpo do `POST`/`PATCH` de contato. */
function stub(record: unknown | null = null, permissions: PermissionCode[] = ['contatos.ver', 'contatos.editar', 'contatos.criar']) {
  stubFakeApi({
    session: session(),
    permissions,
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
      if (method === 'GET' && String(input).includes('/contacts/options') && String(input).includes('Novo')) {
        return json({ items: [] });
      }
      if (method === 'POST' || method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        sent.push({ method, body });
        // cadastro rápido: o diálogo cria o contato novo, já com o papel pedido
        if (method === 'POST' && body['name'] === SEBASTIAO_NOVO.name) return json({ ...contact(), ...SEBASTIAO_NOVO }, 201);
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
const chainList = () => screen.getByRole('list', { name: /^Indicadores de / });
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

  it('cadastro rápido: "Cadastrar contato" no seletor abre o diálogo com o nome e Corretor externo marcados, e o contato novo entra como último elo e vai no payload', async () => {
    const sent = stub();
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Pedro Almeida');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));

    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /João Batista/ }));

    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText(/Nenhum resultado para/);
    // o botão de enviar do formulário tem o mesmo nome: o do seletor é o que está fora do `form`
    const create = screen.getAllByRole('button', { name: 'Cadastrar contato' }).find((button) => !button.closest('form'));
    expect(create).toBeDefined();
    if (create) await user.click(create);

    const dialog = await screen.findByRole('dialog', { name: 'Cadastrar contato' });
    expect(within(dialog).getByLabelText(/^Nome/)).toHaveValue('Sebastião Novo');
    expect(within(dialog).getByRole('checkbox', { name: 'Corretor externo' })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar contato' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(names()).toEqual(['1. João Batista', '2. Sebastião Novo']);
    // o contato criado entra pelo `add` do editor: anúncio da região viva e foco de volta no seletor
    expect(screen.getByText('Sebastião Novo entrou na cadeia, na posição 2.')).toHaveAttribute('role', 'status');
    await waitFor(() => expect(screen.getByRole('combobox', { name: pickerName })).toHaveFocus());
    expect(sent.find((request) => request.body['name'] === SEBASTIAO_NOVO.name)?.body['roles']).toEqual(['external_broker']);

    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    await waitFor(() => expect(sent.filter((request) => request.body['name'] === 'Pedro Almeida')).toHaveLength(1));
    expect(sent.find((request) => request.body['name'] === 'Pedro Almeida')?.body['referralChain']).toEqual([
      { referrer: { kind: 'contact', id: JOAO.id }, notes: null },
      { referrer: { kind: 'contact', id: SEBASTIAO_NOVO.id }, notes: null },
    ]);
  });

  it('cadastro rápido cancelado: nada entra na cadeia e o foco volta ao seletor', async () => {
    stub();
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Pedro Almeida');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText(/Nenhum resultado para/);
    const create = screen.getAllByRole('button', { name: 'Cadastrar contato' }).find((button) => !button.closest('form'));
    expect(create).toBeDefined();
    if (create) await user.click(create);

    const dialog = await screen.findByRole('dialog', { name: 'Cadastrar contato' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('combobox', { name: pickerName })).toHaveFocus());
    expect(screen.queryByRole('list', { name: /^Indicadores de / })).not.toBeInTheDocument();
  });

  it('cadastro rápido fechado com Escape: nada entra na cadeia e o foco volta ao seletor', async () => {
    stub();
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Pedro Almeida');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText(/Nenhum resultado para/);
    const create = screen.getAllByRole('button', { name: 'Cadastrar contato' }).find((button) => !button.closest('form'));
    expect(create).toBeDefined();
    if (create) await user.click(create);

    await screen.findByRole('dialog', { name: 'Cadastrar contato' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('combobox', { name: pickerName })).toHaveFocus());
    expect(screen.queryByRole('list', { name: /^Indicadores de / })).not.toBeInTheDocument();
    expect(screen.queryByText(/entrou na cadeia/)).not.toBeInTheDocument();
  });

  it('cadastro rápido fechado com clique fora: nada entra na cadeia e o foco volta ao seletor', async () => {
    stub();
    renderApp('/e/grand-vista/contacts/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Nome/), 'Pedro Almeida');
    await user.click(screen.getByRole('checkbox', { name: 'Comprador' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText(/Nenhum resultado para/);
    const create = screen.getAllByRole('button', { name: 'Cadastrar contato' }).find((button) => !button.closest('form'));
    expect(create).toBeDefined();
    if (create) await user.click(create);

    const dialog = await screen.findByRole('dialog', { name: 'Cadastrar contato' });
    // o clique cai no fundo que o Radix põe atrás do diálogo (fora do painel)
    const backdrop = dialog.previousElementSibling;
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('combobox', { name: pickerName })).toHaveFocus());
    expect(screen.queryByRole('list', { name: /^Indicadores de / })).not.toBeInTheDocument();
    expect(screen.queryByText(/entrou na cadeia/)).not.toBeInTheDocument();
  });

  it('sem contatos.criar, o seletor não oferece "Cadastrar contato"', async () => {
    stub(contact(), ['contatos.ver', 'contatos.editar']);
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    await screen.findByLabelText(/^Nome/);

    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião Novo');
    await screen.findByText(/Nenhum resultado para/);
    // na edição o botão de enviar é "Salvar alterações": nenhum outro se chama "Cadastrar contato"
    expect(screen.queryByRole('button', { name: 'Cadastrar contato' })).not.toBeInTheDocument();
  });

  it('edição: usuário sem vínculo aparece com Sem acesso e, sem tocar na seção, o payload não leva referralChain', async () => {
    const unlinked = [chain[0], { ...chain[1], referrer: { ...MARINA, kind: 'user', linked: false } }];
    const sent = stub(contact(unlinked));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    await screen.findByLabelText(/^Nome/);

    const [, second] = within(chainList()).getAllByRole('listitem');
    expect(second).toHaveTextContent('Interno');
    expect(second).toHaveTextContent('Sem acesso');

    await user.type(screen.getByLabelText(/^Nome/), ' Filho');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body).not.toHaveProperty('referralChain');
  });

  it('edição: tocando outro elo, o usuário sem vínculo vai no payload sem linked', async () => {
    const unlinked = [chain[0], { ...chain[1], referrer: { ...MARINA, kind: 'user', linked: false } }];
    const sent = stub(contact(unlinked));
    renderApp('/e/grand-vista/contacts/c1/edit');
    const user = userEvent.setup();
    await screen.findByLabelText(/^Nome/);

    await user.type(screen.getByRole('textbox', { name: 'Nota sobre João Batista' }), '!');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body['referralChain']).toEqual([
      { referrer: { kind: 'contact', id: JOAO.id }, notes: 'trouxe direto!' },
      { referrer: { kind: 'user', id: MARINA.id }, notes: null },
    ]);
  });
});
