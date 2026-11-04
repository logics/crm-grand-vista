// A migration da semente contra o Postgres real: empresa que existia antes dela
// recebe os cadastros e os parâmetros ao aplicá-la. O banco de teste já a aplicou
// do zero; aqui o SQL dela roda de novo sobre uma empresa que não foi semeada.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_SEED } from '@crm/shared';
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';

const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

/** O SQL da migration da semente, dividido nos blocos que o Drizzle aplica. */
const seedSql = readFileSync(join(MIGRATIONS_FOLDER, '0015_tenant_seed.sql'), 'utf8');

describe('migration da semente em empresa existente', () => {
  const tenantId = '0197c000-0000-7000-8000-000000000001';

  beforeAll(async () => {
    await owner.connect();
    // Empresa criada depois da migration do banco de teste: nasce sem semente.
    await owner.query(`insert into tenants (id, slug, name) values ($1, 'antiga-semente', 'Antiga') on conflict do nothing`, [
      tenantId,
    ]);
  });

  afterAll(() => owner.end());

  it('semeia a empresa existente ao aplicar, e reaplicar não duplica', async () => {
    await owner.query(seedSql);
    await owner.query(seedSql);

    const count = async (table: string) =>
      Number(
        (
          await owner.query(`select set_config('app.tenant_id', $1, false), (select count(*) from ${table}) as n`, [
            tenantId,
          ])
        ).rows[0].n,
      );
    expect(await count('crops')).toBe(TENANT_SEED.crops.length);
    expect(await count('document_categories')).toBe(TENANT_SEED.documentCategories.length);
    expect(await count('commercial_statuses')).toBe(TENANT_SEED.commercialStatuses.length);
    expect(await count('tenant_settings')).toBe(1);
  });
});
