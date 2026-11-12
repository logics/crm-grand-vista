import { LEVELS } from '@crm/shared';
import { PgDialect, getTableConfig, pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { levelCheck } from '../src/schema/levels.js';

const sample = pgTable('sample', { rating: text('rating') }, (t) => [levelCheck(t.rating)]);

describe('levelCheck', () => {
  const [check] = getTableConfig(sample).checks;
  const rendered = check ? new PgDialect().sqlToQuery(check.value) : null;

  it('nomeia o CHECK pela tabela e pela coluna', () => {
    expect(check?.name).toBe('sample_rating_check');
  });

  it('aceita exatamente high, medium e low', () => {
    expect(rendered?.sql).toBe(`"sample"."rating" in ('high', 'medium', 'low')`);
  });

  it('aceita exatamente os valores de LEVELS, como literais (DDL não aceita parâmetro)', () => {
    expect(rendered?.params).toEqual([]);
    expect(rendered?.sql).toBe(`"sample"."rating" in (${LEVELS.map((level) => `'${level}'`).join(', ')})`);
  });
});
