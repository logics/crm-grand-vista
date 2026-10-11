// Guarda do isolamento entre empresas. Vazamento entre empresas não dá erro —
// só vaza —, então cada teste aqui consulta de propósito SEM cláusula de filtro:
// o que está sendo validado é o RLS, não a query.
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { eq, sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAccessProfile, createTenant, createTenantWithBusinessData } from './support/fixtures.js';
import { listBusinessTables } from './support/schema-sweep.js';
import { createDatabase } from '../src/database.js';
import { createPool } from '../src/pool.js';
import { accessProfiles } from '../src/schema/index.js';

/** Código do Postgres para "new row violates row-level security policy". */
const RLS_VIOLATION = '42501';

/**
 * Tabelas de negócio cobertas abaixo — uma linha de cada em
 * `createTenantWithBusinessData`. O primeiro teste compara esta lista com a
 * introspecção do banco: tabela de negócio nova falha aqui até entrar nos dois.
 */
const BUSINESS_TABLES = ['access_profiles', 'audit_log', 'profile_data_scopes', 'profile_permissions', 'user_profiles'];

describe('isolamento entre empresas em todas as tabelas de negócio', () => {
  const { DATABASE_URL } = loadApiEnv();
  const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
  const pool = createPool(DATABASE_URL);
  const db = createDatabase(pool);

  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    tenantA = await createTenantWithBusinessData(db, 'todas-a');
    tenantB = await createTenantWithBusinessData(db, 'todas-b');
  });

  afterAll(() => pool.end());

  it('cobre todas as tabelas de negócio que existem no banco', async () => {
    expect(await listBusinessTables(pool)).toEqual(BUSINESS_TABLES);
  });

  describe.each(BUSINESS_TABLES)('%s', (table) => {
    const tenantsVisibleTo = async (tenantId: string): Promise<string[]> => {
      const { rows } = await db.withTenant(tenantId, (tx) =>
        tx.execute<{ tenant_id: string }>(sql`select tenant_id from ${sql.identifier(table)}`),
      );
      return rows.map((row) => row.tenant_id);
    };

    it('cada empresa só enxerga as próprias linhas num SELECT sem filtro', async () => {
      const visibleToA = await tenantsVisibleTo(tenantA);
      const visibleToB = await tenantsVisibleTo(tenantB);

      // Sem linha nenhuma o teste passaria sem o RLS fazer nada.
      expect(visibleToA.length, `${table} tem linha da empresa A`).toBeGreaterThan(0);
      expect(visibleToB.length, `${table} tem linha da empresa B`).toBeGreaterThan(0);
      expect(new Set(visibleToA)).toEqual(new Set([tenantA]));
      expect(new Set(visibleToB)).toEqual(new Set([tenantB]));
    });

    it('recusa INSERT com o tenant_id de outra empresa (WITH CHECK)', async () => {
      // Copia uma linha da própria empresa trocando só o `tenant_id`. O RLS é
      // avaliado antes das constraints: se o WITH CHECK deixasse passar, o erro
      // seria de chave duplicada, não este.
      const copyIntoB = db.withTenant(tenantA, (tx) =>
        tx.execute(sql`
          insert into ${sql.identifier(table)} overriding system value
          select (jsonb_populate_record(null::${sql.identifier(table)},
                    to_jsonb(r) || jsonb_build_object('tenant_id', ${tenantB}::text))).*
            from ${sql.identifier(table)} r
           limit 1
        `),
      );

      await expect(copyIntoB).rejects.toMatchObject({
        cause: {
          code: RLS_VIOLATION,
          message: `new row violates row-level security policy for table "${table}"`,
        },
      });
    });

    it('sem a variável de sessão definida devolve zero linhas, não exceção', async () => {
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      try {
        // Conexão nova: a variável nunca existiu (missing_ok).
        const fresh = await client.query(`select * from ${client.escapeIdentifier(table)}`);

        // Conexão que já teve empresa: o SET LOCAL confirmado deixa string vazia (nullif).
        await client.query('begin');
        await client.query(`select set_config('app.tenant_id', $1, true)`, [tenantA]);
        await client.query('commit');
        const reused = await client.query(`select * from ${client.escapeIdentifier(table)}`);

        expect(fresh.rows).toEqual([]);
        expect(reused.rows).toEqual([]);
      } finally {
        await client.end();
      }
    });

    it('filtra inclusive o dono da tabela (FORCE ROW LEVEL SECURITY)', async () => {
      const owner = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });
      await owner.connect();
      try {
        const { rows: role } = await owner.query<{ role: string }>('select current_user as role');
        const { rows } = await owner.query(`select * from ${owner.escapeIdentifier(table)}`);

        expect(role[0]?.role).toBe('crm_owner');
        expect(rows).toEqual([]);
      } finally {
        await owner.end();
      }
    });
  });
});

describe('isolamento entre empresas em access_profiles, pelo Drizzle', () => {
  const { DATABASE_URL } = loadApiEnv();
  const pool = createPool(DATABASE_URL);
  const db = createDatabase(pool);

  let tenantA: string;
  let tenantB: string;
  let profileOfA: string;
  let profileOfB: string;

  beforeAll(async () => {
    tenantA = await createTenant(db, 'isolamento-a');
    tenantB = await createTenant(db, 'isolamento-b');
    profileOfA = await createAccessProfile(db, tenantA, 'Perfil da A');
    profileOfB = await createAccessProfile(db, tenantB, 'Perfil da B');
  });

  afterAll(() => pool.end());

  it('roda como crm_app — como dono, passaria sem o RLS fazer nada', async () => {
    const { rows } = await pool.query<{ role: string }>('select current_user as role');

    expect(rows[0]?.role).toBe('crm_app');
  });

  it('a empresa A não enxerga nada da B num SELECT sem filtro', async () => {
    const rows = await db.withTenant(tenantA, (tx) => tx.select().from(accessProfiles));

    expect(rows.map((row) => row.id)).toEqual([profileOfA]);
    expect(rows.every((row) => row.tenantId === tenantA)).toBe(true);
  });

  it('a empresa A não enxerga nada da B em SQL cru sem filtro', async () => {
    const { rows } = await db.withTenant(tenantA, (tx) =>
      tx.execute<{ id: string }>(sql`select id from access_profiles`),
    );

    expect(rows).toEqual([{ id: profileOfA }]);
  });

  it('a empresa A não encontra o registro da B nem pelo id direto', async () => {
    const rows = await db.withTenant(tenantA, (tx) =>
      tx.select().from(accessProfiles).where(eq(accessProfiles.id, profileOfB)),
    );

    expect(rows).toEqual([]);
  });

  it('UPDATE e DELETE sem filtro da empresa A não alcançam a B', async () => {
    const tenantC = await createTenant(db, 'isolamento-c');
    await createAccessProfile(db, tenantC, 'Perfil da C');

    await db.withTenant(tenantC, async (tx) => {
      await tx.update(accessProfiles).set({ description: 'alterado pela C' });
      await tx.delete(accessProfiles);
    });

    const rowsOfB = await db.withTenant(tenantB, (tx) => tx.select().from(accessProfiles));
    expect(rowsOfB).toHaveLength(1);
    expect(rowsOfB[0]).toMatchObject({ id: profileOfB, name: 'Perfil da B', description: null });
  });

  it('recusa INSERT com o tenant_id de outra empresa (WITH CHECK)', async () => {
    const insertIntoB = db.withTenant(tenantA, (tx) =>
      tx.insert(accessProfiles).values({ tenantId: tenantB, name: 'Intruso' }),
    );

    await expect(insertIntoB).rejects.toMatchObject({ cause: { code: RLS_VIOLATION } });

    const rowsOfB = await db.withTenant(tenantB, (tx) => tx.select().from(accessProfiles));
    expect(rowsOfB.map((row) => row.name)).not.toContain('Intruso');
  });

  it('recusa UPDATE que move o registro para outra empresa (WITH CHECK)', async () => {
    const moveToB = db.withTenant(tenantA, (tx) =>
      tx.update(accessProfiles).set({ tenantId: tenantB }).where(eq(accessProfiles.id, profileOfA)),
    );

    await expect(moveToB).rejects.toMatchObject({ cause: { code: RLS_VIOLATION } });
  });

  describe('sem a variável de sessão definida', () => {
    it('devolve zero linhas, não exceção, numa conexão nova (missing_ok)', async () => {
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      try {
        const { rows } = await client.query('select * from access_profiles');

        expect(rows).toEqual([]);
      } finally {
        await client.end();
      }
    });

    it('devolve zero linhas, não exceção, numa conexão que já teve empresa', async () => {
      // Depois de um SET LOCAL confirmado, o Postgres deixa a variável como
      // string vazia na conexão, e não como NULL: sem tratar, o cast para uuid
      // estoura exceção em vez de devolver zero linhas.
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('app.tenant_id', $1, true)`, [tenantA]);
        await client.query('commit');

        const { rows } = await client.query('select * from access_profiles');

        expect(rows).toEqual([]);
      } finally {
        await client.end();
      }
    });

    it('recusa INSERT, porque nenhuma linha passa no WITH CHECK', async () => {
      const insert = pool.query('insert into access_profiles (id, tenant_id, name) values ($1, $2, $3)', [
        profileOfA.replace(/.$/, '0'),
        tenantA,
        'Sem empresa',
      ]);

      await expect(insert).rejects.toMatchObject({ code: RLS_VIOLATION });
    });
  });

  it('filtra inclusive o dono da tabela (FORCE ROW LEVEL SECURITY)', async () => {
    const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
    const owner = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });
    await owner.connect();
    try {
      const { rows: role } = await owner.query<{ role: string }>('select current_user as role');
      const { rows } = await owner.query('select * from access_profiles');

      expect(role[0]?.role).toBe('crm_owner');
      expect(rows).toEqual([]);
    } finally {
      await owner.end();
    }
  });
});
