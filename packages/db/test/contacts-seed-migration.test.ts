// A migration da semente de contatos é SQL escrito à mão; a constante de
// `@crm/shared` é a fonte. Este teste lê o SQL e exige que os valores sejam
// exatamente os dela, e que a inserção poupe o nome que a empresa já tem.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const file = readdirSync(MIGRATIONS_FOLDER).find((name) => name.endsWith('_contacts_seed.sql'));
const sql = file ? readFileSync(join(MIGRATIONS_FOLDER, file), 'utf8') : '';

/** Os valores do VALUES do INSERT na tabela, na ordem em que aparecem. */
function seededNames(table: string): string[] {
  const insert = new RegExp(`INSERT INTO "${table}"[^;]*?VALUES\\s*(.*?)\\s+AS\\s`, 's').exec(sql);
  expect(insert, `INSERT em ${table}`).not.toBeNull();
  return [...insert![1]!.matchAll(/\('((?:[^']|'')*)'\)/g)].map(([, value]) => value!.replaceAll("''", "'"));
}

/** O bloco do INSERT na tabela, até o `;`. */
const insertInto = (table: string) => new RegExp(`INSERT INTO "${table}"[^;]*;`, 's').exec(sql)?.[0] ?? '';

describe('migration da semente de contatos', () => {
  it('existe', () => {
    expect(file).toBeDefined();
  });

  it('semeia as origens do lead da constante', () => {
    expect(seededNames('lead_sources')).toEqual([...TENANT_SEED.leadSources]);
  });

  it('semeia as classificações do cliente da constante', () => {
    expect(seededNames('contact_classifications')).toEqual([...TENANT_SEED.contactClassifications]);
  });

  it.each(['lead_sources', 'contact_classifications'])(
    'não insere em %s o nome que a empresa já tem, sem caixa nem acento',
    (table) => {
      const block = insertInto(table);
      expect(block).toMatch(/WHERE NOT EXISTS/);
      expect(block).toMatch(/normalize_vocabulary_name\(existing\."name"\) = normalize_vocabulary_name\(seed\."name"\)/);
      expect(block).toMatch(/existing\."tenant_id" = tenant\."id"/);
    },
  );
});
