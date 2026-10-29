// A carga do IBGE chega pelas migrations: banco zerado, sem depender da API do IBGE.
import { readFileSync } from 'node:fs';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MunicipalityRecord } from '../src/municipalities/types.js';

const snapshot: MunicipalityRecord[] = JSON.parse(
  readFileSync(new URL('../data/municipalities.json', import.meta.url), 'utf8'),
);

describe('carga de municípios', () => {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
  const app = new pg.Client({ connectionString: loadApiEnv().DATABASE_URL });

  beforeAll(() => Promise.all([owner.connect(), app.connect()]));
  afterAll(() => Promise.all([owner.end(), app.end()]));

  it('a tabela tem exatamente o conteúdo do snapshot', async () => {
    const { rows } = await owner.query<MunicipalityRecord>(
      `select ibge_code as "ibgeCode", name, uf, region from municipalities where active order by ibge_code`,
    );

    expect(rows).toEqual(snapshot);
  });

  it('nada fora do snapshot fica ativo e a contagem é a do IBGE', async () => {
    const { rows } = await owner.query<{ total: string; inactive: string }>(
      `select count(*) as total, count(*) filter (where not active) as inactive from municipalities`,
    );

    expect(Number(rows[0]!.total) - Number(rows[0]!.inactive)).toBe(snapshot.length);
    expect(snapshot.length).toBeGreaterThan(5500);
  });

  it('o crm_app lê, mas não escreve', async () => {
    await expect(app.query('select 1 from municipalities limit 1')).resolves.toBeDefined();
    await expect(app.query(`update municipalities set active = false`)).rejects.toThrow(/permission denied/);
  });
});
