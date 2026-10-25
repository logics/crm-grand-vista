// @vitest-environment jsdom
import '../support/dom.js';
import { type ListPage as ListPageResult, listQuerySchema } from '@crm/shared';
import { belowQuery, Card } from '@crm/ui';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ListPage } from '../../src/listing/list-page.js';
import type { ListQueryState } from '../../src/listing/list-query.js';
import { session, stubFakeApi } from '../support/fake-api.js';
import { renderApp } from '../support/render-app.js';

type Farm = { id: number; name: string; city: string };

const schema = listQuerySchema({
  sortable: ['name'],
  filters: { state: z.enum(['GO', 'MT']).optional() },
});

type Query = z.output<typeof schema>;

const farms = (count: number, offset = 0): Farm[] =>
  Array.from({ length: count }, (_, i) => ({ id: offset + i + 1, name: `Fazenda ${offset + i + 1}`, city: 'Rio Verde, GO' }));

/** A busca simulada do módulo: o que a lista pediu, e a resposta que o teste der. */
const fetchPage = vi.fn<(slug: string, query: Query) => Promise<ListPageResult<Farm>>>();

const page = (items: Farm[], total: number, query: Pick<Query, 'page' | 'pageSize'> = { page: 1, pageSize: 25 }) =>
  Promise.resolve({ items, total, ...query });

/** Responde a cada pedido com a fatia de `total` fazendas que ele pede. */
function serveFarms(total: number) {
  fetchPage.mockImplementation((_slug, query) =>
    page(farms(Math.max(0, Math.min(query.pageSize, total - (query.page - 1) * query.pageSize)), (query.page - 1) * query.pageSize), total, query),
  );
}

function StateFilter({ query, update }: ListQueryState<typeof schema>) {
  return (
    <button type="button" aria-pressed={query.state === 'GO'} onClick={() => update({ state: 'GO' })}>
      Só Goiás
    </button>
  );
}

function FarmsPage() {
  return (
    <ListPage
      schema={schema}
      queryKey={['farms']}
      fetchPage={fetchPage}
      searchPlaceholder="Buscar fazenda"
      columns={[
        { key: 'name', label: 'Fazenda', strong: true, sortable: true },
        { key: 'city', label: 'Município', muted: true },
      ]}
      renderCard={(farm) => <Card title={farm.name} subtitle={farm.city} />}
      empty={{ title: 'Nenhuma fazenda cadastrada', description: 'Cadastre a primeira fazenda da carteira.' }}
    >
      {(list) => <StateFilter {...list} />}
    </ListPage>
  );
}

function renderList(search = '') {
  stubFakeApi({ session: session() });
  return renderApp(`/e/grand-vista/farms${search}`, { tenantPages: [{ path: 'farms', element: <FarmsPage /> }] });
}

const lastQuery = () => fetchPage.mock.lastCall?.[1];

const table = () => screen.findByRole('table');

beforeEach(() => {
  fetchPage.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('página de lista', () => {
  it('mostra o carregando até a busca responder, e então os registros', async () => {
    let respond!: (result: ListPageResult<Farm>) => void;
    fetchPage.mockReturnValue(new Promise((resolve) => (respond = resolve)));
    renderList();

    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…');
    expect(fetchPage).toHaveBeenCalledWith('grand-vista', { page: 1, pageSize: 25 });

    respond({ items: farms(2), total: 2, page: 1, pageSize: 25 });
    expect(await screen.findByRole('cell', { name: 'Fazenda 2' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('página com itens: a tabela com as colunas do módulo e a paginação com o total', async () => {
    serveFarms(60);
    renderList();

    const rows = within(await table()).getAllByRole('row');
    expect(rows).toHaveLength(26);
    expect(within(rows[1]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Fazenda 1', 'Rio Verde, GO']);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toHaveTextContent('1–25 de 60');
  });

  it('vazia sem busca nem filtro: o estado vazio do módulo', async () => {
    fetchPage.mockReturnValue(page([], 0));
    renderList();

    expect(await screen.findByRole('heading', { name: 'Nenhuma fazenda cadastrada' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
  });

  it('vazia por causa da busca: diz que nada bate e limpa a busca e os filtros', async () => {
    fetchPage.mockReturnValue(page([], 0));
    const app = renderList('?q=xyz&state=GO&sort=name');

    expect(await screen.findByRole('heading', { name: 'Nenhum resultado' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Limpar busca e filtros' }));

    await waitFor(() => expect(app.router.state.location.search).toBe('?sort=name'));
    expect(screen.getByRole('searchbox', { name: 'Buscar fazenda' })).toHaveValue('');
  });

  it('falha na busca: o erro com a nova tentativa, que busca de novo', async () => {
    fetchPage.mockRejectedValueOnce(new Error('rede'));
    renderList();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar a lista');
    serveFarms(3);
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('cell', { name: 'Fazenda 3' })).toBeInTheDocument();
  });

  it('troca de página vai para a URL e busca a página nova', async () => {
    serveFarms(60);
    const app = renderList();

    await table();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Página 2' }));

    expect(await screen.findByRole('cell', { name: 'Fazenda 26' })).toBeInTheDocument();
    expect(app.router.state.location.search).toBe('?page=2');
    expect(lastQuery()).toEqual({ page: 2, pageSize: 25 });
  });

  it('troca de ordenação vai para a URL, volta à primeira página e marca a coluna', async () => {
    serveFarms(60);
    const app = renderList('?page=2');
    const user = userEvent.setup();

    await table();
    await user.click(screen.getByRole('button', { name: 'Fazenda' }));
    await waitFor(() => expect(app.router.state.location.search).toBe('?sort=name'));
    expect(screen.getByRole('columnheader', { name: 'Fazenda' })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Fazenda' }));
    await waitFor(() => expect(app.router.state.location.search).toBe('?sort=-name'));
    expect(screen.getByRole('columnheader', { name: 'Fazenda' })).toHaveAttribute('aria-sort', 'descending');
    expect(lastQuery()).toEqual({ page: 1, pageSize: 25, sort: '-name' });
  });

  it('troca do tamanho da página vai para a URL', async () => {
    serveFarms(60);
    const app = renderList();
    const user = userEvent.setup();

    await table();
    await user.click(screen.getByRole('combobox', { name: 'Itens por página' }));
    await user.click(await screen.findByRole('option', { name: '50' }));

    await waitFor(() => expect(app.router.state.location.search).toBe('?pageSize=50'));
    expect(lastQuery()).toEqual({ page: 1, pageSize: 50 });
  });

  it('a busca e os filtros do módulo vão para a URL', async () => {
    serveFarms(60);
    const app = renderList('?page=2');
    const user = userEvent.setup();

    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar fazenda' }), 'sao jose{Enter}');
    await waitFor(() => expect(app.router.state.location.search).toBe('?q=sao+jose'));
    await user.click(screen.getByRole('button', { name: 'Só Goiás' }));

    await waitFor(() => expect(app.router.state.location.search).toBe('?q=sao+jose&state=GO'));
    expect(screen.getByRole('button', { name: 'Só Goiás' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastQuery()).toEqual({ page: 1, pageSize: 25, q: 'sao jose', state: 'GO' });
  });

  it('voltar do navegador reabre a lista anterior, com a busca no campo', async () => {
    serveFarms(60);
    const app = renderList('?q=rio');

    await table();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(app.router.state.location.search).toBe('?page=2&q=rio'));
    await app.router.navigate(-1);

    expect(await screen.findByRole('cell', { name: 'Fazenda 1' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar fazenda' })).toHaveValue('rio');
  });

  it('parâmetro inválido na URL cai no padrão em vez de quebrar a tela', async () => {
    serveFarms(3);
    renderList('?page=abc&pageSize=7&sort=senha&state=SP');

    expect(await screen.findByRole('cell', { name: 'Fazenda 1' })).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledWith('grand-vista', { page: 1, pageSize: 25 });
  });

  it('página além do fim leva à última, sem nova entrada no histórico', async () => {
    serveFarms(30);
    const app = renderList('?page=9');

    expect(await screen.findByRole('cell', { name: 'Fazenda 26' })).toBeInTheDocument();
    expect(app.router.state.location.search).toBe('?page=2');
    expect(app.router.state.historyAction).toBe('REPLACE');
  });
});

describe('página de lista no mobile', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === belowQuery('mobile') || query === belowQuery('rail'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });

  it('mostra os cartões do módulo no lugar da tabela', async () => {
    serveFarms(2);
    renderList();

    const cards = within(await screen.findByRole('list', { name: 'Resultados' })).getAllByRole('listitem');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual(['Fazenda 1', 'Fazenda 2']);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
