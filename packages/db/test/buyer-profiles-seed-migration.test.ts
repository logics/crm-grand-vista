// A semente de perfis de compra e formas de pagamento está na migration
// `0026_buyer_profiles` (SQL escrito à mão no fim do arquivo); a constante de
// `@crm/shared` é a fonte. Este teste lê o SQL e exige os valores exatos dela.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const file = readdirSync(MIGRATIONS_FOLDER).find((name) => name.endsWith('_buyer_profiles.sql'));
const sql = file ? readFileSync(join(MIGRATIONS_FOLDER, file), 'utf8') : '';

/** Os valores do VALUES do INSERT na tabela, na ordem em que aparecem. */
function seededNames(table: string): string[] {
  const insert = new RegExp(`INSERT INTO "${table}"[^;]*?VALUES\\s*(.*?)\\s+AS\\s`, 's').exec(sql);
  expect(insert, `INSERT em ${table}`).not.toBeNull();
  return [...insert![1]!.matchAll(/\('((?:[^']|'')*)'\)/g)].map(([, value]) => value!.replaceAll("''", "'"));
}

describe('migration da semente de perfis de compra', () => {
  it('existe', () => {
    expect(file).toBeDefined();
  });

  it('semeia os perfis de compra da constante', () => {
    expect(seededNames('purchase_profiles')).toEqual([...TENANT_SEED.purchaseProfiles]);
  });

  it('semeia as formas de pagamento da constante', () => {
    expect(seededNames('payment_methods')).toEqual([...TENANT_SEED.paymentMethods]);
  });

  it.each(['purchase_profiles', 'payment_methods'])('%s é idempotente: ON CONFLICT DO NOTHING', (table) => {
    expect(new RegExp(`INSERT INTO "${table}"[^;]*ON CONFLICT DO NOTHING;`, 's').test(sql)).toBe(true);
  });
});
