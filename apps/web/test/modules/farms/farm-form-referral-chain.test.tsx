// @vitest-environment jsdom
import '../../support/dom.js';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session, stubFakeApi } from '../../support/fake-api.js';
import { farmDetail } from '../../support/farm-fixture.js';
import { renderApp } from '../../support/render-app.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const CARLOS = { id: '0197c000-0000-7000-8000-0000000000a1', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' };
const ANTONIO = {
  id: '0197c000-0000-7000-8000-0000000000b1',
  name: 'Antônio Prado',
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
const RIO_VERDE = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };

const chain = [
  { id: 'l1', position: 1, referrer: { kind: 'user', id: CARLOS.id, name: CARLOS.name, linked: true }, notes: null },
  { id: 'l2', position: 2, referrer: { kind: 'contact', id: ANTONIO.id, name: ANTONIO.name }, notes: 'trouxe direto' },
];

/** API falsa que guarda o corpo do `POST`/`PATCH` de fazenda. */
function stub(record: unknown | null = null) {
  stubFakeApi({
    session: session(),
    permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar', 'contatos.ver'],
    dataScopes: { fazendas: 'all' },
    records: {
      ...(record ? { '/e/grand-vista/farms/f1': record } : {}),
      '/e/grand-vista/municipalities': { items: [RIO_VERDE] },
      '/e/grand-vista/users': { users: [{ ...CARLOS, profiles: [] }] },
      '/e/grand-vista/contacts/options': { items: [ANTONIO, SEBASTIAO] },
      '/e/grand-vista/settings': { defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' },
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
        return json(farmDetail(), method === 'POST' ? 201 : 200);
      }
      if (String(input).includes('/farms/duplicates')) return json({ items: [] });
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

describe('cadeia de indicação no formulário da fazenda', () => {
  it('a seção vem depois de Proprietários e entra no índice de âncoras', async () => {
    stub();
    renderApp('/e/grand-vista/farms/new');
    await screen.findByRole('textbox', { name: /Nome/ });

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings.indexOf('Cadeia de indicação')).toBe(headings.indexOf('Proprietários') + 1);
    expect(screen.getByRole('link', { name: 'Cadeia de indicação' })).toBeInTheDocument();
    expect(screen.getByText('Arraste pela alça ou use o teclado para mudar a ordem.')).toBeInTheDocument();
  });

  it('cadastro: adiciona interno e externo, reordena pelo teclado, remove um e envia na ordem da tela, sem position nem name', async () => {
    const sent = stub();
    renderApp('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Santa Rita');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '1000');

    // O seletor acompanha o nome digitado.
    expect(screen.getByRole('combobox', { name: pickerName })).toHaveTextContent('Quem indicou Fazenda Santa Rita?');

    // Interno: Carlos.
    await user.click(screen.getByRole('button', { name: 'Interno' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /Carlos Menezes/ }));
    // Externo: Antônio e Sebastião.
    await user.click(screen.getByRole('button', { name: 'Externo' }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /Antônio Prado/ }));
    await user.click(screen.getByRole('combobox', { name: pickerName }));
    await user.click(await screen.findByRole('option', { name: /Sebastião Ferreira/ }));
    expect(names()).toEqual(['1. Carlos Menezes', '2. Antônio Prado', '3. Sebastião Ferreira']);

    // Reordena: Sebastião sobe para a primeira posição.
    screen.getByRole('button', { name: 'Mover Sebastião Ferreira' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard(' ');
    expect(names()).toEqual(['1. Sebastião Ferreira', '2. Carlos Menezes', '3. Antônio Prado']);

    // Remove o Carlos.
    await user.click(screen.getByRole('button', { name: 'Remover Carlos Menezes' }));

    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.method).toBe('POST');
    expect(sent[0]?.body['referralChain']).toEqual([
      { referrer: { kind: 'contact', id: SEBASTIAO.id }, notes: null },
      { referrer: { kind: 'contact', id: ANTONIO.id }, notes: null },
    ]);
  });

  it('cadastro sem tocar a seção: o payload não leva referralChain', async () => {
    const sent = stub();
    renderApp('/e/grand-vista/farms/new');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: /Nome/ }), 'Fazenda Santa Rita');
    await user.click(screen.getByRole('combobox', { name: /Município/ }));
    await user.click(await screen.findByRole('option', { name: /Rio Verde/ }));
    await user.type(screen.getByRole('textbox', { name: /Área total/ }), '1000');
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body).not.toHaveProperty('referralChain');
  });

  it('edição: o editor nasce com a cadeia gravada e, sem tocar na seção, o PATCH não leva referralChain', async () => {
    const sent = stub(farmDetail(chain));
    renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();

    const name = await screen.findByRole('textbox', { name: /Nome/ });
    expect(names()).toEqual(['1. Carlos Menezes', '2. Antônio Prado']);
    expect(screen.getByRole('textbox', { name: 'Nota sobre Antônio Prado' })).toHaveValue('trouxe direto');

    await user.clear(name);
    await user.type(name, 'Boa Vista II');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.method).toBe('PATCH');
    expect(sent[0]?.body).toMatchObject({ name: 'Boa Vista II' });
    expect(sent[0]?.body).not.toHaveProperty('referralChain');
  });

  it('edição: inverter a ordem envia a lista completa na nova ordem', async () => {
    const sent = stub(farmDetail(chain));
    renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();
    await screen.findByRole('textbox', { name: /Nome/ });

    screen.getByRole('button', { name: 'Mover Antônio Prado' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body['referralChain']).toEqual([
      { referrer: { kind: 'contact', id: ANTONIO.id }, notes: 'trouxe direto' },
      { referrer: { kind: 'user', id: CARLOS.id }, notes: null },
    ]);
  });

  it('edição: remover todos os elos envia referralChain: []', async () => {
    const sent = stub(farmDetail(chain));
    renderApp('/e/grand-vista/farms/f1/edit');
    const user = userEvent.setup();
    await screen.findByRole('textbox', { name: /Nome/ });

    await user.click(screen.getByRole('button', { name: 'Remover Carlos Menezes' }));
    await user.click(screen.getByRole('button', { name: 'Remover Antônio Prado' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.body['referralChain']).toEqual([]);
  });
});
