import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, listPageSchema, listQuerySchema, parseSort } from '../src/listing.js';

const farmsQuery = listQuerySchema({
  sortable: ['name', 'totalAreaHa'],
  filters: { uf: z.string().length(2).optional() },
});

describe('schema base de listagem', () => {
  it('aplica os padrões quando nada vem na URL', () => {
    expect(farmsQuery.parse({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });

  it('converte os parâmetros de texto da URL', () => {
    expect(farmsQuery.parse({ page: '3', pageSize: '50', sort: '-totalAreaHa', q: ' rio ' })).toEqual({
      page: 3,
      pageSize: 50,
      sort: '-totalAreaHa',
      q: 'rio',
    });
  });

  it.each(PAGE_SIZES)('aceita pageSize %i', (pageSize) => {
    expect(farmsQuery.parse({ pageSize: String(pageSize) }).pageSize).toBe(pageSize);
  });

  it.each(['10', '30', '1000', '0', 'abc'])('recusa pageSize %s', (pageSize) => {
    expect(farmsQuery.safeParse({ pageSize }).success).toBe(false);
  });

  it.each(['0', '-1', '1.5', 'abc'])('recusa page %s', (page) => {
    expect(farmsQuery.safeParse({ page }).success).toBe(false);
  });

  it.each(['name', '-name', 'totalAreaHa', '-totalAreaHa'])('aceita sort declarado %s', (sort) => {
    expect(farmsQuery.parse({ sort }).sort).toBe(sort);
  });

  it.each(['askingPrice', '-askingPrice', '+name', '--name', 'id', ''])('recusa sort não declarado %s', (sort) => {
    expect(farmsQuery.safeParse({ sort }).success).toBe(false);
  });

  it('busca vazia ou só com espaços é ausência de busca', () => {
    expect(farmsQuery.parse({ q: '   ' }).q).toBeUndefined();
  });

  it('compõe com os filtros do módulo', () => {
    expect(farmsQuery.parse({ uf: 'GO', page: '2' })).toEqual({ page: 2, pageSize: 25, uf: 'GO' });
    expect(farmsQuery.safeParse({ uf: 'Goiás' }).success).toBe(false);
  });

  it('sem filtros de módulo, só os parâmetros base', () => {
    const query = listQuerySchema({ sortable: ['name'] });

    expect(query.parse({ q: 'joao' })).toEqual({ page: 1, pageSize: 25, q: 'joao' });
  });
});

describe('parseSort', () => {
  it('separa o campo da direção', () => {
    expect(parseSort('name')).toEqual({ field: 'name', direction: 'asc' });
    expect(parseSort('-totalAreaHa')).toEqual({ field: 'totalAreaHa', direction: 'desc' });
  });
});

describe('resposta de listagem', () => {
  it('é { items, total, page, pageSize }', () => {
    const page = listPageSchema(z.object({ id: z.string() }));

    expect(page.parse({ items: [{ id: 'a' }], total: 1, page: 1, pageSize: 25 })).toEqual({
      items: [{ id: 'a' }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    expect(page.safeParse({ items: [], total: 0, page: 1, pageSize: 30 }).success).toBe(false);
  });
});
