// A migration da semente é SQL escrito à mão; a constante de `@crm/shared` é a
// fonte. Este teste lê o SQL e exige que os valores sejam exatamente os dela.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const file = readdirSync(MIGRATIONS_FOLDER).find((name) => name.endsWith('_tenant_seed.sql'));
const sql = file ? readFileSync(join(MIGRATIONS_FOLDER, file), 'utf8') : '';

/** As tuplas `('a', 'b')` do VALUES do INSERT na tabela, na ordem em que aparecem. */
function seededRows(table: string): string[][] {
  const insert = new RegExp(`INSERT INTO "${table}"[^;]*?VALUES\\s*(.*?)\\s+AS\\s`, 's').exec(sql);
  expect(insert, `INSERT em ${table}`).not.toBeNull();
  return [...insert![1]!.matchAll(/\(([^()]*)\)/g)].map(([, tuple]) =>
    [...tuple!.matchAll(/'((?:[^']|'')*)'/g)].map(([, value]) => value!.replaceAll("''", "'")),
  );
}

describe('migration da semente da empresa', () => {
  it('existe', () => {
    expect(file).toBeDefined();
  });

  it('semeia os status comerciais da constante, na ordem', () => {
    expect(seededRows('commercial_statuses')).toEqual(
      TENANT_SEED.commercialStatuses.map(({ name, systemMeaning }) => [name, systemMeaning]),
    );
  });

  it('semeia as categorias de documento da constante', () => {
    expect(seededRows('document_categories')).toEqual(TENANT_SEED.documentCategories.map((name) => [name]));
  });

  it('semeia as culturas da constante', () => {
    expect(seededRows('crops')).toEqual(TENANT_SEED.crops.map((name) => [name]));
  });

  it('cria a linha de parâmetros com os defaults', () => {
    expect(sql).toMatch(/INSERT INTO "tenant_settings"/);
  });
});
