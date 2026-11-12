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

describe('função normalize_text', () => {
  const app = new pg.Client({ connectionString: loadApiEnv().DATABASE_URL });
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

  beforeAll(() => Promise.all([owner.connect(), app.connect()]));
  afterAll(() => Promise.all([owner.end(), app.end()]));

  it('existe e é IMMUTABLE; o nome antigo não existe mais', async () => {
    const { rows } = await owner.query<{ proname: string; provolatile: string }>(
      `select proname, provolatile from pg_proc where proname in ('normalize_text', 'normalize_vocabulary_name')`,
    );

    expect(rows).toEqual([{ proname: 'normalize_text', provolatile: 'i' }]);
  });

  it('tira caixa e acento', async () => {
    const { rows } = await app.query<{ value: string }>(`select normalize_text('São José GOIÁS') as value`);

    expect(rows).toEqual([{ value: 'sao jose goias' }]);
  });

  it('os índices de unicidade dos cadastros auxiliares seguem usando a função renomeada', async () => {
    const { rows } = await owner.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where indexname = 'crops_tenant_id_name_unique'`,
    );

    expect(rows[0]?.indexdef).toContain('normalize_text(name)');
  });
});
