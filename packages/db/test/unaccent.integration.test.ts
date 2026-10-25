// A extensão da busca textual das listagens: instalada pela migration, como
// crm_owner, e usável pelo crm_app sem grant à parte.
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('extensão unaccent', () => {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
  const app = new pg.Client({ connectionString: loadApiEnv().DATABASE_URL });

  beforeAll(() => Promise.all([owner.connect(), app.connect()]));
  afterAll(() => Promise.all([owner.end(), app.end()]));

  it('é instalada pela migration, com o crm_owner como dono', async () => {
    const { rows } = await owner.query<{ owner: string }>(
      `select extowner::regrole::text as owner from pg_extension where extname = 'unaccent'`,
    );

    expect(rows).toEqual([{ owner: 'crm_owner' }]);
  });

  it('o crm_app compara sem acento e sem caixa', async () => {
    const { rows } = await app.query<{ found: boolean }>(
      `select unaccent('São José do Rio Claro') ilike unaccent('%sao jose%') as found`,
    );

    expect(rows).toEqual([{ found: true }]);
  });
});
