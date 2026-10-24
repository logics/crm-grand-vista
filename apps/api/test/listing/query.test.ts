// As peças puras da consulta paginada: ordenação e busca entram, SQL sai. A
// prova contra o banco — busca sem acento, total com escopo, página além do
// fim — está em `query.integration.test.ts`.
import { PgDialect, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { defineList, escapeLike, listOrderBy, searchClause } from '../../src/listing/query.js';

const records = pgTable('records', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city'),
  totalAreaHa: numeric('total_area_ha'),
});
const dialect = new PgDialect();
const render = (clause: SQL | undefined) => (clause ? dialect.sqlToQuery(clause) : undefined);
const renderOrderBy = (orderBy: SQL[]) => render(sql.join(orderBy, sql`, `))?.sql;

const list = defineList({
  table: records,
  sortable: { name: records.name, totalAreaHa: records.totalAreaHa },
  searchable: [records.name, records.city],
});

describe('ordenação da listagem', () => {
  it('termina em id depois do campo pedido', () => {
    expect(renderOrderBy(listOrderBy(list, 'name'))).toBe('"records"."name" asc, "records"."id" asc');
  });

  it('decrescente com -campo, ainda desempatando por id', () => {
    expect(renderOrderBy(listOrderBy(list, '-totalAreaHa'))).toBe(
      '"records"."total_area_ha" desc, "records"."id" asc',
    );
  });

  it('sem sort e sem padrão declarado, ordena só por id', () => {
    expect(renderOrderBy(listOrderBy(list, undefined))).toBe('"records"."id" asc');
  });

  it('sem sort, aplica o padrão da lista e termina em id', () => {
    const byName = defineList({ ...list, defaultSort: '-name' });

    expect(renderOrderBy(listOrderBy(byName, undefined))).toBe('"records"."name" desc, "records"."id" asc');
  });
});

describe('busca textual da listagem', () => {
  it('compara sem acento e sem caixa em cada coluna declarada', () => {
    expect(render(searchClause(list, 'joao'))).toMatchObject({
      sql: '(unaccent("records"."name") ilike unaccent($1) or unaccent("records"."city") ilike unaccent($2))',
      params: ['%joao%', '%joao%'],
    });
  });

  it('sem busca, não recorta', () => {
    expect(searchClause(list, undefined)).toBeUndefined();
  });

  it('lista sem coluna pesquisável ignora a busca', () => {
    expect(searchClause(defineList({ ...list, searchable: [] }), 'joao')).toBeUndefined();
  });

  it('curinga digitado é texto, não padrão', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });
});
