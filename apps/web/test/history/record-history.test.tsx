// @vitest-environment jsdom
import '../support/dom.js';
import type { HistoryEntry, HistoryPage } from '@crm/shared';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordHistory } from '../../src/history/record-history.js';
import { api } from '../../src/lib/api.js';
import { type FakeResponse, session, stubFakeApi } from '../support/fake-api.js';
import { renderApp } from '../support/render-app.js';

const userId = '01900000-0000-7000-8000-000000000002';
const historyPath = `/e/grand-vista/users/${userId}/history`;

// A ficha do usuário, com a rota de histórico de verdade pelo cliente RPC.
function UserHistoryPage() {
  return (
    <RecordHistory
      queryKey={['users', userId]}
      fetchPage={(slug, cursor) =>
        api.e[':tenant'].users[':id'].history.$get({ param: { tenant: slug, id: userId }, query: { cursor } })
      }
    />
  );
}

function renderHistory(records: Record<string, unknown>) {
  const fake = stubFakeApi({ session: session(), records });
  renderApp(`/e/grand-vista/users/${userId}`, { tenantPages: [{ path: 'users/:id', element: <UserHistoryPage /> }] });
  return fake;
}

const entry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  changeId: '1',
  at: '2026-07-24T17:30:00.000Z',
  author: 'Rafael Tavares',
  kind: 'updated',
  title: 'Nome alterado',
  changes: [{ field: 'Nome', from: 'Ana', to: 'Ana Ribeiro' }],
  children: [],
  ...overrides,
});

const page = (entries: HistoryEntry[], nextCursor?: string): HistoryPage => ({ entries, ...(nextCursor ? { nextCursor } : {}) });

const timeline = () => screen.findByRole('list', { name: 'Histórico de alterações' });

/** As entradas da linha do tempo, sem os itens das listas de campos dentro delas. */
const entries = async () => [...(await timeline()).querySelectorAll<HTMLElement>(':scope > li')];

/** Resposta que só chega quando o teste a solta. */
function deferred() {
  let resolve!: (response: Response) => void;
  const respond: FakeResponse = () => new Promise<Response>((done) => (resolve = done));
  return { respond, release: (body: unknown) => resolve(Response.json(body)) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('RecordHistory', () => {
  it('mostra cada save com título, autor e campos alterados, mais nova primeiro', async () => {
    renderHistory({
      [historyPath]: page([
        entry({ changeId: '2', title: 'Nome alterado', author: 'Rafael Tavares' }),
        entry({ changeId: '1', title: 'E-mail alterado', author: 'Sistema', changes: [{ field: 'E-mail', from: null, to: 'ana@gv.com.br' }] }),
      ]),
    });
    const [newest, oldest] = await entries();
    expect(within(newest!).getByText('Nome alterado')).toBeInTheDocument();
    expect(within(newest!).getByText('Rafael Tavares')).toBeInTheDocument();
    expect(within(newest!).getByText('Ana Ribeiro').tagName).toBe('INS');
    expect(within(oldest!).getByText('E-mail alterado')).toBeInTheDocument();
    expect(within(oldest!).getByText('Sistema')).toBeInTheDocument();
  });

  it.each([
    ['America/Sao_Paulo', '24/07 · 14h30'],
    ['America/Cuiaba', '24/07 · 13h30'],
  ])('formata o instante no fuso do navegador (%s)', async (timeZone, shown) => {
    vi.stubEnv('TZ', timeZone);
    renderHistory({ [historyPath]: page([entry({ at: '2026-07-24T17:30:00.000Z' })]) });
    expect(within(await timeline()).getByText(shown)).toBeInTheDocument();
  });

  it('a entrada de cadastro traz os valores iniciais recolhidos, abertos por "Ver valores iniciais"', async () => {
    const user = userEvent.setup();
    renderHistory({
      [historyPath]: page([entry({ kind: 'created', title: 'Usuário cadastrado', changes: [{ field: 'Nome', from: null, to: 'Ana Ribeiro' }] })]),
    });
    const list = await timeline();
    expect(within(list).getByText('Ana Ribeiro')).not.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ver valores iniciais' }));
    expect(within(list).getByText('Ana Ribeiro')).toBeVisible();
  });

  it('só a entrada de cadastro nasce recolhida', async () => {
    renderHistory({ [historyPath]: page([entry({ kind: 'deleted', title: 'Usuário excluído' })]) });
    const list = await timeline();
    expect(screen.queryByRole('button', { name: 'Ver valores iniciais' })).not.toBeInTheDocument();
    expect(within(list).getByText('Ana Ribeiro')).toBeVisible();
  });

  it('texto longo ganha "Ver tudo"', async () => {
    renderHistory({
      [historyPath]: page([entry({ changes: [{ field: 'Observações', from: 'Antes', to: 'Depois', long: true }] })]),
    });
    await timeline();
    expect(screen.getByRole('button', { name: 'Ver tudo' })).toBeInTheDocument();
  });

  it('cada filho alterado no mesmo save é uma linha própria da entrada', async () => {
    renderHistory({
      [historyPath]: page([
        entry({
          title: '2 alterações',
          children: [
            { title: 'Documento adicionado: Matrícula 12.345', changes: [{ field: 'Tipo', from: null, to: 'Matrícula' }] },
            { title: 'Foto removida', changes: [] },
          ],
        }),
      ]),
    });
    const [only] = await entries();
    expect(within(only!).getByText('Documento adicionado: Matrícula 12.345')).toBeInTheDocument();
    expect(within(only!).getByText('Foto removida')).toBeInTheDocument();
    expect(within(only!).getByText('Matrícula').tagName).toBe('INS');
  });

  it('"Carregar mais" busca a página seguinte pelo cursor e some na última', async () => {
    const user = userEvent.setup();
    const fake = renderHistory({
      [historyPath]: page([entry({ changeId: '2', title: 'Nome alterado' })], 'c2'),
      [`${historyPath}?cursor=c2`]: page([entry({ changeId: '1', title: 'Usuário cadastrado', kind: 'created' })]),
    });
    await timeline();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Usuário cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Nome alterado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
    expect(fake.requests.filter((request) => request.path === historyPath)).toHaveLength(2);
  });

  it('sem `nextCursor` na primeira página, não há "Carregar mais"', async () => {
    renderHistory({ [historyPath]: page([entry()]) });
    await timeline();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('enquanto carrega, anuncia o carregamento', async () => {
    const response = deferred();
    renderHistory({ [historyPath]: response.respond });
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando');
    response.release(page([entry()]));
    await timeline();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('registro sem alterações registradas mostra o vazio', async () => {
    renderHistory({ [historyPath]: page([]) });
    expect(await screen.findByText('Nenhuma alteração registrada')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Histórico de alterações' })).not.toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro, e "Tentar de novo" busca outra vez', async () => {
    const user = userEvent.setup();
    let fail = true;
    renderHistory({ [historyPath]: () => (fail ? new Response(null, { status: 500 }) : Response.json(page([entry()]))) });

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await timeline()).toBeInTheDocument();
  });

  it('falha ao carregar mais mantém as entradas e oferece tentar de novo', async () => {
    const user = userEvent.setup();
    let fail = true;
    renderHistory({
      [historyPath]: page([entry({ title: 'Nome alterado' })], 'c2'),
      [`${historyPath}?cursor=c2`]: () =>
        fail ? new Response(null, { status: 500 }) : Response.json(page([entry({ changeId: '0', title: 'Usuário cadastrado' })])),
    });
    await timeline();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar mais alterações');
    expect(screen.getByText('Nome alterado')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Usuário cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('registro invisível (404) segue o tratamento de registro não encontrado da empresa', async () => {
    renderHistory({});
    expect(await screen.findByText('Registro não encontrado')).toBeInTheDocument();
  });
});
