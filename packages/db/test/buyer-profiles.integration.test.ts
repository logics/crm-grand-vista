// Garantias das quatro tabelas do perfil de compra que ficam no banco: CHECKs,
// índices únicos (inclusive os parciais da região) e CASCADE do contato.
import { loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

describe('tabelas do perfil de compra', () => {
  const owner = new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
  const tenantId = '0197c000-0000-7000-8000-000000000175';
  const contactId = '0197c000-0000-7000-8000-000000001175';
  const otherContactId = '0197c000-0000-7000-8000-000000002175';

  /** A violação do SQL (código SQLSTATE), ou `null` se passou. */
  const failure = async (sql: string, params: unknown[] = []): Promise<string | null> => {
    await owner.query('savepoint attempt');
    try {
      await owner.query(sql, params);
      await owner.query('release savepoint attempt');
      return null;
    } catch (error) {
      await owner.query('rollback to savepoint attempt');
      return (error as { code: string }).code;
    }
  };

  const insertProfile = (columns: string, values: string) =>
    failure(`insert into buyer_profiles (id, tenant_id, contact_id, ${columns}) values (uuidv7(), $1, $2, ${values})`, [
      tenantId,
      contactId,
    ]);

  const insertRegion = (contact: string, columns: string, values: string) =>
    failure(`insert into buyer_regions (id, tenant_id, contact_id, ${columns}) values (uuidv7(), $1, $2, ${values})`, [
      tenantId,
      contact,
    ]);

  beforeAll(async () => {
    await owner.connect();
  });

  beforeEach(async () => {
    await owner.query('rollback');
    await owner.query('begin');
    await owner.query(
      `insert into tenants (id, slug, name) values ($1, 'perfil-compra-banco', 'Perfil') on conflict do nothing`,
      [tenantId],
    );
    await owner.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
    for (const id of [contactId, otherContactId]) {
      await owner.query(`insert into contacts (id, tenant_id, person_type, name) values ($1, $2, 'pf', 'Comprador')`, [
        id,
        tenantId,
      ]);
    }
  });

  afterAll(async () => {
    await owner.query('rollback');
    await owner.query(`delete from tenants where id = $1`, [tenantId]);
    await owner.end();
  });

  describe('buyer_profiles', () => {
    it('recusa ticket médio acima do máximo', async () => {
      expect(await insertProfile('avg_ticket, max_ticket', '12000000, 8000000')).toBe(CHECK_VIOLATION);
    });

    it('recusa área mínima acima da máxima', async () => {
      expect(await insertProfile('min_area_ha, max_area_ha', '1500, 500')).toBe(CHECK_VIOLATION);
    });

    it('com um lado nulo, passa', async () => {
      expect(await insertProfile('avg_ticket', '12000000')).toBeNull();
    });

    it('um perfil só por contato', async () => {
      expect(await insertProfile('urgency', `'high'`)).toBeNull();
      expect(await insertProfile('urgency', `'low'`)).toBe(UNIQUE_VIOLATION);
    });

    it.each([
      ['urgency', `'urgente'`],
      ['qualification_level', `'tepido'`],
      ['avg_ticket', '0'],
      ['estimated_net_worth', '-1'],
    ])('recusa %s = %s', async (column, value) => {
      expect(await insertProfile(column, value)).toBe(CHECK_VIOLATION);
    });
  });

  describe('buyer_regions', () => {
    it('aceita a UF e o município do mesmo estado (os dois índices parciais)', async () => {
      expect(await insertRegion(contactId, 'uf', `'GO'`)).toBeNull();
      expect(await insertRegion(contactId, 'municipality_ibge_code', `'5218805'`)).toBeNull();
    });

    it('recusa UF repetida e município repetido no mesmo contato, mas não em outro', async () => {
      await insertRegion(contactId, 'uf', `'GO'`);
      await insertRegion(contactId, 'municipality_ibge_code', `'5218805'`);

      expect(await insertRegion(contactId, 'uf', `'GO'`)).toBe(UNIQUE_VIOLATION);
      expect(await insertRegion(contactId, 'municipality_ibge_code', `'5218805'`)).toBe(UNIQUE_VIOLATION);
      expect(await insertRegion(otherContactId, 'uf', `'GO'`)).toBeNull();
    });

    it('recusa município e UF juntos, e nenhum dos dois', async () => {
      expect(await insertRegion(contactId, 'municipality_ibge_code, uf', `'5218805', 'GO'`)).toBe(CHECK_VIOLATION);
      expect(await insertRegion(contactId, 'created_at', 'now()')).toBe(CHECK_VIOLATION);
    });

    it('recusa sigla que não é UF', async () => {
      expect(await insertRegion(contactId, 'uf', `'XX'`)).toBe(CHECK_VIOLATION);
    });
  });

  describe('buyer_crops e buyer_payment_methods', () => {
    it('recusam o par repetido', async () => {
      await owner.query(`insert into crops (id, tenant_id, name) values ('0197c000-0000-7000-8000-000000003175', $1, 'Soja')`, [
        tenantId,
      ]);
      await owner.query(
        `insert into payment_methods (id, tenant_id, name) values ('0197c000-0000-7000-8000-000000004175', $1, 'À vista')`,
        [tenantId],
      );
      const crop = `insert into buyer_crops (id, tenant_id, contact_id, crop_id) values (uuidv7(), $1, $2, '0197c000-0000-7000-8000-000000003175')`;
      const payment = `insert into buyer_payment_methods (id, tenant_id, contact_id, payment_method_id) values (uuidv7(), $1, $2, '0197c000-0000-7000-8000-000000004175')`;

      expect(await failure(crop, [tenantId, contactId])).toBeNull();
      expect(await failure(crop, [tenantId, contactId])).toBe(UNIQUE_VIOLATION);
      expect(await failure(payment, [tenantId, contactId])).toBeNull();
      expect(await failure(payment, [tenantId, contactId])).toBe(UNIQUE_VIOLATION);
    });
  });

  it('excluir o contato leva perfil e junções (CASCADE)', async () => {
    await insertProfile('urgency', `'high'`);
    await insertRegion(contactId, 'uf', `'GO'`);

    await owner.query('delete from contacts where id = $1', [contactId]);

    for (const table of ['buyer_profiles', 'buyer_regions']) {
      const { rows } = await owner.query(`select 1 from ${table} where contact_id = $1`, [contactId]);
      expect(rows).toEqual([]);
    }
  });
});
