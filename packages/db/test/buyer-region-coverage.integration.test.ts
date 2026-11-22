// A cobertura de região do comprador contra o Postgres real: os quatro casos
// (UF↔UF, UF↔município, município↔UF, município↔município) e o que não casa.
import { loadMigrationEnv } from '@crm/shared/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buyerRegionCovers } from '../src/buyer-region-coverage.js';
import { contacts } from '../src/schema/index.js';

const RIO_VERDE = '5218805'; // GO
const JATAI = '5211909'; // GO
const UBERABA = '3170206'; // MG

describe('buyerRegionCovers', () => {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
  const tenantId = '0197c000-0000-7000-8000-000000000178';
  const ids = {
    ufGo: '0197c000-0000-7000-8000-000000001178',
    rioVerde: '0197c000-0000-7000-8000-000000002178',
    jatai: '0197c000-0000-7000-8000-000000003178',
    ufMg: '0197c000-0000-7000-8000-000000004178',
    uberaba: '0197c000-0000-7000-8000-000000005178',
    none: '0197c000-0000-7000-8000-000000006178',
  };

  /** Quem a cobertura devolve para as regiões pedidas, pelo nome do cenário. */
  const covered = async (...regions: string[]) => {
    const rows = await drizzle(owner).select({ id: contacts.id }).from(contacts).where(buyerRegionCovers(contacts.id, regions));
    return Object.entries(ids)
      .filter(([, id]) => rows.some((row) => row.id === id))
      .map(([name]) => name)
      .sort();
  };

  beforeAll(async () => {
    await owner.connect();
    await owner.query('begin');
    await owner.query(`insert into tenants (id, slug, name) values ($1, 'cobertura-regiao', 'Cobertura')`, [tenantId]);
    await owner.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
    for (const [name, id] of Object.entries(ids)) {
      await owner.query(`insert into contacts (id, tenant_id, person_type, name) values ($1, $2, 'pf', $3)`, [
        id,
        tenantId,
        name,
      ]);
    }
    const mark = (contact: string, column: 'uf' | 'municipality_ibge_code', value: string) =>
      owner.query(`insert into buyer_regions (id, tenant_id, contact_id, ${column}) values (uuidv7(), $1, $2, $3)`, [
        tenantId,
        contact,
        value,
      ]);
    await mark(ids.ufGo, 'uf', 'GO');
    await mark(ids.rioVerde, 'municipality_ibge_code', RIO_VERDE);
    await mark(ids.jatai, 'municipality_ibge_code', JATAI);
    await mark(ids.ufMg, 'uf', 'MG');
    await mark(ids.uberaba, 'municipality_ibge_code', UBERABA);
  });

  afterAll(async () => {
    await owner.query('rollback');
    await owner.end();
  });

  it('UF pedida: casa quem marcou a mesma UF (UF↔UF) e qualquer município dela (UF↔município)', async () => {
    expect(await covered('GO')).toEqual(['jatai', 'rioVerde', 'ufGo']);
  });

  it('município pedido: casa quem marcou a UF dele (município↔UF) e o próprio município (município↔município)', async () => {
    expect(await covered(RIO_VERDE)).toEqual(['rioVerde', 'ufGo']);
  });

  it('município pedido não casa outro município da mesma UF nem outra UF', async () => {
    const result = await covered(RIO_VERDE);
    expect(result).not.toContain('jatai');
    expect(result).not.toContain('ufMg');
    expect(result).not.toContain('uberaba');
  });

  it('várias regiões casam com qualquer uma delas', async () => {
    expect(await covered(RIO_VERDE, 'MG')).toEqual(['rioVerde', 'uberaba', 'ufGo', 'ufMg']);
  });

  it('comprador sem região não casa; lista vazia não casa ninguém', async () => {
    expect(await covered('GO', 'MG', RIO_VERDE, UBERABA)).not.toContain('none');
    expect(await covered()).toEqual([]);
  });
});
