// @vitest-environment jsdom
import '../support/dom.js';
import { listQuerySchema } from '@crm/shared';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isFilteredQuery, readListQuery, useListQuery, writeListQuery } from '../../src/listing/list-query.js';

const schema = listQuerySchema({
  sortable: ['name', 'totalAreaHa'],
  filters: { state: z.enum(['GO', 'MT']).optional(), minAreaHa: z.coerce.number().positive().optional() },
});

const read = (search: string) => readListQuery(schema, new URLSearchParams(search));

describe('readListQuery', () => {
  it('sem parâmetros, dá os padrões', () => {
    expect(read('')).toEqual({ page: 1, pageSize: 25 });
  });

  it('lê página, tamanho, ordenação, busca e filtros', () => {
    expect(read('page=3&pageSize=50&sort=-totalAreaHa&q=rio&state=GO&minAreaHa=100')).toEqual({
      page: 3,
      pageSize: 50,
      sort: '-totalAreaHa',
      q: 'rio',
      state: 'GO',
      minAreaHa: 100,
    });
  });

  it('parâmetro inválido cai no padrão sem levar os válidos junto', () => {
    expect(read('page=abc&pageSize=30&sort=-senha&state=SP&q=rio')).toEqual({ page: 1, pageSize: 25, q: 'rio' });
    expect(read('page=0&minAreaHa=-5&sort=name')).toEqual({ page: 1, pageSize: 25, sort: 'name' });
  });

  it('ignora parâmetro que a lista não conhece', () => {
    expect(read('utm=x&page=2')).toEqual({ page: 2, pageSize: 25 });
  });
});

describe('writeListQuery', () => {
  it('omite os padrões e o que não está preenchido', () => {
    expect(writeListQuery(schema, { page: 1, pageSize: 25 }).toString()).toBe('');
  });

  it('escreve o que difere do padrão, e a leitura devolve o mesmo', () => {
    const query = { page: 2, pageSize: 100 as const, sort: 'name' as const, q: 'são josé', state: 'MT' as const };
    const params = writeListQuery(schema, query);
    expect(params.toString()).toBe('page=2&pageSize=100&q=s%C3%A3o+jos%C3%A9&sort=name&state=MT');
    expect(readListQuery(schema, params)).toEqual(query);
  });
});

describe('isFilteredQuery', () => {
  it('busca ou filtro fora do padrão restringem a lista; página, tamanho e ordenação não', () => {
    expect(isFilteredQuery(schema, { page: 4, pageSize: 50, sort: 'name' })).toBe(false);
    expect(isFilteredQuery(schema, { page: 1, pageSize: 25, q: 'rio' })).toBe(true);
    expect(isFilteredQuery(schema, { page: 1, pageSize: 25, state: 'GO' })).toBe(true);
  });
});

/** O hook sob um roteador em memória, a partir de uma URL. */
function renderListQuery(path: string) {
  let router!: ReturnType<typeof createMemoryRouter>;
  const wrapper = ({ children }: { children: ReactNode }) => {
    router ??= createMemoryRouter([{ path: '/farms', element: children }], { initialEntries: [path] });
    return <RouterProvider router={router} />;
  };
  const hook = renderHook(() => useListQuery(schema), { wrapper });
  return { hook, search: () => router.state.location.search, router };
}

describe('useListQuery', () => {
  it('lê a lista da URL, com o inválido no padrão', () => {
    const { hook } = renderListQuery('/farms?page=2&sort=-totalAreaHa&q=rio&state=XX');
    expect(hook.result.current.query).toEqual({ page: 2, pageSize: 25, sort: '-totalAreaHa', q: 'rio' });
  });

  it('trocar a página a escreve na URL e mantém o resto', () => {
    const { hook, search } = renderListQuery('/farms?q=rio&page=2');
    act(() => hook.result.current.update({ page: 3 }));
    expect(search()).toBe('?page=3&q=rio');
    expect(hook.result.current.query.page).toBe(3);
  });

  it('trocar busca, ordenação, filtro ou tamanho volta à primeira página', () => {
    const { hook, search } = renderListQuery('/farms?page=4');
    act(() => hook.result.current.update({ sort: '-name' }));
    expect(search()).toBe('?sort=-name');
    act(() => hook.result.current.update({ page: 2 }));
    act(() => hook.result.current.update({ q: 'sao jose', state: 'GO' }));
    expect(search()).toBe('?q=sao+jose&sort=-name&state=GO');
    act(() => hook.result.current.update({ page: 2 }));
    act(() => hook.result.current.update({ pageSize: 50 }));
    expect(search()).toBe('?pageSize=50&q=sao+jose&sort=-name&state=GO');
  });

  it('limpar tira a busca e os filtros, mas guarda ordenação e tamanho', () => {
    const { hook, search } = renderListQuery('/farms?page=3&pageSize=50&sort=name&q=rio&state=GO');
    act(() => hook.result.current.clearFilters());
    expect(search()).toBe('?pageSize=50&sort=name');
  });

  it('escrever limpa da URL o parâmetro inválido', () => {
    const { hook, search } = renderListQuery('/farms?page=abc&sort=senha');
    act(() => hook.result.current.update({ q: 'rio' }));
    expect(search()).toBe('?q=rio');
  });

  it('cada troca é uma entrada do histórico: voltar reabre a lista anterior', async () => {
    const { hook, router } = renderListQuery('/farms?q=rio');
    act(() => hook.result.current.update({ page: 2 }));
    await act(() => router.navigate(-1));
    expect(hook.result.current.query).toEqual({ page: 1, pageSize: 25, q: 'rio' });
  });

  it('substituir troca a entrada atual em vez de criar outra', async () => {
    const { hook, router, search } = renderListQuery('/farms?q=rio');
    act(() => hook.result.current.update({ page: 2 }));
    act(() => hook.result.current.update({ page: 5 }, { replace: true }));
    expect(search()).toBe('?page=5&q=rio');
    await act(() => router.navigate(-1));
    expect(search()).toBe('?q=rio');
  });
});
