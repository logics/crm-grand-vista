// A migration da semente de contatos contra o Postgres real: a empresa existente
// recebe as origens e as classificações, reaplicar não duplica, e o nome que a
// empresa já cadastrou (com outra caixa ou acento) não é inserido de novo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
const seedSql = readFileSync(join(MIGRATIONS_FOLDER, '0019_contacts_seed.sql'), 'utf8');

describe('migration da semente de contatos em empresa existente', () => {
  const tenantId = '0197c000-0000-7000-8000-000000000019';

  /** Nomes da tabela na empresa de teste (a policy vale também para o dono). */
  const namesOf = async (table: string): Promise<string[]> => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    return (await owner.query(`select name from ${table} order by name`)).rows.map((row) => row.name as string);
  };

  beforeAll(async () => {
    await owner.connect();
    await owner.query(`insert into tenants (id, slug, name) values ($1, 'antiga-contatos', 'Antiga') on conflict do nothing`, [
      tenantId,
    ]);
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    // Cadastradas à mão antes da migration: outra caixa e outro acento.
    await owner.query(`insert into lead_sources (id, tenant_id, name) values (uuidv7(), $1, 'indicacao')`, [tenantId]);
    await owner.query(`insert into contact_classifications (id, tenant_id, name) values (uuidv7(), $1, 'a')`, [tenantId]);
  });

  afterAll(async () => {
    await owner.query(`select set_config('app.tenant_id', $1, false)`, [tenantId]);
    for (const table of ['lead_sources', 'contact_classifications']) await owner.query(`delete from ${table}`);
    await owner.query(`delete from tenants where id = $1`, [tenantId]);
    await owner.end();
  });

  it('semeia o que falta, poupa o nome que a empresa já tem e reaplicar não duplica', async () => {
    await owner.query(seedSql);
    await owner.query(seedSql);

    const sources = await namesOf('lead_sources');
    expect(sources).toHaveLength(TENANT_SEED.leadSources.length);
    expect(sources).toContain('indicacao');
    expect(sources).not.toContain('Indicação');
    expect(sources).toEqual(expect.arrayContaining(['Evento', 'Instagram', 'Placa na fazenda', 'Site', 'WhatsApp']));

    const classifications = await namesOf('contact_classifications');
    expect(classifications).toEqual(['B', 'C', 'a']);
  });
});
