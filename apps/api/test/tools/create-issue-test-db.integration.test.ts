// O script de verdade contra o Postgres do container, com um banco descartável
// (`crm_scriptdb_test`) apagado no fim. Conexão de superusuário vem do `.env.test`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SUPERUSER_DATABASE_URL } from '../support/superuser.js';

const script = fileURLToPath(new URL('../../../../tools/db/create-issue-test-db.sh', import.meta.url));
// Issue fictícia: o script só aceita número, então o banco descartável é
// `crm_987654_test` (termina em `_test`, como a trava da suíte exige).
const ISSUE = '987654';
const DATABASE = `crm_${ISSUE}_test`;

const admin = new pg.Client({ connectionString: SUPERUSER_DATABASE_URL });
const runScript = (arg: string) =>
  // O ambiente do worker já traz SUPERUSER_DATABASE_URL (`.env.test`); o filho o herda.
  spawnSync('bash', [script, arg], { encoding: 'utf8' });

async function connectors(): Promise<string[]> {
  const { rows } = await admin.query<{ grantee: string }>(
    `select coalesce(r.rolname::text, 'PUBLIC') as grantee
       from pg_database d, aclexplode(d.datacl) a
       left join pg_roles r on r.oid = a.grantee
      where d.datname = $1 and a.privilege_type = 'CONNECT'
      order by 1`,
    [DATABASE],
  );
  return rows.map((row) => row.grantee);
}

describe('tools/db/create-issue-test-db.sh', () => {
  beforeAll(async () => {
    await admin.connect();
    await admin.query(`drop database if exists "${DATABASE}"`);
  });
  afterAll(async () => {
    await admin.query(`drop database if exists "${DATABASE}"`);
    await admin.end();
  });

  it('rejeita argumento que não é número', () => {
    const result = runScript('abc');
    expect(result.status).toBe(2);
  });

  it('cria o banco com dono crm_owner, sem CONNECT para PUBLIC, e roda duas vezes sem falhar', async () => {
    const first = runScript(ISSUE);
    expect(first.status, first.stderr).toBe(0);
    const second = runScript(ISSUE);
    expect(second.status, second.stderr).toBe(0);

    expect(await connectors()).toEqual(['crm_app', 'crm_owner']);
    const { rows } = await admin.query<{ owner: string }>(
      'select pg_get_userbyid(datdba) as owner from pg_database where datname = $1',
      [DATABASE],
    );
    expect(rows[0]?.owner).toBe('crm_owner');
  });

  it('aplica o schema public no banco novo', async () => {
    const url = new URL(SUPERUSER_DATABASE_URL);
    url.pathname = `/${DATABASE}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    try {
      const { rows } = await client.query<{ owner: string }>(
        `select pg_get_userbyid(nspowner) as owner from pg_namespace where nspname = 'public'`,
      );
      expect(rows[0]?.owner).toBe('crm_owner');
    } finally {
      await client.end();
    }
  });

  it('segunda execução reforça o ACL sem apagar dados', async () => {
    const url = new URL(SUPERUSER_DATABASE_URL);
    url.pathname = `/${DATABASE}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    try {
      await client.query('create table marker (id int)');
      await client.query('insert into marker values (1)');
      await admin.query(`grant connect on database "${DATABASE}" to public`);
      expect(await connectors()).toContain('PUBLIC');

      const result = runScript(ISSUE);
      expect(result.status, result.stderr).toBe(0);

      expect(await connectors()).toEqual(['crm_app', 'crm_owner']);
      const { rows } = await client.query('select id from marker');
      expect(rows).toEqual([{ id: 1 }]);
    } finally {
      await client.end();
    }
  });

  it('não imprime a senha', () => {
    const result = runScript(ISSUE);
    const password = new URL(SUPERUSER_DATABASE_URL).password;
    expect(password).not.toBe('');
    expect(result.stdout + result.stderr).not.toContain(password);
  });
});
