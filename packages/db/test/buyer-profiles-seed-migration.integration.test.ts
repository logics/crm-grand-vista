// A semente da migration `0026_buyer_profiles` contra o Postgres real: a
// empresa existente recebe as duas listas, aplicar **duas vezes** não duplica, e
// o nome já cadastrado à mão (outra caixa, sem acento) não é inserido de novo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
// Só o bloco da semente (o DDL das tabelas já foi aplicado pelo setup).
const migration = readFileSync(join(MIGRATIONS_FOLDER, '0026_buyer_profiles.sql'), 'utf8');
const seedSql = migration.slice(migration.indexOf('DO $$'));

describe('migration da semente de perfis de compra em empresa existente', () => {
  const tenantId = '0197c000-0000-7000-8000-000000000026';

  const namesOf = async (table: string): Promise<string[]> => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    return (await owner.query(`select name from ${table} order by name collate "pt-BR-x-icu"`)).rows.map(
      (row) => row.name as string,
    );
  };

  beforeAll(async () => {
    await owner.connect();
    await owner.query(
      `insert into tenants (id, slug, name) values ($1, 'antiga-perfil-compra', 'Antiga') on conflict do nothing`,
      [tenantId],
    );
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    // Criadas à mão antes da migration: outra caixa e sem acento.
    await owner.query(`insert into payment_methods (id, tenant_id, name) values (uuidv7(), $1, 'a vista')`, [tenantId]);
    await owner.query(`insert into purchase_profiles (id, tenant_id, name) values (uuidv7(), $1, 'investidor')`, [tenantId]);
  });

  afterAll(async () => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    for (const table of ['payment_methods', 'purchase_profiles']) await owner.query(`delete from ${table}`);
    await owner.query(`delete from tenants where id = $1`, [tenantId]);
    await owner.end();
  });

  it('semeia o que falta, poupa o nome que a empresa já tem e aplicar duas vezes não duplica', async () => {
    await owner.query(seedSql);
    await owner.query(seedSql);

    const methods = await namesOf('payment_methods');
    expect(methods).toHaveLength(TENANT_SEED.paymentMethods.length);
    expect(methods).toContain('a vista');
    expect(methods).not.toContain('À vista');
    expect(methods).toEqual(expect.arrayContaining(['Financiamento', 'Parcelado', 'Permuta']));

    const profiles = await namesOf('purchase_profiles');
    expect(profiles).toHaveLength(TENANT_SEED.purchaseProfiles.length);
    expect(profiles).toContain('investidor');
    expect(profiles).not.toContain('Investidor');
    expect(profiles).toEqual(expect.arrayContaining(['Especulador', 'Produtor']));
  });
});
