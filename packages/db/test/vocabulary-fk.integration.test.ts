// Guarda das FKs para cadastro auxiliar: toda FK para uma tabela do registro de
// `@crm/shared` é `ON DELETE RESTRICT`. É o que garante às specs consumidoras
// que o banco recusa excluir entrada em uso. A exceção — tabela de campo extra
// do próprio cadastro — vem do registro, não de uma lista neste teste.
import { loadMigrationEnv } from '@crm/shared/env';
import { VOCABULARIES } from '@crm/shared';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findVocabularyFkViolations } from './support/schema-sweep.js';

const vocabularies = Object.values(VOCABULARIES) as readonly {
  table: string;
  extraFieldTables?: readonly string[];
}[];
const VOCABULARY_TABLES = vocabularies.map((vocabulary) => vocabulary.table);
const EXTRA_FIELD_TABLES = vocabularies.flatMap((vocabulary) => vocabulary.extraFieldTables ?? []);

describe('FKs para cadastros auxiliares', () => {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

  beforeAll(() => owner.connect());
  afterAll(() => owner.end());

  /** Roda a varredura com o DDL aplicado numa transação que é sempre desfeita. */
  const sweepWith = async (ddl: string, extras: readonly string[] = EXTRA_FIELD_TABLES): Promise<string[]> => {
    await owner.query('begin');
    try {
      await owner.query(ddl);
      return await findVocabularyFkViolations(owner, VOCABULARY_TABLES, extras);
    } finally {
      await owner.query('rollback');
    }
  };

  const consumer = (action: string) =>
    `create table consumer (id uuid primary key, crop_id uuid references crops(id) ${action});`;

  it('o schema real não tem FK para cadastro que não seja RESTRICT', async () => {
    expect(await findVocabularyFkViolations(owner, VOCABULARY_TABLES, EXTRA_FIELD_TABLES)).toEqual([]);
  });

  it('o registro tem cadastros sob a varredura', () => {
    expect(VOCABULARY_TABLES.length).toBeGreaterThanOrEqual(7);
  });

  it.each(['on delete cascade', 'on delete set null', 'on delete set default', ''])(
    'falha diante de FK "%s"',
    async (action) => {
      const violations = await sweepWith(consumer(action));

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(/^consumer\.consumer_crop_id_fkey -> crops/);
    },
  );

  it('aceita FK RESTRICT', async () => {
    expect(await sweepWith(consumer('on delete restrict'))).toEqual([]);
  });

  it('aceita CASCADE só na tabela de campo extra declarada no registro', async () => {
    const ddl = consumer('on delete cascade');

    expect(await sweepWith(ddl, [...EXTRA_FIELD_TABLES, 'consumer'])).toEqual([]);
    expect(await sweepWith(ddl)).toHaveLength(1);
  });
});
