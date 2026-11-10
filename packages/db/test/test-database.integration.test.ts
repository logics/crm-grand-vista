// Criação/reforço e limpeza do banco de teste, contra o Postgres do container,
// com bancos descartáveis `crm_setup_<runid>_<caso>_test` apagados no fim.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationEnvSchema, parseEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetTestDatabase } from './support/reset-database.js';
import { cleanupMergedTestDatabases, ensureTestDatabase, localGit } from './support/test-database.js';
import { withDatabase } from './support/test-database-name.js';

const url = migrationEnvSchema.shape.MIGRATION_DATABASE_URL;
const { MIGRATION_DATABASE_URL: MIGRATION_URL, SUPERUSER_DATABASE_URL: SUPERUSER_URL } = parseEnv(
  migrationEnvSchema.extend({ SUPERUSER_DATABASE_URL: url }),
);
const runId = randomBytes(4).toString('hex');
const db = (suffix: string) => `crm_setup_${runId}_${suffix}`;
const pattern = `crm\\_setup\\_${runId}\\_%\\_test`;
const secrets = [SUPERUSER_URL, MIGRATION_URL].map((u) => decodeURIComponent(new URL(u).password)).filter(Boolean);

const logs: string[] = [];
const log = (message: string) => logs.push(message);

let admin: pg.Client;
const created: string[] = [];

async function inDatabase<T>(name: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: withDatabase(SUPERUSER_URL, name) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const comment = async (name: string) =>
  (await admin.query(`select shobj_description(oid, 'pg_database') as c from pg_database where datname = $1`, [name]))
    .rows[0]?.c as string | null | undefined;
const exists = async (name: string) =>
  ((await admin.query('select 1 from pg_database where datname = $1', [name])).rowCount ?? 0) > 0;

async function connectors(name: string): Promise<string[]> {
  const { rows } = await admin.query<{ grantee: string }>(
    `select coalesce(r.rolname::text, 'PUBLIC') as grantee
       from pg_database d, aclexplode(d.datacl) a
       left join pg_roles r on r.oid = a.grantee
      where d.datname = $1 and a.privilege_type = 'CONNECT'
      order by 1`,
    [name],
  );
  return rows.map((row) => row.grantee);
}

async function ensure(name: string, branch: string | null) {
  created.push(name);
  await ensureTestDatabase({ superuserUrl: SUPERUSER_URL, name, branch, log });
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: withDatabase(SUPERUSER_URL, 'postgres') });
  await admin.connect();
});

afterAll(async () => {
  const { rows } = await admin.query<{ datname: string }>('select datname from pg_database where datname like $1', [
    `crm\\_setup\\_${runId}\\_%`,
  ]);
  for (const { datname } of rows) await admin.query(`drop database if exists "${datname}" with (force)`);
  await admin.end();
});

describe('ensureTestDatabase', () => {
  it('cria o banco com dono, ACL, schema public e comentário', async () => {
    const name = db('create_test');
    await ensure(name, 'feat/1-a');

    const owner = await admin.query('select pg_get_userbyid(datdba) as o from pg_database where datname = $1', [name]);
    expect(owner.rows[0]?.o).toBe('crm_owner');
    expect(await connectors(name)).toEqual(['crm_app', 'crm_owner']);
    expect(await comment(name)).toBe('feat/1-a');
    const schema = await inDatabase(name, (c) => c.query(`select 1 from pg_namespace where nspname = 'public'`));
    expect(schema.rowCount).toBe(1);
  });

  it('é idempotente: preserva dados e atualiza o comentário', async () => {
    const name = db('idem_test');
    await ensure(name, 'feat/1-a');
    await inDatabase(name, async (c) => {
      await c.query('create table marcador (id int)');
      await c.query('insert into marcador values (1)');
    });
    await ensure(name, 'feat/2-b');
    const rows = await inDatabase(name, (c) => c.query('select id from marcador'));
    expect(rows.rows).toEqual([{ id: 1 }]);
    expect(await comment(name)).toBe('feat/2-b');
  });

  it('repara ACL estragada sem perder dados', async () => {
    const name = db('acl_test');
    await ensure(name, 'feat/3-c');
    await inDatabase(name, async (c) => {
      await c.query('create table marcador (id int)');
      await c.query('insert into marcador values (7)');
    });
    await admin.query(`grant connect on database "${name}" to public`);
    expect(await connectors(name)).toContain('PUBLIC');
    await ensure(name, 'feat/3-c');
    expect(await connectors(name)).toEqual(['crm_app', 'crm_owner']);
    const rows = await inDatabase(name, (c) => c.query('select id from marcador'));
    expect(rows.rows).toEqual([{ id: 7 }]);
  });

  it('rejeita nome sem sufixo _test', async () => {
    await expect(
      ensureTestDatabase({ superuserUrl: SUPERUSER_URL, name: 'crm_setup_x', branch: null, log }),
    ).rejects.toThrow(/inválido/);
  });
});

describe('cleanupMergedTestDatabases', () => {
  const repo = mkdtempSync(join(tmpdir(), 'crm-cleanup-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it('derruba só o que o git local prova mergeado', async () => {
    git('init', '-q', '-b', 'main');
    git('commit', '-q', '--allow-empty', '-m', 'base');
    git('checkout', '-q', '-b', 'feat/merged');
    git('commit', '-q', '--allow-empty', '-m', 'a');
    git('checkout', '-q', 'main');
    git('merge', '-q', '--no-ff', 'feat/merged', '-m', 'Merge pull request #2 from o/feat/merged');
    git('checkout', '-q', '-b', 'feat/gone');
    git('commit', '-q', '--allow-empty', '-m', 'b');
    git('checkout', '-q', 'main');
    git('merge', '-q', '--no-ff', 'feat/gone', '-m', 'Merge pull request #1 from o/feat/gone');
    git('branch', '-q', '-D', 'feat/gone');
    git('checkout', '-q', '-b', 'feat/unmerged');
    git('commit', '-q', '--allow-empty', '-m', 'c');
    git('checkout', '-q', 'main');
    git('branch', 'feat/fresh');

    const cases: Record<string, string | null> = {
      merged_test: 'feat/merged',
      gone_test: 'feat/gone',
      current_test: 'feat/merged',
      unmerged_test: 'feat/unmerged',
      fresh_test: 'feat/fresh',
      nocomment_test: null,
      unknown_test: 'feat/never-seen',
    };
    for (const [suffix, branch] of Object.entries(cases)) await ensure(db(suffix), branch);

    logs.length = 0;
    await cleanupMergedTestDatabases({ superuserUrl: SUPERUSER_URL, current: db('current_test'), git: localGit(repo), log, pattern });

    expect(await exists(db('merged_test'))).toBe(false);
    expect(await exists(db('gone_test'))).toBe(false);
    for (const kept of ['current_test', 'unmerged_test', 'fresh_test', 'nocomment_test', 'unknown_test']) {
      expect(await exists(db(kept)), kept).toBe(true);
    }
  });

  it('mantém o banco mergeado com conexão aberta, sem lançar', async () => {
    const name = db('busy_test');
    await ensure(name, 'feat/merged');
    const holder = new pg.Client({ connectionString: withDatabase(SUPERUSER_URL, name) });
    await holder.connect();
    try {
      logs.length = 0;
      await cleanupMergedTestDatabases({ superuserUrl: SUPERUSER_URL, current: db('current_test'), git: localGit(repo), log, pattern });
      expect(await exists(name)).toBe(true);
      expect(logs.some((line) => line.includes('mantido') && line.includes(name))).toBe(true);
    } finally {
      await holder.end();
    }
    // O Postgres espera até 5 s por sessões abertas antes de recusar o DROP.
  }, 30_000);
});

describe('trava do reset', () => {
  it('recusa zerar banco sem sufixo _test e preserva os dados', async () => {
    const name = db('guard');
    created.push(name);
    await admin.query(`create database "${name}"`);
    await admin.query(`grant connect on database "${name}" to crm_owner`);
    await inDatabase(name, async (c) => {
      await c.query('create table marcador (id int)');
      await c.query('grant usage on schema public to crm_owner');
    });

    await expect(resetTestDatabase(withDatabase(MIGRATION_URL, name))).rejects.toThrow(/só zera bancos \*_test/);
    const rows = await inDatabase(name, (c) => c.query(`select to_regclass('public.marcador') as t`));
    expect(rows.rows[0]?.t).toBe('marcador');
  });
});

describe('segredos', () => {
  it('nenhum log ou erro contém senha', async () => {
    const errors: string[] = [];
    await ensureTestDatabase({ superuserUrl: SUPERUSER_URL, name: 'invalido', branch: null, log }).catch((e: Error) =>
      errors.push(e.message),
    );
    await resetTestDatabase(withDatabase(MIGRATION_URL, db('guard'))).catch((e: Error) => errors.push(e.message));
    for (const text of [...logs, ...errors]) for (const secret of secrets) expect(text).not.toContain(secret);
  });
});
