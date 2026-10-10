// Wrapper de transação contra o Postgres real: o contexto da empresa vale só
// dentro da transação e nunca sobrevive na conexão devolvida ao pool.
import { loadApiEnv } from '@crm/shared/env';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAccessProfile, createTenant } from '../test/fixtures.js';
import { createDatabase, type Transaction } from './database.js';
import { createPool } from './pool.js';
import { accessProfiles, tenants } from './schema/index.js';

describe('wrapper de transação', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  let tenantA: string;
  let tenantB: string;
  let profileOfA: string;
  let profileOfB: string;

  const backendPid = async (tx: Transaction): Promise<number> => {
    const { rows } = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
    return rows[0]!.pid;
  };

  const activeTenant = async (tx: Transaction): Promise<string | null> => {
    const { rows } = await tx.execute<{ tenant: string | null }>(
      sql`select current_setting('app.tenant_id', true) as tenant`,
    );
    return rows[0]!.tenant;
  };

  beforeAll(async () => {
    tenantA = await createTenant(db, 'wrapper-a');
    tenantB = await createTenant(db, 'wrapper-b');
    profileOfA = await createAccessProfile(db, tenantA, 'Perfil da A');
    profileOfB = await createAccessProfile(db, tenantB, 'Perfil da B');
  });

  afterAll(() => pool.end());

  describe('withTenant', () => {
    it('aplica a empresa ativa na transação', async () => {
      const tenant = await db.withTenant(tenantA, activeTenant);

      expect(tenant).toBe(tenantA);
    });

    it('confirma a transação e devolve o resultado do callback', async () => {
      const id = await createAccessProfile(db, tenantA, 'Confirmado');

      const rows = await db.withTenant(tenantA, (tx) => tx.select().from(accessProfiles));
      expect(rows.map((row) => row.id)).toContain(id);
    });

    it('desfaz a transação quando o callback falha', async () => {
      const failing = db.withTenant(tenantA, async (tx) => {
        await tx.insert(accessProfiles).values({ tenantId: tenantA, name: 'Desfeito' });
        throw new Error('falha depois da escrita');
      });

      await expect(failing).rejects.toThrow('falha depois da escrita');

      const rows = await db.withTenant(tenantA, (tx) => tx.select().from(accessProfiles));
      expect(rows.map((row) => row.name)).not.toContain('Desfeito');
    });

    it('a transação seguinte na mesma conexão do pool não herda a empresa', async () => {
      // É o teste que pega a troca de SET LOCAL por SET: com SET, a empresa A
      // persistiria na conexão depois do COMMIT e a próxima requisição a herdaria.
      const pidWithTenant = await db.withTenant(tenantA, backendPid);

      const next = await db.semTenant({ reason: 'login' }, async (tx) => ({
        pid: await backendPid(tx),
        tenant: await activeTenant(tx),
        rows: await tx.select().from(accessProfiles),
      }));

      expect(next.pid, 'as duas transações usaram a mesma conexão').toBe(pidWithTenant);
      expect(next.tenant).not.toBe(tenantA);
      expect(next.rows).toEqual([]);
    });

    it('uma consulta direta na conexão devolvida ao pool não herda a empresa', async () => {
      const pidWithTenant = await db.withTenant(tenantA, backendPid);

      const client = await pool.connect();
      try {
        const { rows: pid } = await client.query<{ pid: number }>('select pg_backend_pid() as pid');
        const { rows } = await client.query('select * from access_profiles');

        expect(pid[0]?.pid, 'a consulta usou a mesma conexão').toBe(pidWithTenant);
        expect(rows).toEqual([]);
      } finally {
        client.release();
      }
    });

    it('a transação seguinte com outra empresa só enxerga a própria', async () => {
      const pidOfA = await db.withTenant(tenantA, backendPid);

      const next = await db.withTenant(tenantB, async (tx) => ({
        pid: await backendPid(tx),
        rows: await tx.select().from(accessProfiles),
      }));

      expect(next.pid, 'as duas transações usaram a mesma conexão').toBe(pidOfA);
      expect(next.rows.map((row) => row.id)).toEqual([profileOfB]);
    });
  });

  describe('semTenant', () => {
    it('sem empresa, lê tabela fora do RLS e nenhuma linha de tabela de negócio', async () => {
      const result = await db.semTenant({ reason: 'login' }, async (tx) => ({
        tenants: await tx.select({ id: tenants.id }).from(tenants),
        profiles: await tx.select().from(accessProfiles),
      }));

      expect(result.tenants.map((row) => row.id)).toEqual(expect.arrayContaining([tenantA, tenantB]));
      expect(result.profiles).toEqual([]);
    });

    it('no caminho do super admin, aplica a empresa inspecionada', async () => {
      const tenant = await db.semTenant({ reason: 'super_admin', tenantId: tenantB }, activeTenant);

      expect(tenant).toBe(tenantB);
    });

    it('no caminho do super admin, não retorna linhas de duas empresas', async () => {
      const rows = await db.semTenant({ reason: 'super_admin', tenantId: tenantB }, (tx) =>
        tx.select().from(accessProfiles),
      );

      expect(rows.map((row) => row.id)).toEqual([profileOfB]);
      expect(rows.map((row) => row.id)).not.toContain(profileOfA);
    });
  });
});
