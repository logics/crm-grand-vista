// Guarda do schema. Existe para falhar daqui a seis meses, quando houver mais
// vinte tabelas e ninguém lembrar da regra: toda tabela é de negócio — e leva
// `tenant_id`, policy de isolamento e FORCE ROW LEVEL SECURITY — até que alguém
// a escreva na lista nominal de `test/support/schema-sweep.ts`.
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findIsolationViolations, listBusinessTables, TABLES_OUTSIDE_RLS } from './support/schema-sweep.js';

const ISOLATION_POLICY = `
  create policy tenant_isolation on probe for all
    using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)`;

const PROTECTED_TABLE = `
  create table probe (id uuid primary key, tenant_id uuid not null references tenants);
  alter table probe enable row level security;
  alter table probe force row level security;
  ${ISOLATION_POLICY};
`;

describe('varredura de schema', () => {
  const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
  const owner = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });

  beforeAll(() => owner.connect());
  afterAll(() => owner.end());

  /** Roda a varredura com o DDL aplicado numa transação que é sempre desfeita. */
  const sweepWith = async (ddl: string): Promise<string[]> => {
    await owner.query('begin');
    try {
      await owner.query(ddl);
      return await findIsolationViolations(owner);
    } finally {
      await owner.query('rollback');
    }
  };

  it('toda tabela de negócio tem tenant_id, policy de isolamento e FORCE ROW LEVEL SECURITY', async () => {
    expect(await findIsolationViolations(owner)).toEqual([]);
  });

  it('as tabelas de negócio da Fase 0 estão sob a varredura', async () => {
    expect(await listBusinessTables(owner)).toEqual([
      'access_profiles',
      'audit_log',
      'profile_data_scopes',
      'profile_permissions',
      'user_profiles',
    ]);
  });

  it('as tabelas da lista nominal de fato não têm RLS — a exceção não esconde policy esquecida', async () => {
    const { rows } = await owner.query<{ name: string }>(
      `select c.relname as name
         from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and c.relname = any($1)
          and (c.relrowsecurity or exists (select 1 from pg_policy p where p.polrelid = c.oid))`,
      [TABLES_OUTSIDE_RLS],
    );

    expect(rows).toEqual([]);
  });

  // A varredura só vale se falhar. Cada caso cria, numa transação desfeita, a
  // tabela que alguém criaria por descuido, e exige que a varredura a acuse.
  describe('acusa a tabela nova que quebra a regra', () => {
    it('não acusa a tabela que segue o padrão', async () => {
      expect(await sweepWith(PROTECTED_TABLE)).toEqual([]);
    });

    it.each([
      {
        scenario: 'sem tenant_id',
        ddl: 'create table probe (id uuid primary key)',
        expected: 'public.probe: sem tenant_id',
      },
      {
        scenario: 'com tenant_id mas sem RLS',
        ddl: 'create table probe (id uuid primary key, tenant_id uuid not null references tenants)',
        expected: 'public.probe: sem ROW LEVEL SECURITY habilitado',
      },
      {
        scenario: 'com RLS habilitado mas sem policy',
        ddl: `create table probe (id uuid primary key, tenant_id uuid not null references tenants);
              alter table probe enable row level security;
              alter table probe force row level security;`,
        expected: 'public.probe: sem policy',
      },
      {
        scenario: 'com policy mas sem FORCE ROW LEVEL SECURITY',
        ddl: `${PROTECTED_TABLE} alter table probe no force row level security;`,
        expected: 'public.probe: sem FORCE ROW LEVEL SECURITY',
      },
      {
        scenario: 'com policy desabilitada',
        ddl: `${PROTECTED_TABLE} alter table probe disable row level security;`,
        expected: 'public.probe: sem ROW LEVEL SECURITY habilitado',
      },
      {
        scenario: 'com policy que não filtra por empresa',
        ddl: `create table probe (id uuid primary key, tenant_id uuid not null references tenants);
              alter table probe enable row level security;
              alter table probe force row level security;
              create policy tenant_isolation on probe for all using (true) with check (true);`,
        expected: 'public.probe: USING não é o predicado de isolamento',
      },
      {
        scenario: 'com policy sem WITH CHECK',
        ddl: `create table probe (id uuid primary key, tenant_id uuid not null references tenants);
              alter table probe enable row level security;
              alter table probe force row level security;
              create policy tenant_isolation on probe for all
                using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);`,
        expected: 'public.probe: WITH CHECK não é o predicado de isolamento',
      },
      {
        scenario: 'com policy só de leitura',
        ddl: `create table probe (id uuid primary key, tenant_id uuid not null references tenants);
              alter table probe enable row level security;
              alter table probe force row level security;
              create policy tenant_isolation on probe for select
                using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);`,
        expected: 'public.probe: a policy não é PERMISSIVE FOR ALL',
      },
      {
        scenario: 'com uma segunda policy, que reabre o que a de isolamento fecha',
        ddl: `${PROTECTED_TABLE} create policy leitura_livre on probe for select using (true);`,
        expected: 'public.probe: 2 policies (leitura_livre, tenant_isolation); só a de isolamento é aceita',
      },
      {
        scenario: 'sem a exceção por estourar na variável ausente (sem missing_ok)',
        ddl: `create table probe (id uuid primary key, tenant_id uuid not null references tenants);
              alter table probe enable row level security;
              alter table probe force row level security;
              create policy tenant_isolation on probe for all
                using (tenant_id = current_setting('app.tenant_id')::uuid)
                with check (tenant_id = current_setting('app.tenant_id')::uuid);`,
        expected: 'public.probe: USING não é o predicado de isolamento',
      },
      {
        scenario: 'com tenant_id que aceita nulo',
        ddl: PROTECTED_TABLE.replace('uuid not null references', 'uuid references'),
        expected: 'public.probe: tenant_id aceita nulo',
      },
      {
        scenario: 'com tenant_id sem chave estrangeira para tenants',
        ddl: PROTECTED_TABLE.replace('uuid not null references tenants', 'uuid not null'),
        expected: 'public.probe: tenant_id sem chave estrangeira para tenants',
      },
      {
        scenario: 'criada em outro schema',
        ddl: 'create schema outro; create table outro.probe (id uuid primary key)',
        expected: 'outro.probe: sem tenant_id',
      },
      {
        scenario: 'em outro schema com o nome de uma tabela da lista nominal',
        ddl: 'create schema outro; create table outro.users (id uuid primary key)',
        expected: 'outro.users: sem tenant_id',
      },
      {
        scenario: 'particionada',
        ddl: 'create table probe (id uuid, created_at timestamptz) partition by range (created_at)',
        expected: 'public.probe: sem tenant_id',
      },
    ])('$scenario', async ({ ddl, expected }) => {
      expect(await sweepWith(ddl)).toContain(expected);
    });
  });
});

describe('privilégios de crm_app nas tabelas', () => {
  const { DATABASE_URL } = loadApiEnv();
  const app = new pg.Client({ connectionString: DATABASE_URL });

  beforeAll(() => app.connect());
  afterAll(() => app.end());

  const privilegesOn = async (table: string): Promise<string[]> => {
    const { rows } = await app.query<{ privilege: string }>(
      `select privilege
         from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) as privilege
        where has_table_privilege(current_user, $1, privilege)`,
      [`public.${table}`],
    );
    return rows.map((row) => row.privilege);
  };

  it('audit_log é append-only: sem UPDATE nem DELETE', async () => {
    expect(await privilegesOn('audit_log')).toEqual(['SELECT', 'INSERT']);
  });

  it('o catálogo de permissões é só leitura: quem o altera é a migration', async () => {
    expect(await privilegesOn('permissions')).toEqual(['SELECT']);
  });

  it('nenhuma tabela de negócio fica sem acesso nem com TRUNCATE, que ignora o RLS', async () => {
    for (const table of await listBusinessTables(app)) {
      const privileges = await privilegesOn(table);

      expect(privileges, table).toContain('SELECT');
      expect(privileges, table).toContain('INSERT');
      expect(privileges, table).not.toContain('TRUNCATE');
    }
  });
});
