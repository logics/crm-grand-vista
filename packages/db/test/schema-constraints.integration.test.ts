// Garantias que o modelo de dados põe no banco, e não na aplicação.
import { loadApiEnv } from '@crm/shared/env';
import { LEVELS } from '@crm/shared';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, createTenantWithBusinessData, createUser } from './support/fixtures.js';
import { createDatabase } from '../src/database.js';
import { createPool } from '../src/pool.js';
import { memberships, users } from '../src/schema/index.js';

/** Código do Postgres para violação de unicidade. */
const UNIQUE_VIOLATION = '23505';

describe('constraints do schema da Fase 0', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  let tenantA: string;
  let tenantB: string;

  const link = (userId: string, tenantId: string, isDefault: boolean) =>
    db.semTenant({ reason: 'cli' }, (tx) => tx.insert(memberships).values({ userId, tenantId, isDefault }));

  beforeAll(async () => {
    tenantA = await createTenant(db, 'constraints-a');
    tenantB = await createTenant(db, 'constraints-b');
  });

  afterAll(() => pool.end());

  describe('users', () => {
    it('nasce com is_super_admin falso', async () => {
      const userId = await createUser(db, 'Usuário comum');

      const rows = await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.select({ isSuperAdmin: users.isSuperAdmin }).from(users).where(eq(users.id, userId)),
      );

      expect(rows).toEqual([{ isSuperAdmin: false }]);
    });

    it('is_super_admin é boolean NOT NULL DEFAULT false', async () => {
      const { rows } = await pool.query(
        `select data_type, is_nullable, column_default
           from information_schema.columns
          where table_schema = 'public' and table_name = 'users' and column_name = 'is_super_admin'`,
      );

      expect(rows).toEqual([{ data_type: 'boolean', is_nullable: 'NO', column_default: 'false' }]);
    });
  });

  describe('memberships', () => {
    it('recusa o mesmo vínculo usuário↔empresa duas vezes', async () => {
      const userId = await createUser(db, 'Vínculo duplicado');
      await link(userId, tenantA, false);

      await expect(link(userId, tenantA, false)).rejects.toMatchObject({
        cause: { code: UNIQUE_VIOLATION, constraint: 'memberships_user_id_tenant_id_unique' },
      });
    });

    it('recusa duas empresas padrão para o mesmo usuário', async () => {
      const userId = await createUser(db, 'Duas padrão');
      await link(userId, tenantA, true);

      await expect(link(userId, tenantB, true)).rejects.toMatchObject({
        cause: { code: UNIQUE_VIOLATION, constraint: 'memberships_user_id_default_unique' },
      });
    });

    it('aceita vários vínculos com no máximo um padrão', async () => {
      const userId = await createUser(db, 'Vários vínculos');
      const tenantC = await createTenant(db, 'constraints-c');
      await link(userId, tenantA, true);
      await link(userId, tenantB, false);
      await link(userId, tenantC, false);

      const rows = await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.select({ isDefault: memberships.isDefault }).from(memberships).where(eq(memberships.userId, userId)),
      );

      expect(rows.filter((row) => row.isDefault)).toHaveLength(1);
      expect(rows).toHaveLength(3);
    });

    it('a mesma empresa pode ser a padrão de usuários diferentes', async () => {
      const first = await createUser(db, 'Primeiro');
      const second = await createUser(db, 'Segundo');

      await link(first, tenantA, true);
      await expect(link(second, tenantA, true)).resolves.toBeDefined();
    });
  });

  describe('farms', () => {
    const CHECK_VIOLATION = '23514';
    const LEVEL_COLUMNS = ['sales_potential', 'priority', 'water_availability', 'irrigation_potential', 'productive_potential'];

    let farmsTenant: string;

    beforeAll(async () => {
      farmsTenant = await createTenantWithBusinessData(db, 'constraints-farms');
    });

    const setColumn = (column: string, value: string | null) =>
      db.withTenant(farmsTenant, (tx) => tx.execute(sql`update farms set ${sql.identifier(column)} = ${value}`));

    it.each(LEVEL_COLUMNS)('%s recusa valor fora de LEVELS', async (column) => {
      await expect(setColumn(column, 'altissima')).rejects.toMatchObject({
        cause: { code: CHECK_VIOLATION, constraint: `farms_${column}_check` },
      });
    });

    it.each(LEVEL_COLUMNS)('%s aceita cada valor de LEVELS e nulo', async (column) => {
      for (const value of [...LEVELS, null]) await expect(setColumn(column, value)).resolves.toBeDefined();
    });
  });
});
