// Guarda do role da aplicação. O Postgres não aplica RLS ao dono da tabela
// nem a superusuário: se `crm_app` for qualquer um dos dois, toda a suíte de
// isolamento passa sem o RLS fazer nada.
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('papéis do database', () => {
  const { DATABASE_URL } = loadApiEnv();
  const app = new pg.Client({ connectionString: DATABASE_URL });

  beforeAll(() => app.connect());
  afterAll(() => app.end());

  it('roda Postgres 18', async () => {
    const { rows } = await app.query<{ server_version: string }>('show server_version');

    expect(rows[0]?.server_version).toMatch(/^18\./);
  });

  it('conecta a aplicação como crm_app', async () => {
    const { rows } = await app.query<{ role: string }>('select current_user as role');

    expect(rows[0]?.role).toBe('crm_app');
  });

  it('crm_app não é superusuário nem tem BYPASSRLS', async () => {
    const { rows } = await app.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      'select rolsuper, rolbypassrls from pg_roles where rolname = current_user',
    );

    expect(rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
  });

  it('crm_app não herda superusuário nem BYPASSRLS de outro role', async () => {
    const { rows } = await app.query<{ rolname: string }>(`
      select r.rolname
        from pg_roles r
       where pg_has_role(current_user, r.oid, 'member')
         and r.rolname <> current_user
         and (r.rolsuper or r.rolbypassrls)
    `);

    expect(rows).toEqual([]);
  });

  it('crm_app não é dono de nenhuma relação', async () => {
    const { rows } = await app.query<{ relation: string }>(`
      select c.oid::regclass::text as relation
        from pg_class c
       where pg_has_role(current_user, c.relowner, 'member')
    `);

    expect(rows).toEqual([]);
  });

  it('crm_app não é dono de nenhum schema', async () => {
    const { rows } = await app.query<{ nspname: string }>(`
      select nspname from pg_namespace where pg_has_role(current_user, nspowner, 'member')
    `);

    expect(rows).toEqual([]);
  });
});

describe('CONNECT nos bancos do CRM', () => {
  // A instância de produção é compartilhada com outros projetos: o Postgres
  // concede CONNECT a PUBLIC por padrão, e o role de outra aplicação
  // conseguiria conectar e enumerar o schema.
  const { MIGRATION_DATABASE_URL } = loadMigrationEnv();
  const owner = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });

  beforeAll(() => owner.connect());
  afterAll(() => owner.end());

  it('revoga CONNECT de PUBLIC e concede só a crm_owner e crm_app', async () => {
    // ACL nula é o padrão do Postgres, que concede CONNECT a PUBLIC; no
    // aclexplode, PUBLIC aparece como grantee 0.
    const { rows } = await owner.query<{ database: string; is_current: boolean; default_acl: boolean; can_connect: string[] }>(`
      select d.datname as database,
             d.datname = current_database() as is_current,
             d.datacl is null as default_acl,
             coalesce(array(
               select coalesce(r.rolname::text, 'PUBLIC')
                 from aclexplode(d.datacl) a
                 left join pg_roles r on r.oid = a.grantee
                where a.privilege_type = 'CONNECT'
                order by 1
             ), '{}') as can_connect
        from pg_database d
       where d.datdba = (select oid from pg_roles where rolname = 'crm_owner')
       order by d.datname
    `);

    expect(rows.some((b) => b.is_current), 'o database de teste pertence a crm_owner').toBe(true);
    for (const { database, default_acl, can_connect } of rows) {
      expect(default_acl, `${database} está com a ACL padrão`).toBe(false);
      expect(can_connect, database).toEqual(['crm_app', 'crm_owner']);
    }
  });
});
